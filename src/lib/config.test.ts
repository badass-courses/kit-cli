import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getEffectiveBroadcastDefaults,
  mergeBroadcastDefaults,
  resolveBroadcastDefaults,
} from "./config";
import type { BroadcastDefaults } from "./types";

let tempPaths: string[] = [];

afterEach(async () => {
  delete process.env.KIT_HOME_CONFIG_PATH;
  delete process.env.KIT_ACCOUNT_ID;

  await Promise.all(
    tempPaths.map(async (path) => {
      await rm(path, { recursive: true, force: true });
    })
  );
  tempPaths = [];
});

const writeKitHomeConfig = async (contents: object) => {
  const directory = await mkdtemp(join(tmpdir(), "kit-cli-test-"));
  const path = join(directory, "config.json");
  tempPaths.push(directory);
  await writeFile(path, JSON.stringify(contents, null, 2));
  process.env.KIT_HOME_CONFIG_PATH = path;
  return path;
};

describe("resolveBroadcastDefaults", () => {
  test("uses the default account from ~/.kit/config.json", async () => {
    const expected: BroadcastDefaults = {
      templateId: 4_389_070,
      templateName: "Example Site",
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
    };

    const configPath = await writeKitHomeConfig({
      defaultAccount: "totaltypescript-example-site",
      accounts: {
        "totaltypescript-example-site": {
          broadcastDefaults: expected,
        },
      },
    });

    expect(await resolveBroadcastDefaults()).toEqual(expected);
    expect(await getEffectiveBroadcastDefaults()).toEqual({
      config_path: configPath,
      selected_account_id: "totaltypescript-example-site",
      broadcast_defaults: expected,
    });
  });

  test("uses an explicit account override", async () => {
    const expected: BroadcastDefaults = {
      templateId: 99,
      fromAddress: "override@example.com",
    };

    await writeKitHomeConfig({
      defaultAccount: "default-account",
      accounts: {
        "default-account": {
          broadcastDefaults: {
            templateId: 1,
          },
        },
        override: {
          broadcastDefaults: expected,
        },
      },
    });

    expect(await resolveBroadcastDefaults("override")).toEqual(expected);
  });
});

describe("mergeBroadcastDefaults", () => {
  test("fills missing template, from address, and subscriber filter", () => {
    const merged = mergeBroadcastDefaults(
      {
        subject: "Hello!",
        public: false,
      },
      {
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
      }
    );

    expect(merged).toEqual({
      subject: "Hello!",
      public: false,
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

  test("preserves explicit values already present in the body", () => {
    const merged = mergeBroadcastDefaults(
      {
        email_template_id: 123,
        email_address: "custom@example.com",
        subscriber_filter: [{ all: [{ type: "segment", ids: [18] }] }],
      },
      {
        templateId: 4_389_070,
        fromAddress: "newsletter@example.com",
        subscriberFilter: [{ none: [{ type: "tag", ids: [8_244_351] }] }],
      }
    );

    expect(merged).toEqual({
      email_template_id: 123,
      email_address: "custom@example.com",
      subscriber_filter: [{ all: [{ type: "segment", ids: [18] }] }],
    });
  });

  test("treats an empty subscriber_filter array as missing and applies defaults", () => {
    const merged = mergeBroadcastDefaults(
      {
        subscriber_filter: [],
      },
      {
        subscriberFilter: [{ none: [{ type: "tag", ids: [8_244_351] }] }],
      }
    );

    expect(merged).toEqual({
      subscriber_filter: [{ none: [{ type: "tag", ids: [8_244_351] }] }],
    });
  });
});
