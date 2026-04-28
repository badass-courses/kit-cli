/**
 * Site commands: auth, shortlinks, resources.
 *
 * All commands work against any course-builder site via --site flag.
 * Default site is the currentSite from ~/.config/kit-cli/sites.json.
 */

import * as Args from "@effect/cli/Args";
import * as Command from "@effect/cli/Command";
import * as Options from "@effect/cli/Options";
import { Effect, pipe } from "effect";
import { failure, printEnvelope, success, type NextAction } from "./response";
import {
  getSiteAuthStatus,
  KNOWN_SITES,
  loadPreferences,
  resolveSite,
  savePreferences,
  siteApiFetch,
  storeSiteToken,
} from "./sites";

// ---------------------------------------------------------------------------
// Shared options
// ---------------------------------------------------------------------------

const siteOption = Options.text("site").pipe(
  Options.optional,
  Options.withDescription(
    `Site ID (${Object.keys(KNOWN_SITES).join(", ")}). Defaults to current site.`,
  ),
);

const optionValue = <T>(opt: unknown): T | undefined => {
  if (
    typeof opt === "object" &&
    opt !== null &&
    "_tag" in opt &&
    (opt as { _tag: string })._tag === "Some" &&
    "value" in opt
  ) {
    return (opt as { value: T }).value;
  }
  return undefined;
};

const withSiteError = (command: string) =>
  Effect.catchAllCause((cause: unknown) =>
    Effect.sync(() => {
      const raw = String(cause).split("\n")[0] ?? String(cause);
      const message = raw.replace(/^Error:\s*/, "").slice(0, 200);
      printEnvelope(
        failure(command, message, "SITE_ERROR", "Check --site flag and auth status.", [
          { command: "kit site auth status", description: "Check site auth" },
        ]),
      );
    }),
  );

const requireToken = (token: string | undefined, siteId: string): string => {
  if (!token) {
    // This throw is caught by withErrorEnvelope at the Effect boundary
    const err = new Error(
      `Not authenticated to ${siteId}. Run: kit site auth login --site ${siteId}`,
    );
    err.name = "AuthRequiredError";
    throw err;
  }
  return token;
};

// ---------------------------------------------------------------------------
// Auth commands
// ---------------------------------------------------------------------------

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

const siteAuthLoginCommand = Command.make(
  "login",
  { site: siteOption },
  ({ site }) =>
    Effect.gen(function* () {
      const siteId = optionValue<string>(site);
      const { site: siteDef } = yield* Effect.promise(() =>
        resolveSite(siteId),
      );

      // Step 1: Request device code
      const dcUrl = `${siteDef.baseUrl}${siteDef.auth.deviceCodePath}`;
      const dcResp = yield* Effect.promise(() =>
        fetch(dcUrl, { method: "POST", headers: { accept: "application/json" } }),
      );
      const deviceCode = (yield* Effect.promise(() =>
        dcResp.json(),
      )) as DeviceCodeResponse;

      // Open the verification URL
      yield* Effect.promise(() =>
        import("node:child_process").then(({ exec }) =>
          new Promise<void>((resolve) => {
            exec(`open "${deviceCode.verification_uri}"`, () => resolve());
          }),
        ),
      );

      printEnvelope(
        success(`kit site auth login --site ${siteDef.id}`, {
          status: "polling",
          site: siteDef.id,
          display_name: siteDef.displayName,
          user_code: deviceCode.user_code,
          verification_uri: deviceCode.verification_uri,
          message: `Go to ${deviceCode.verification_uri} and enter code: ${deviceCode.user_code}`,
        }, []),
      );

      // Step 2: Poll for token
      const interval = Math.max(1, deviceCode.interval ?? 5);
      const deadline = Date.now() + (deviceCode.expires_in ?? 300) * 1000;

      while (Date.now() < deadline) {
        yield* Effect.promise(
          () => new Promise<void>((r) => setTimeout(r, interval * 1000)),
        );

        const tokenUrl = `${siteDef.baseUrl}${siteDef.auth.tokenPath}`;
        const tokenResp = yield* Effect.promise(() =>
          fetch(tokenUrl, {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              device_code: deviceCode.device_code,
            }),
          }),
        );

        const tokenData = (yield* Effect.promise(() =>
          tokenResp.json(),
        )) as TokenResponse;

        if (tokenResp.ok && tokenData.access_token) {
          yield* Effect.promise(() =>
            storeSiteToken(siteDef.id, tokenData.access_token!),
          );

          printEnvelope(
            success(`kit site auth login --site ${siteDef.id}`, {
              status: "authenticated",
              site: siteDef.id,
              display_name: siteDef.displayName,
            }, [
              { command: "kit site auth status", description: "Verify auth" },
              { command: "kit shortlink list", description: "List shortlinks" },
            ]),
          );
          return;
        }

        // authorization_pending is expected during polling, keep going
        if (tokenData.error === "authorization_pending") {
          continue;
        }

        // expired_token means the device code timed out server-side
        if (tokenData.error === "expired_token") {
          printEnvelope(
            failure(
              `kit site auth login --site ${siteDef.id}`,
              "Device code expired before verification completed",
              "DEVICE_CODE_EXPIRED",
              "Try again with: kit site auth login",
              [],
            ),
          );
          return;
        }

        // Any other error is fatal
        if (tokenData.error) {
          printEnvelope(
            failure(
              `kit site auth login --site ${siteDef.id}`,
              `Auth failed: ${tokenData.error}`,
              "AUTH_FAILED",
              "Try again with: kit site auth login",
              [],
            ),
          );
          return;
        }
      }

      printEnvelope(
        failure(
          `kit site auth login --site ${siteDef.id}`,
          "Device auth timed out",
          "AUTH_TIMEOUT",
          "Try again with: kit site auth login",
          [],
        ),
      );
    }).pipe(withSiteError("kit site auth login")),
).pipe(Command.withDescription("Authenticate to a course-builder site via device flow"));

const siteAuthStatusCommand = Command.make(
  "status",
  { site: siteOption },
  ({ site }) =>
    Effect.gen(function* () {
      const siteId = optionValue<string>(site);
      const prefs = yield* Effect.promise(loadPreferences);
      const currentSite = siteId ?? prefs.currentSite;
      const siteDef = KNOWN_SITES[currentSite];
      const sites = yield* Effect.promise(getSiteAuthStatus);
      const currentStatus = sites.find((s) => s.id === currentSite);

      printEnvelope(
        success("kit site auth status", {
          current_site: prefs.currentSite,
          site_name: siteDef?.displayName ?? currentSite,
          authenticated: currentStatus?.authenticated ?? false,
          sites,
        }, [
          ...(!(currentStatus?.authenticated)
            ? [{
                command: `kit site auth login --site ${currentSite}`,
                description: `Authenticate to ${siteDef?.displayName ?? currentSite}`,
              }]
            : []),
          {
            command: "kit site use <site-id>",
            description: "Switch active site",
            params: {
              "site-id": {
                enum: Object.keys(KNOWN_SITES),
                value: prefs.currentSite,
              },
            },
          },
        ]),
      );
    }),
).pipe(Command.withDescription("Show auth status for all configured sites"));

const siteAuthCommand = Command.make("auth", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      success("kit site auth", {
        description: "Site authentication commands",
        commands: [
          { name: "login", description: "Authenticate via device flow", usage: "kit site auth login [--site ai-hero]" },
          { name: "status", description: "Show auth status for all sites", usage: "kit site auth status" },
        ],
      }, [
        { command: "kit site auth status", description: "Check auth" },
        { command: "kit site auth login", description: "Authenticate" },
      ]),
    );
  }),
).pipe(
  Command.withDescription("Site authentication"),
  Command.withSubcommands([siteAuthLoginCommand, siteAuthStatusCommand]),
);

const siteUseCommand = Command.make(
  "use",
  { siteId: Args.text({ name: "site-id" }) },
  ({ siteId }) =>
    Effect.gen(function* () {
      if (!KNOWN_SITES[siteId]) {
        const available = Object.keys(KNOWN_SITES).join(", ");
        printEnvelope(
          failure(
            `kit site use ${siteId}`,
            `Unknown site "${siteId}". Available: ${available}`,
            "UNKNOWN_SITE",
            `Use one of: ${available}`,
            [],
          ),
        );
        return;
      }

      yield* Effect.promise(() =>
        savePreferences({ currentSite: siteId }),
      );

      const sites = yield* Effect.promise(getSiteAuthStatus);
      const siteStatus = sites.find((s) => s.id === siteId);

      printEnvelope(
        success(`kit site use ${siteId}`, {
          current_site: siteId,
          display_name: KNOWN_SITES[siteId]!.displayName,
          authenticated: siteStatus?.authenticated ?? false,
        }, [
          { command: "kit site auth status", description: "Verify auth" },
          { command: "kit shortlink list", description: "List shortlinks" },
        ]),
      );
    }),
).pipe(Command.withDescription("Switch the active site"));

// ---------------------------------------------------------------------------
// Shortlink commands
// ---------------------------------------------------------------------------

const shortlinkListCommand = Command.make(
  "list",
  { site: siteOption },
  ({ site }) =>
    Effect.gen(function* () {
      const { site: siteDef, token } = yield* Effect.promise(() =>
        resolveSite(optionValue<string>(site)),
      );
      const t = requireToken(token, siteDef.id);
      const { ok, status, data } = yield* Effect.promise(() =>
        siteApiFetch<unknown[]>(siteDef, t, "/api/shortlinks"),
      );

      if (!ok) {
        printEnvelope(
          failure("kit shortlink list", `HTTP ${status}`, `HTTP_${status}`, "Check auth.", [
            { command: "kit site auth login", description: "Re-authenticate" },
          ]),
        );
        return;
      }

      const links = Array.isArray(data) ? data : [];

      printEnvelope(
        success("kit shortlink list", {
          site: siteDef.id,
          count: links.length,
          shortlinks: links,
        }, [
          {
            command: "kit shortlink create --slug <slug> --url <url> [--description <text>]",
            description: "Create a new shortlink",
            params: {
              slug: { description: "Short URL slug", required: true },
              url: { description: "Destination URL", required: true },
            },
          },
        ]),
      );
    }).pipe(withSiteError("kit shortlink list")),
).pipe(Command.withDescription("List shortlinks on the active site"));

const shortlinkCreateCommand = Command.make(
  "create",
  {
    slug: Options.text("slug"),
    url: Options.text("url"),
    description: Options.text("description").pipe(Options.optional),
    site: siteOption,
  },
  ({ slug, url, description, site }) =>
    Effect.gen(function* () {
      const { site: siteDef, token } = yield* Effect.promise(() =>
        resolveSite(optionValue<string>(site)),
      );
      const t = requireToken(token, siteDef.id);
      const body: Record<string, string> = { slug, url };
      const desc = optionValue<string>(description);
      if (desc) body.description = desc;

      const { ok, status, data } = yield* Effect.promise(() =>
        siteApiFetch<Record<string, unknown>>(siteDef, t, "/api/shortlinks", {
          method: "POST",
          body,
        }),
      );

      if (!ok) {
        const msg =
          (data as Record<string, unknown>)?.error ?? `HTTP ${status}`;
        printEnvelope(
          failure(
            "kit shortlink create",
            String(msg),
            `HTTP_${status}`,
            status === 409
              ? `Slug "${slug}" already exists. Use a different slug or update the existing one.`
              : "Check auth and request body.",
            [{ command: "kit shortlink list", description: "List existing shortlinks" }],
          ),
        );
        return;
      }

      printEnvelope(
        success("kit shortlink create", {
          site: siteDef.id,
          shortlink: data,
          live_url: `${siteDef.baseUrl}/s/${slug}`,
        }, [
          { command: "kit shortlink list", description: "List all shortlinks" },
          {
            command: `open ${siteDef.baseUrl}/s/${slug}`,
            description: "Test the shortlink",
          },
        ]),
      );
    }).pipe(withSiteError("kit shortlink create")),
).pipe(Command.withDescription("Create a shortlink on the active site"));

const shortlinkUpdateCommand = Command.make(
  "update",
  {
    id: Args.text({ name: "id" }),
    url: Options.text("url").pipe(Options.optional),
    slug: Options.text("slug").pipe(Options.optional),
    site: siteOption,
  },
  ({ id, url, slug, site }) =>
    Effect.gen(function* () {
      const { site: siteDef, token } = yield* Effect.promise(() =>
        resolveSite(optionValue<string>(site)),
      );
      const t = requireToken(token, siteDef.id);
      const body: Record<string, string> = {};
      const newUrl = optionValue<string>(url);
      const newSlug = optionValue<string>(slug);
      if (newUrl) body.url = newUrl;
      if (newSlug) body.slug = newSlug;

      const { ok, status, data } = yield* Effect.promise(() =>
        siteApiFetch<Record<string, unknown>>(siteDef, t, `/api/shortlinks/${id}`, {
          method: "PUT",
          body,
        }),
      );

      if (!ok) {
        printEnvelope(
          failure("kit shortlink update", `HTTP ${status}`, `HTTP_${status}`, "Check the shortlink ID and auth.", [
            { command: "kit shortlink list", description: "List shortlinks to find the ID" },
          ]),
        );
        return;
      }

      printEnvelope(
        success(`kit shortlink update ${id}`, { site: siteDef.id, shortlink: data }, [
          { command: "kit shortlink list", description: "Verify update" },
        ]),
      );
    }).pipe(withSiteError("kit shortlink update")),
).pipe(Command.withDescription("Update a shortlink's URL or slug"));

// ---------------------------------------------------------------------------
// Resource commands
// ---------------------------------------------------------------------------

const resourceGetCommand = Command.make(
  "get",
  {
    slugOrId: Args.text({ name: "slug-or-id" }),
    type: Options.text("type").pipe(Options.optional, Options.withDescription("Resource type filter (e.g. cohort, post)")),
    site: siteOption,
  },
  ({ slugOrId, type, site }) =>
    Effect.gen(function* () {
      const { site: siteDef, token } = yield* Effect.promise(() =>
        resolveSite(optionValue<string>(site)),
      );
      const t = requireToken(token, siteDef.id);
      const typeParam = optionValue<string>(type);
      let path = `/api/resources?slugOrId=${encodeURIComponent(slugOrId)}`;
      if (typeParam) path += `&type=${encodeURIComponent(typeParam)}`;

      const { ok, status, data } = yield* Effect.promise(() =>
        siteApiFetch<Record<string, unknown>>(siteDef, t, path),
      );

      if (!ok) {
        printEnvelope(
          failure(`kit resource get ${slugOrId}`, `HTTP ${status}`, `HTTP_${status}`, "Check the slug/ID and auth.", [
            { command: "kit site auth status", description: "Check auth" },
          ]),
        );
        return;
      }

      printEnvelope(
        success(`kit resource get ${slugOrId}`, { site: siteDef.id, resource: data }, [
          {
            command: `kit resource update <id> --body '<json>'`,
            description: "Update this resource's fields",
            params: { id: { description: "Resource ID", required: true } },
          },
        ]),
      );
    }).pipe(withSiteError("kit resource get")),
).pipe(Command.withDescription("Fetch a content resource by slug or ID"));

const resourceUpdateCommand = Command.make(
  "update",
  {
    id: Args.text({ name: "id" }),
    body: Options.text("body").pipe(Options.withDescription("JSON body with fields to merge")),
    site: siteOption,
  },
  ({ id, body, site }) =>
    Effect.gen(function* () {
      const { site: siteDef, token } = yield* Effect.promise(() =>
        resolveSite(optionValue<string>(site)),
      );
      const t = requireToken(token, siteDef.id);
      const parsed = JSON.parse(body) as Record<string, unknown>;

      const { ok, status, data } = yield* Effect.promise(() =>
        siteApiFetch<Record<string, unknown>>(siteDef, t, `/api/resources?id=${encodeURIComponent(id)}`, {
          method: "PUT",
          body: parsed,
        }),
      );

      if (!ok) {
        printEnvelope(
          failure(`kit resource update ${id}`, `HTTP ${status}`, `HTTP_${status}`, "Check resource ID, JSON body, and auth.", [
            { command: "kit site auth status", description: "Check auth" },
          ]),
        );
        return;
      }

      printEnvelope(
        success(`kit resource update ${id}`, { site: siteDef.id, resource: data }, [
          { command: `kit resource get ${id}`, description: "Verify the update" },
        ]),
      );
    }).pipe(withSiteError("kit resource update")),
).pipe(Command.withDescription("Update a content resource's fields (merge, not replace)"));

// ---------------------------------------------------------------------------
// Export command groups
// ---------------------------------------------------------------------------

export const shortlinkCommand = Command.make("shortlink", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      success("kit shortlink", {
        description: "Shortlink operations on course-builder sites",
        commands: [
          { name: "list", description: "List shortlinks", usage: "kit shortlink list" },
          { name: "create", description: "Create a shortlink", usage: "kit shortlink create --slug <slug> --url <url>" },
          { name: "update", description: "Update a shortlink", usage: "kit shortlink update <id> --url <url>" },
        ],
      }, [
        { command: "kit shortlink list", description: "List shortlinks" },
      ]),
    );
  }),
).pipe(
  Command.withDescription("Shortlink CRUD on course-builder sites"),
  Command.withSubcommands([shortlinkListCommand, shortlinkCreateCommand, shortlinkUpdateCommand]),
);

export const resourceCommand = Command.make("resource", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      success("kit resource", {
        description: "Content resource operations on course-builder sites",
        commands: [
          { name: "get", description: "Fetch a resource by slug or ID", usage: "kit resource get <slug> [--type cohort]" },
          { name: "update", description: "Update a resource's fields", usage: "kit resource update <id> --body '{...}'" },
        ],
      }, [
        { command: "kit resource get <slug>", description: "Fetch a resource" },
      ]),
    );
  }),
).pipe(
  Command.withDescription("Content resource operations on course-builder sites"),
  Command.withSubcommands([resourceGetCommand, resourceUpdateCommand]),
);

export const siteCommand = Command.make("site", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      success("kit site", {
        description: "Manage course-builder site connections",
        commands: [
          { name: "auth", description: "Authentication commands", usage: "kit site auth status" },
          { name: "use", description: "Switch active site", usage: "kit site use ai-hero" },
        ],
      }, [
        { command: "kit site auth status", description: "Check auth" },
        {
          command: "kit site use <site-id>",
          description: "Switch site",
          params: { "site-id": { enum: Object.keys(KNOWN_SITES) } },
        },
      ]),
    );
  }),
).pipe(
  Command.withDescription("Manage course-builder site connections"),
  Command.withSubcommands([siteAuthCommand, siteUseCommand]),
);
