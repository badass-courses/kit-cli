import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { operations } from "../generated/operations";
import { executeOperation } from "./execute";

const originalFetch = globalThis.fetch;
let tempPaths: string[] = [];

afterEach(async () => {
  globalThis.fetch = originalFetch;
  delete process.env.KIT_API_KEY;
  delete process.env.KIT_HOME_CONFIG_PATH;
  delete process.env.KIT_ACCOUNT_ID;

  await Promise.all(
    tempPaths.map(async (path) => {
      await rm(path, { recursive: true, force: true });
    }),
  );
  tempPaths = [];
});

const writeTempFile = async (name: string, contents: string) => {
  const directory = await mkdtemp(join(tmpdir(), "kit-cli-execute-test-"));
  const path = join(directory, name);
  tempPaths.push(directory);
  await writeFile(path, contents);
  return path;
};

const createFetchCapture = () => {
  const capture: { url?: string; init?: RequestInit } = {};
  globalThis.fetch = mock(async (input: unknown, init?: RequestInit) => {
    capture.url = String(input);
    capture.init = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }) as unknown as typeof fetch;
  return capture;
};

const writeKitHomeConfig = async () => {
  const path = await writeTempFile(
    "kit-home-config.json",
    JSON.stringify(
      {
        defaultAccount: "totaltypescript-example-site",
        accounts: {
          "totaltypescript-example-site": {
            broadcastDefaults: {
              templateId: 4_389_070,
              fromAddress: "newsletter@example.com",
              subscriberFilter: [
                {
                  none: [
                    {
                      type: "tag",
                      ids: [8_244_351],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      null,
      2,
    ),
  );
  process.env.KIT_HOME_CONFIG_PATH = path;
};

describe("executeOperation broadcast defaults", () => {
  test("applies configured defaults to broadcast mutations end-to-end", async () => {
    await writeKitHomeConfig();
    process.env.KIT_API_KEY = "test-api-key";

    const bodyFile = await writeTempFile(
      "broadcast.json",
      JSON.stringify({
        subject: "Hello",
        public: false,
        published_at: "2026-03-12T00:00:00Z",
        send_at: null,
        content: "<p>Hello</p>",
        preview_text: "Preview",
        description: "Desc",
      }),
    );

    const operation = operations.find((entry) => entry.id === "post__v4_broadcasts");
    if (!operation) {
      throw new Error("Broadcast create operation not found");
    }

    const capture = createFetchCapture();
    const envelope = await executeOperation(operation, {}, { bodyFile });

    expect(envelope.ok).toBe(true);
    expect(capture.url).toBe("https://api.kit.com/v4/broadcasts");
    expect(capture.init?.method).toBe("POST");
    expect(capture.init?.headers).toMatchObject({
      accept: "application/json",
      "content-type": "application/json",
      "X-Kit-Api-Key": "test-api-key",
    });

    expect(JSON.parse(String(capture.init?.body))).toEqual({
      subject: "Hello",
      public: false,
      published_at: "2026-03-12T00:00:00Z",
      send_at: null,
      content: "<p>Hello</p>",
      preview_text: "Preview",
      description: "Desc",
      email_template_id: 4_389_070,
      email_address: "newsletter@example.com",
      subscriber_filter: [
        {
          none: [
            {
              type: "tag",
              ids: [8_244_351],
            },
          ],
        },
      ],
    });
  });

  test("preserves explicit broadcast body values over configured defaults", async () => {
    await writeKitHomeConfig();
    process.env.KIT_API_KEY = "test-api-key";

    const operation = operations.find((entry) => entry.id === "put__v4_broadcasts_id_");
    if (!operation) {
      throw new Error("Broadcast update operation not found");
    }

    const capture = createFetchCapture();
    const envelope = await executeOperation(
      operation,
      { id: "23257237" },
      {
        body: JSON.stringify({
          subject: "Hello",
          public: false,
          published_at: "2026-03-12T00:00:00Z",
          send_at: null,
          content: "<p>Hello</p>",
          preview_text: "Preview",
          description: "Desc",
          email_template_id: 999,
          email_address: "override@example.com",
          subscriber_filter: [{ all: [{ type: "segment", ids: [18] }] }],
        }),
      },
    );

    expect(envelope.ok).toBe(true);
    expect(capture.url).toBe("https://api.kit.com/v4/broadcasts/23257237");
    expect(capture.init?.method).toBe("PUT");
    expect(JSON.parse(String(capture.init?.body))).toEqual({
      subject: "Hello",
      public: false,
      published_at: "2026-03-12T00:00:00Z",
      send_at: null,
      content: "<p>Hello</p>",
      preview_text: "Preview",
      description: "Desc",
      email_template_id: 999,
      email_address: "override@example.com",
      subscriber_filter: [{ all: [{ type: "segment", ids: [18] }] }],
    });
  });

  test("preserves existing subscriber_filter on partial broadcast updates", async () => {
    process.env.KIT_API_KEY = "test-api-key";

    const operation = operations.find((entry) => entry.id === "put__v4_broadcasts_id_");
    if (!operation) {
      throw new Error("Broadcast update operation not found");
    }

    let putBody: unknown;
    globalThis.fetch = mock(async (input: unknown, init?: RequestInit) => {
      if (init?.method === "GET") {
        return new Response(
          JSON.stringify({
            broadcast: {
              id: 23257237,
              subject: "Old subject",
              content: "<p>Old</p>",
              public: false,
              send_at: null,
              subscriber_filter: [{ none: [{ type: "tag", ids: [19562218, 8244351] }] }],
              email_template: { id: 5208601, name: "AI Hero - Cohort-004" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      putBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const envelope = await executeOperation(
      operation,
      { id: "23257237" },
      { body: JSON.stringify({ subject: "New subject" }) },
    );

    expect(envelope.ok).toBe(true);
    expect(putBody).toMatchObject({
      subject: "New subject",
      content: "<p>Old</p>",
      email_template_id: 5208601,
      subscriber_filter: [{ none: [{ type: "tag", ids: [19562218, 8244351] }] }],
    });
  });

  test("does not apply broadcast defaults to non-broadcast requests", async () => {
    await writeKitHomeConfig();
    process.env.KIT_API_KEY = "test-api-key";

    const operation = operations.find((entry) => entry.id === "post__v4_subscribers");
    if (!operation) {
      throw new Error("Subscriber create operation not found");
    }

    const capture = createFetchCapture();
    const envelope = await executeOperation(
      operation,
      {},
      {
        body: JSON.stringify({
          email_address: "person@example.com",
          first_name: "Test",
        }),
      },
    );

    expect(envelope.ok).toBe(true);
    expect(capture.url).toBe("https://api.kit.com/v4/subscribers");
    expect(capture.init?.method).toBe("POST");
    expect(JSON.parse(String(capture.init?.body))).toEqual({
      email_address: "person@example.com",
      first_name: "Test",
    });
  });
});
