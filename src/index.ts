#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Args from "@effect/cli/Args";
import * as Command from "@effect/cli/Command";
import * as CommandDescriptor from "@effect/cli/CommandDescriptor";
import * as Options from "@effect/cli/Options";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer, Option, pipe } from "effect";
import { execSync } from "node:child_process";
import {
  type AuthMode,
  type GeneratedOperation,
  operations,
} from "./generated/operations";
import { curatedAliases } from "./lib/aliases";
import {
  buildAuthorizeUrl,
  addKitAccount,
  clearStoredAuth,
  exchangeOAuthCode,
  getMergedConfig,
  refreshOAuthToken,
  resolveAuthHeaders,
  setApiKey,
} from "./lib/auth";
import {
  CREATE_ASCII_ART,
  CREATE_CREATURE_ASCII_ART,
  CREATURE_TAGLINE,
  KIT_ASCII_ART,
} from "./lib/branding";
import {
  htmlToText,
  lintBroadcastContent,
  type ReplacePair,
  replaceBroadcastContent,
} from "./lib/broadcast-helpers";
import {
  buildBroadcastPayload,
  extractSection,
  fetchDocText,
  textToHtml,
} from "./lib/doc-to-broadcast";
import {
  getConfigPath,
  getEffectiveBroadcastDefaults,
  getKitHomeConfigPath,
  getProjectConfigPath,
  loadConfig,
  resolveKitAccountId,
  saveProjectConfig,
  setCurrentKitAccount,
  upsertKitAccount,
} from "./lib/config";
import { executeOperation, fetchBroadcast } from "./lib/execute";
import {
  failure,
  type NextAction,
  printEnvelope,
  success,
} from "./lib/response";
import {
  shortlinkCommand,
  resourceCommand,
  siteCommand,
} from "./lib/site-commands";

const CLI_NAME = "kit";
const CLI_VERSION = "0.2.0";

type CommandTarget = {
  operation: GeneratedOperation;
  commandSegments: string[];
  summary: string;
  aliasFor?: string;
};

type CommandNode = {
  name: string;
  children: Map<string, CommandNode>;
  target?: CommandTarget;
};

const createNode = (name: string): CommandNode => ({
  name,
  children: new Map<string, CommandNode>(),
});

const canonicalTargets: CommandTarget[] = operations.map((operation) => ({
  operation,
  commandSegments: operation.commandSegments,
  summary: operation.summary,
}));

const operationById = new Map<string, GeneratedOperation>(
  operations.map((operation) => [operation.id, operation])
);

const aliasTargets: CommandTarget[] = curatedAliases.flatMap((alias) => {
  const operation = operationById.get(alias.targetOperationId);
  if (!operation) {
    return [];
  }

  return [
    {
      operation,
      commandSegments: alias.commandSegments,
      summary: alias.description,
      aliasFor: [CLI_NAME, ...operation.commandSegments].join(" "),
    },
  ];
});

const rootTree = createNode(CLI_NAME);
for (const target of [...canonicalTargets, ...aliasTargets]) {
  let node = rootTree;
  for (const segment of target.commandSegments) {
    const existing = node.children.get(segment) ?? createNode(segment);
    node.children.set(segment, existing);
    node = existing;
  }
  node.target = target;
}

const authModeOption = Options.choice("auth", [
  "auto",
  "api-key",
  "oauth",
] as const).pipe(Options.withDefault("auto" as AuthMode));

const optionalText = (name: string, description?: string) => {
  const option = pipe(Options.text(name), Options.optional);
  return description
    ? pipe(option, Options.withDescription(description))
    : option;
};

type AnyCommand = Command.Command<any, any, any, any>;

const withSubcommandsIfAny = <T extends AnyCommand>(
  command: T,
  subcommands: AnyCommand[]
): T => {
  if (subcommands.length === 0) {
    return command;
  }

  return pipe(
    command,
    Command.withSubcommands(subcommands as [AnyCommand, ...AnyCommand[]])
  ) as T;
};

const commandStringForOperation = (operation: GeneratedOperation) =>
  [CLI_NAME, ...operation.commandSegments].join(" ");

const commandStringForSegments = (commandSegments: string[]) =>
  [CLI_NAME, ...commandSegments].join(" ");

const groupEnvelope = (
  command: string,
  description: string,
  commands: Array<{ name: string; description: string; usage: string }>
) =>
  success(
    command,
    {
      description,
      commands,
    },
    commands.slice(0, 5).map((entry) => ({
      command: entry.usage,
      description: entry.description,
    }))
  );

const makeOperationCommand = (target: CommandTarget): any => {
  const { operation } = target;
  const optionShape: Record<string, unknown> = {
    auth: authModeOption,
  };

  for (const parameter of operation.queryParams) {
    optionShape[parameter.cliName] = optionalText(
      parameter.name,
      parameter.description
    );
  }

  if (operation.requestBody) {
    optionShape.body = optionalText("body", "Inline JSON request body");
    optionShape.bodyFile = optionalText(
      "body-file",
      "Read JSON request body from a file"
    );
  }

  const argsShape = operation.pathParams.length
    ? Args.all(
        Object.fromEntries(
          operation.pathParams.map((parameter) => [
            parameter.cliName,
            Args.text({ name: parameter.name }),
          ])
        )
      )
    : Args.none;

  const optionsShape =
    Object.keys(optionShape).length > 0
      ? Options.all(optionShape as any)
      : Options.none;
  const descriptor = pipe(
    CommandDescriptor.make(
      target.commandSegments.at(-1) ?? operation.id,
      optionsShape as any,
      argsShape as any
    ),
    CommandDescriptor.withDescription(target.summary)
  );

  return Command.fromDescriptor(
    descriptor as any,
    (({
      options,
      args,
    }: {
      options: Record<string, unknown>;
      args: Record<string, string>;
    }) =>
      Effect.gen(function* () {
        const envelope = yield* Effect.promise(() =>
          executeOperation(operation, args, options, target.commandSegments)
        );
        yield* Effect.sync(() => printEnvelope(envelope));
      })) as any
  );
};

const buildGroupCommand = (node: CommandNode, segments: string[]): any => {
  const pathSegments = [...segments, node.name].filter(
    (value) => value !== CLI_NAME
  );
  const subcommands = [...node.children.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((child) => buildCommand(child, pathSegments));

  const commands = [...node.children.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((child) => {
      const usage = [CLI_NAME, ...pathSegments, child.name].join(" ");
      return {
        name: child.name,
        description: child.target?.summary ?? `${child.name} command group`,
        usage,
      };
    });

  const description =
    pathSegments.length === 0
      ? "OpenAPI-generated Kit API v4 CLI wrapper"
      : `Kit command group for ${pathSegments.join(" ")}`;

  const groupCommand = Command.make(node.name, {}, () =>
    Effect.sync(() => {
      const command = [CLI_NAME, ...pathSegments].join(" ").trim();
      printEnvelope(groupEnvelope(command, description, commands));
    })
  ).pipe(Command.withDescription(description));

  return withSubcommandsIfAny(groupCommand, subcommands);
};

const buildCommand = (node: CommandNode, segments: string[]): any => {
  if (node.target && node.children.size === 0) {
    return makeOperationCommand(node.target);
  }

  return buildGroupCommand(node, segments);
};

const authStatusCommand = Command.make("status", {}, () =>
  Effect.gen(function* () {
    const config = yield* Effect.promise(() => getMergedConfig());
    const nextActions: NextAction[] = [
      {
        command: "kit auth api set --api-key <key>",
        description: "Store a Kit API key for API-key-authenticated endpoints",
        params: {
          key: {
            description: "Your Kit API v4 key",
            required: true,
          },
        },
      },
      {
        command:
          "kit auth oauth authorizeurl --client-id <id> --redirect-uri <uri> [--pkce]",
        description: "Start an OAuth authorization flow",
      },
    ];

    printEnvelope(
      success(
        "kit auth status",
        {
          config_path: getConfigPath(),
          api_key_configured: Boolean(config.apiKey),
          oauth: {
            access_token_configured: Boolean(config.oauth?.accessToken),
            refresh_token_configured: Boolean(config.oauth?.refreshToken),
            client_id_configured: Boolean(config.oauth?.clientId),
            client_secret_configured: Boolean(config.oauth?.clientSecret),
            redirect_uri_configured: Boolean(config.oauth?.redirectUri),
            pending_authorization: config.oauth?.pending ?? null,
            expires_at: config.oauth?.expiresAt ?? null,
          },
        },
        nextActions
      )
    );
  })
).pipe(Command.withDescription("Show stored Kit auth status"));

const authApiSetCommand = Command.make(
  "set",
  {
    apiKey: Options.text("api-key"),
  },
  ({ apiKey }) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => setApiKey(apiKey));
      printEnvelope(
        success(
          "kit auth api set",
          {
            stored: true,
            config_path: getConfigPath(),
          },
          [
            {
              command: "kit account get",
              description:
                "Verify the stored API key against the account endpoint",
            },
          ]
        )
      );
    })
).pipe(Command.withDescription("Store a Kit API key locally"));

const authApiCommand = Command.make("api", {}, () => Effect.void).pipe(
  Command.withDescription("API key authentication commands"),
  Command.withSubcommands([authApiSetCommand])
);

const authOauthAuthorizeUrlCommand = Command.make(
  "authorizeurl",
  {
    clientId: Options.text("client-id"),
    redirectUri: Options.text("redirect-uri"),
    scope: optionalText("scope", "Optional Kit OAuth scope"),
    state: optionalText("state", "Optional caller-provided state token"),
    tenantName: optionalText(
      "tenant-name",
      "Optional tenant name for multi-tenant apps"
    ),
    pkce: Options.boolean("pkce").pipe(Options.withDefault(false)),
  },
  ({ clientId, redirectUri, scope, state, tenantName, pkce }) =>
    Effect.gen(function* () {
      const result = yield* Effect.promise(() =>
        buildAuthorizeUrl({
          clientId,
          redirectUri,
          scope: scope._tag === "Some" ? scope.value : undefined,
          state: state._tag === "Some" ? state.value : undefined,
          tenantName: tenantName._tag === "Some" ? tenantName.value : undefined,
          pkce,
        })
      );

      printEnvelope(
        success("kit auth oauth authorizeurl", result, [
          {
            command: "kit auth oauth exchange --code <code> [--state <state>]",
            description: "Exchange the returned authorization code for tokens",
            params: {
              code: {
                description: "Authorization code returned by Kit",
                required: true,
              },
              state: {
                value: result.state,
                description: "State returned by Kit to verify the OAuth flow",
              },
            },
          },
        ])
      );
    })
).pipe(
  Command.withDescription(
    "Generate a Kit OAuth authorization URL and store pending PKCE state"
  )
);

const authOauthExchangeCommand = Command.make(
  "exchange",
  {
    code: Options.text("code"),
    state: optionalText("state"),
    clientId: optionalText("client-id"),
    clientSecret: optionalText("client-secret"),
    redirectUri: optionalText("redirect-uri"),
  },
  ({ code, state, clientId, clientSecret, redirectUri }) =>
    Effect.gen(function* () {
      const config = yield* Effect.promise(() =>
        exchangeOAuthCode({
          code,
          state: state._tag === "Some" ? state.value : undefined,
          clientId: clientId._tag === "Some" ? clientId.value : undefined,
          clientSecret:
            clientSecret._tag === "Some" ? clientSecret.value : undefined,
          redirectUri:
            redirectUri._tag === "Some" ? redirectUri.value : undefined,
        })
      );

      printEnvelope(
        success(
          "kit auth oauth exchange",
          {
            exchanged: true,
            access_token_configured: Boolean(config.oauth?.accessToken),
            refresh_token_configured: Boolean(config.oauth?.refreshToken),
            expires_at: config.oauth?.expiresAt ?? null,
          },
          [
            {
              command: "kit auth status",
              description: "Inspect the stored OAuth credentials",
            },
            {
              command: "kit account get --auth oauth",
              description: "Verify the exchanged access token against Kit",
            },
          ]
        )
      );
    })
).pipe(
  Command.withDescription(
    "Exchange a Kit OAuth authorization code for access and refresh tokens"
  )
);

const authOauthRefreshCommand = Command.make("refresh", {}, () =>
  Effect.gen(function* () {
    const config = yield* Effect.promise(() => refreshOAuthToken());
    printEnvelope(
      success(
        "kit auth oauth refresh",
        {
          refreshed: true,
          expires_at: config.oauth?.expiresAt ?? null,
        },
        [
          {
            command: "kit account get --auth oauth",
            description: "Verify the refreshed access token",
          },
        ]
      )
    );
  })
).pipe(Command.withDescription("Refresh a stored OAuth access token"));

const authOauthCommand = Command.make("oauth", {}, () => Effect.void).pipe(
  Command.withDescription("OAuth authentication commands"),
  Command.withSubcommands([
    authOauthAuthorizeUrlCommand,
    authOauthExchangeCommand,
    authOauthRefreshCommand,
  ])
);

const authClearCommand = Command.make(
  "clear",
  {
    target: Options.choice("target", ["all", "api-key", "oauth"] as const).pipe(
      Options.withDefault("all" as const)
    ),
  },
  ({ target }) =>
    Effect.gen(function* () {
      yield* Effect.promise(() => clearStoredAuth(target));
      printEnvelope(
        success(
          "kit auth clear",
          {
            cleared: target,
            config_path: getConfigPath(),
          },
          [
            {
              command: "kit auth status",
              description: "Verify the cleared auth state",
            },
          ]
        )
      );
    })
).pipe(Command.withDescription("Clear stored auth state"));

const authCommand = Command.make("auth", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      groupEnvelope("kit auth", "Manage Kit API key and OAuth credentials", [
        {
          name: "status",
          description: "Show stored auth status",
          usage: "kit auth status",
        },
        {
          name: "api",
          description: "API key auth commands",
          usage: "kit auth api set --api-key <key>",
        },
        {
          name: "oauth",
          description: "OAuth auth commands",
          usage:
            "kit auth oauth authorizeurl --client-id <id> --redirect-uri <uri>",
        },
        {
          name: "clear",
          description: "Clear stored auth state",
          usage: "kit auth clear [--target <all|api-key|oauth>]",
        },
      ])
    );
  })
).pipe(
  Command.withDescription("Manage Kit authentication"),
  Command.withSubcommands([
    authStatusCommand,
    authApiCommand,
    authOauthCommand,
    authClearCommand,
  ])
);

const splitAliases = (value: Option.Option<string>) =>
  value._tag === "Some"
    ? value.value.split(",").map((entry) => entry.trim()).filter(Boolean)
    : [];

const accountNextActions = (): NextAction[] => [
  {
    command: "kit account list",
    description: "List configured Kit accounts and aliases",
  },
  {
    command: "kit account use <account-or-alias>",
    description: "Set the default Kit account for future commands",
    params: {
      "account-or-alias": {
        description: "Account id or short alias, e.g. cwa or aih",
        required: true,
      },
    },
  },
  {
    command: "kit account add <id> --api-key <key> [--alias <aliases>]",
    description: "Store a Kit account API key with optional comma-separated aliases",
  },
];

const accountListCommand = Command.make("list", {}, () =>
  Effect.gen(function* () {
    const config = yield* Effect.promise(() => loadConfig());
    const accounts = Object.entries(config.accounts ?? {}).map(([id, account]) => ({
      id,
      aliases: account.aliases ?? [],
      name: account.name ?? null,
      email: account.email ?? null,
      account_id: account.accountId ?? null,
      current: id === config.currentKitAccount,
    }));
    printEnvelope(
      success(
        "kit account list",
        {
          config_path: getConfigPath(),
          project_config_path: getProjectConfigPath(),
          current_account: config.currentKitAccount ?? null,
          accounts,
        },
        accountNextActions()
      )
    );
  })
).pipe(Command.withDescription("List configured Kit accounts and short aliases"));

const accountCurrentCommand = Command.make("current", {}, () =>
  Effect.gen(function* () {
    const config = yield* Effect.promise(() => loadConfig());
    const current = config.currentKitAccount
      ? config.accounts?.[config.currentKitAccount]
      : undefined;
    printEnvelope(
      success(
        "kit account current",
        {
          config_path: getConfigPath(),
          project_config_path: getProjectConfigPath(),
          current_account: config.currentKitAccount ?? null,
          account: current ?? null,
        },
        accountNextActions()
      )
    );
  })
).pipe(Command.withDescription("Show the default Kit account"));

const accountUseCommand = Command.make(
  "use",
  { account: Args.text({ name: "account-or-alias" }) },
  ({ account }) =>
    Effect.gen(function* () {
      const { config, resolved } = yield* Effect.promise(() =>
        setCurrentKitAccount(account)
      );
      printEnvelope(
        success(
          `kit account use ${account}`,
          {
            config_path: getConfigPath(),
            requested: account,
            current_account: resolved,
            account: config.accounts?.[resolved] ?? null,
          },
          [
            {
              command: "kit whoami --auth api-key",
              description: "Verify the selected account against Kit",
            },
            ...accountNextActions(),
          ]
        )
      );
    })
).pipe(Command.withDescription("Set the default Kit account by id or short alias"));

const accountPinCommand = Command.make(
  "pin",
  { account: Args.text({ name: "account-or-alias" }) },
  ({ account }) =>
    Effect.gen(function* () {
      const config = yield* Effect.promise(() => loadConfig());
      const resolved = resolveKitAccountId(config, account) ?? account;
      yield* Effect.promise(() => saveProjectConfig({ currentKitAccount: resolved }));
      printEnvelope(
        success(
          `kit account pin ${account}`,
          {
            project_config_path: getProjectConfigPath(),
            requested: account,
            pinned_account: resolved,
            account: config.accounts?.[resolved] ?? null,
          },
          [
            {
              command: "kit account current",
              description: "Confirm the project-local account selection",
            },
            {
              command: "kit whoami --auth api-key",
              description: "Verify the pinned account against Kit",
            },
          ]
        )
      );
    })
).pipe(Command.withDescription("Pin the current project directory to a Kit account"));

const accountAddCommand = Command.make(
  "add",
  {
    id: Args.text({ name: "id" }),
    apiKey: Options.text("api-key"),
    alias: optionalText("alias", "Comma-separated short aliases, e.g. cwa,antonio"),
    name: optionalText("name", "Human-friendly account name"),
    email: optionalText("email", "Primary sending/account email"),
    accountId: optionalText("account-id", "Numeric Kit account ID"),
    current: Options.boolean("current").pipe(Options.withDefault(false)),
  },
  ({ id, apiKey, alias, name, email, accountId, current }) =>
    Effect.gen(function* () {
      const config = yield* Effect.promise(() =>
        addKitAccount({
          id,
          apiKey,
          aliases: splitAliases(alias),
          name: name._tag === "Some" ? name.value : undefined,
          email: email._tag === "Some" ? email.value : undefined,
          accountId:
            accountId._tag === "Some" ? Number(accountId.value) : undefined,
          makeCurrent: current,
        })
      );
      printEnvelope(
        success(
          `kit account add ${id}`,
          {
            config_path: getConfigPath(),
            stored: true,
            account: config.accounts?.[id] ?? null,
            current_account: config.currentKitAccount ?? null,
          },
          [
            {
              command: `kit account use ${id}`,
              description: "Use this account by default",
            },
            {
              command: "kit whoami --auth api-key",
              description: "Verify the active Kit account",
            },
          ]
        )
      );
    })
).pipe(Command.withDescription("Store a Kit API key account with short aliases"));

const accountCommand = Command.make("account", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      groupEnvelope("kit account", "Manage Kit accounts and short aliases", [
        {
          name: "list",
          description: "List configured Kit accounts",
          usage: "kit account list",
        },
        {
          name: "current",
          description: "Show the active Kit account",
          usage: "kit account current",
        },
        {
          name: "use",
          description: "Set active account by id or alias",
          usage: "kit account use <account-or-alias>",
        },
        {
          name: "pin",
          description: "Write .kit/config.json for this project directory",
          usage: "kit account pin <account-or-alias>",
        },
        {
          name: "add",
          description: "Store an API key account with aliases",
          usage: "kit account add <id> --api-key <key> [--alias <aliases>]",
        },
      ])
    );
  })
).pipe(
  Command.withDescription("Manage Kit accounts and short aliases"),
  Command.withSubcommands([
    accountListCommand,
    accountCurrentCommand,
    accountUseCommand,
    accountPinCommand,
    accountAddCommand,
  ])
);

const defaultsBroadcastCommand = Command.make(
  "broadcast",
  {
    account: optionalText("account", "Override the account ID to inspect"),
  },
  ({ account }) =>
    Effect.gen(function* () {
      const accountId = account._tag === "Some" ? account.value : undefined;
      const defaults = yield* Effect.promise(() =>
        getEffectiveBroadcastDefaults(accountId)
      );
      printEnvelope(
        success(
          "kit defaults broadcast",
          {
            config_path: getKitHomeConfigPath(),
            selected_account_id: defaults.selected_account_id,
            broadcast_defaults: defaults.broadcast_defaults,
          },
          [
            {
              command: "kit defaults broadcast [--account <id>]",
              description:
                "Inspect effective broadcast defaults for a specific account",
              params: {
                id: {
                  value: defaults.selected_account_id ?? undefined,
                  description: "Account ID from ~/.kit/config.json",
                },
              },
            },
            {
              command: "kit whoami",
              description:
                "Verify the active Kit account for the current API key",
            },
            {
              command: "kit bcasts create --body-file <path>",
              description:
                "Create a draft broadcast that can inherit these defaults",
              params: {
                path: {
                  description: "Path to the JSON body file",
                  required: true,
                },
              },
            },
          ]
        )
      );
    })
).pipe(
  Command.withDescription(
    "Show the effective broadcast defaults from ~/.kit/config.json"
  )
);

const defaultsCommand = Command.make("defaults", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      groupEnvelope(
        "kit defaults",
        "Inspect local Kit defaults and conventions",
        [
          {
            name: "broadcast",
            description:
              "Show the effective broadcast defaults from ~/.kit/config.json",
            usage: "kit defaults broadcast",
          },
        ]
      )
    );
  })
).pipe(
  Command.withDescription("Inspect local Kit defaults"),
  Command.withSubcommands([defaultsBroadcastCommand])
);

// ---------------------------------------------------------------------------
// Campaign status command
// ---------------------------------------------------------------------------

type CampaignEmail = {
  label: string;
  broadcast_id: string | null;
  publication_id?: string;
  status: string;
  sent_at?: string;
  send_at?: string | null;
  send_at_human?: string;
  shortlink: string | null;
  notes?: string;
};

type CampaignState = {
  campaign: string;
  title: string;
  segment_id: string;
  template_id: string;
  from: string;
  cohort_slug: string;
  cohort_resource_id: string;
  emails: Record<string, CampaignEmail>;
};

const campaignStateFile = () => {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "docs", "campaign-003-state.json");
};

const campaignStatusCommand = Command.make("status", {}, () =>
  Effect.gen(function* () {
    try {
      const raw = yield* Effect.promise(() =>
        readFile(campaignStateFile(), "utf-8")
      );
      const state: CampaignState = JSON.parse(raw);

      const emails = Object.entries(state.emails);
      const sent = emails.filter(([, e]) => e.status === "sent");
      const scheduled = emails.filter(([, e]) => e.status === "scheduled");
      const draft = emails.filter(([, e]) => e.status === "draft");
      const notStarted = emails.filter(([, e]) => e.status === "not_started");

      const nextActions: NextAction[] = [];

      for (const [key, email] of draft) {
        if (email.broadcast_id) {
          nextActions.push({
            command: `kit bcasts get ${email.broadcast_id}`,
            description: `Fetch draft: ${email.label} (${key})`,
          });
        }
      }

      for (const [key, email] of scheduled) {
        if (email.broadcast_id) {
          nextActions.push({
            command: `kit bcasts get ${email.broadcast_id}`,
            description: `Check scheduled: ${email.label} (${key})`,
          });
        }
      }

      const nextUp = notStarted[0];
      if (nextUp) {
        const [nextKey, nextEmail] = nextUp;
        nextActions.push({
          command: "kit bcasts create --body-file <path>",
          description: `Create next email: ${nextEmail.label} (${nextKey}), shortlink ${nextEmail.shortlink}`,
        });
      }

      nextActions.push({
        command: "kit defaults broadcast",
        description: "Check effective broadcast defaults",
      });

      printEnvelope(
        success(
          "kit campaign status",
          {
            campaign: state.campaign,
            title: state.title,
            segment_id: state.segment_id,
            template_id: state.template_id,
            from: state.from,
            summary: {
              sent: sent.length,
              scheduled: scheduled.length,
              draft: draft.length,
              not_started: notStarted.length,
              total: emails.length,
            },
            emails: state.emails,
          },
          nextActions
        )
      );
    } catch (error) {
      printEnvelope(
        failure(
          "kit campaign status",
          error instanceof Error ? error.message : String(error),
          "CAMPAIGN_FILE_ERROR",
          "Verify docs/campaign-003-state.json exists and is valid JSON.",
          [
            {
              command: "kit campaign status",
              description: "Retry after fixing the state file",
            },
          ]
        )
      );
    }
  })
).pipe(Command.withDescription("Show the current Cohort 003 campaign state"));

const campaignCommand = Command.make("campaign", {}, () =>
  Effect.sync(() => {
    printEnvelope(
      groupEnvelope("kit campaign", "Campaign tracking for the active launch", [
        {
          name: "status",
          description: "Show the current Cohort 003 campaign state",
          usage: "kit campaign status",
        },
      ])
    );
  })
).pipe(
  Command.withDescription("Campaign tracking for the active launch"),
  Command.withSubcommands([campaignStatusCommand])
);

// ---------------------------------------------------------------------------
// Custom broadcast commands: text, replace, lint
// ---------------------------------------------------------------------------

const isSupportedBroadcastFilter = (filter: unknown): boolean => {
  const walk = (value: unknown): boolean => {
    if (Array.isArray(value)) {
      return value.every(walk);
    }

    if (!value || typeof value !== "object") {
      return true;
    }

    const record = value as Record<string, unknown>;
    if (typeof record.type === "string") {
      return record.type === "segment" || record.type === "tag";
    }

    return Object.values(record).every(walk);
  };

  return walk(filter);
};

const bcastsNextActions = (
  id: string,
  publicationId?: string
): NextAction[] => {
  const actions: NextAction[] = [
    {
      command: `kit bcasts get ${id}`,
      description: "Fetch the full broadcast",
    },
    { command: `kit bcasts text ${id}`, description: "View as plain text" },
    { command: `kit bcasts lint ${id}`, description: "Check for copy issues" },
    {
      command: `kit bcasts replace ${id} --find <old> --replace <new>`,
      description: "Surgical find/replace on content",
      params: {
        old: { description: "Text to find", required: true },
        new: { description: "Replacement text", required: true },
      },
    },
  ];
  if (publicationId) {
    actions.push({
      command: `open https://app.kit.com/publications/${publicationId}/reports/overview`,
      description: "Preview in Kit UI",
    });
  }
  return actions;
};

/**
 * Catch any Effect failure (expected errors + defects) and print as JSON error envelope.
 * This replaces try/catch inside Effect.gen, which cannot catch defects from Effect.promise.
 */
const withErrorEnvelope = (
  command: string,
  code: string,
  fix: string,
  nextActions: NextAction[],
) =>
  Effect.catchAllCause((cause) =>
    Effect.sync(() => {
      // Extract a clean message without stack traces
      const raw = cause.toString();
      const lines = raw.split("\n");
      const firstLine = lines[0] ?? raw;
      // Strip "Error: " prefix if present, keep it readable
      const message = firstLine.replace(/^Error:\s*/, "").slice(0, 200);
      printEnvelope(failure(command, message, code, fix, nextActions));
    }),
  );

const resolveAuth = () =>
  resolveAuthHeaders({
    mode: "auto",
    supportsApiKey: true,
    supportsOAuth: true,
  });

const bcastsTextCommand = Command.make(
  "text",
  { id: Args.text({ name: "id" }) },
  ({ id }) =>
    Effect.gen(function* () {
      const auth = yield* Effect.promise(resolveAuth);
      const broadcast = yield* Effect.promise(() =>
        fetchBroadcast(id, auth.headers),
      );
      const content = (broadcast.content as string) ?? "";
      const text = htmlToText(content);
      const publicationId = broadcast.publication_id as string | undefined;

      printEnvelope(
        success(
          `kit bcasts text ${id}`,
          {
            broadcast_id: broadcast.id ?? id,
            publication_id: publicationId,
            subject: broadcast.subject,
            preview_text: broadcast.preview_text,
            send_at: broadcast.send_at,
            text,
            content_length: content.length,
            text_length: text.length,
          },
          bcastsNextActions(id, publicationId?.toString()),
        ),
      );
    }).pipe(
      withErrorEnvelope(
        "kit bcasts text",
        "FETCH_FAILED",
        "Check that the broadcast ID exists and your auth is configured.",
        [{ command: "kit auth status", description: "Check auth" }],
      ),
    ),
).pipe(
  Command.withDescription("Display broadcast content as readable plain text"),
);

const bcastsReplaceCommand = Command.make(
  "replace",
  {
    id: Args.text({ name: "id" }),
    find: Options.text("find").pipe(Options.repeated),
    replace: Options.text("replace").pipe(Options.repeated),
    dryRun: Options.boolean("dry-run").pipe(Options.withDefault(false)),
    auth: authModeOption,
  },
  ({ id, find, replace, dryRun, auth: authMode }) =>
    Effect.gen(function* () {
        const findArr = Array.from(find);
        const replaceArr = Array.from(replace);

        if (findArr.length === 0) {
          printEnvelope(
            failure(
              `kit bcasts replace ${id}`,
              "At least one --find/--replace pair is required.",
              "MISSING_ARGS",
              'Use --find "old text" --replace "new text". Repeat for multiple replacements.',
              bcastsNextActions(id)
            )
          );
          return;
        }

        if (findArr.length !== replaceArr.length) {
          printEnvelope(
            failure(
              `kit bcasts replace ${id}`,
              `Mismatched --find (${findArr.length}) and --replace (${replaceArr.length}) counts.`,
              "ARGS_MISMATCH",
              "Every --find must have a matching --replace.",
              bcastsNextActions(id)
            )
          );
          return;
        }

        const pairs: ReplacePair[] = findArr.map((f, i) => ({
          find: f,
          replace: replaceArr[i] ?? "",
        }));

        const auth = yield* Effect.promise(() =>
          resolveAuthHeaders({
            mode: authMode,
            supportsApiKey: true,
            supportsOAuth: true,
          })
        );
        const broadcast = yield* Effect.promise(() =>
          fetchBroadcast(id, auth.headers)
        );
        const content = (broadcast.content as string) ?? "";
        const { content: updatedContent, results } = replaceBroadcastContent(
          content,
          pairs
        );

        const anyFound = results.some((r) => r.found);
        if (!anyFound) {
          printEnvelope(
            success(
              `kit bcasts replace ${id}`,
              {
                broadcast_id: broadcast.id ?? id,
                changed: false,
                results,
              },
              bcastsNextActions(
                id,
                (broadcast.publication_id as number)?.toString()
              )
            )
          );
          return;
        }

        if (dryRun) {
          printEnvelope(
            success(
              `kit bcasts replace ${id} --dry-run`,
              {
                broadcast_id: broadcast.id ?? id,
                dry_run: true,
                changed: false,
                would_change: true,
                results,
              },
              bcastsNextActions(
                id,
                (broadcast.publication_id as number)?.toString()
              )
            )
          );
          return;
        }

        // Push the update. Read-then-merge in execute.ts handles preserving other fields,
        // but since we already have the broadcast, we'll do a direct PUT with full state.
        const baseUrl = "https://api.kit.com";
        const updateBody: Record<string, unknown> = {
          content: updatedContent,
          subject: broadcast.subject,
          preview_text: broadcast.preview_text,
          description: broadcast.description,
          public: broadcast.public,
          send_at: broadcast.send_at,
          published_at: broadcast.published_at,
          email_address: broadcast.email_address,
        };
        if (
          broadcast.subscriber_filter !== undefined &&
          broadcast.subscriber_filter !== null &&
          isSupportedBroadcastFilter(broadcast.subscriber_filter)
        ) {
          updateBody.subscriber_filter = broadcast.subscriber_filter;
        }
        const template = broadcast.email_template as
          | Record<string, unknown>
          | undefined;
        if (template?.id) {
          updateBody.email_template_id = template.id;
        }

        const putResponse = yield* Effect.promise(() =>
          fetch(`${baseUrl}/v4/broadcasts/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              ...auth.headers,
            },
            body: JSON.stringify(updateBody),
          })
        );

        if (!putResponse.ok) {
          const errText = yield* Effect.promise(() => putResponse.text());
          printEnvelope(
            failure(
              `kit bcasts replace ${id}`,
              `Kit API returned ${putResponse.status}: ${errText}`,
              `HTTP_${putResponse.status}`,
              "Check the broadcast ID and your auth credentials.",
              bcastsNextActions(id)
            )
          );
          return;
        }

        const updated = (yield* Effect.promise(() =>
          putResponse.json()
        )) as Record<string, unknown>;
        const updatedBroadcast = (updated.broadcast ?? updated) as Record<
          string,
          unknown
        >;

        printEnvelope(
          success(
            `kit bcasts replace ${id}`,
            {
              broadcast_id: updatedBroadcast.id ?? id,
              publication_id: updatedBroadcast.publication_id,
              changed: true,
              results,
              send_at: updatedBroadcast.send_at,
              subscriber_filter: updatedBroadcast.subscriber_filter,
            },
            bcastsNextActions(
              id,
              (updatedBroadcast.publication_id as number)?.toString()
            )
          )
        );
    }).pipe(
      withErrorEnvelope(
        "kit bcasts replace",
        "REPLACE_FAILED",
        "Check broadcast ID and auth. Use --dry-run to preview changes first.",
        [{ command: "kit auth status", description: "Check auth" }],
      ),
    ),
).pipe(
  Command.withDescription(
    "Find/replace text in broadcast content (preserves all other fields safely)",
  ),
);

const bcastsLintCommand = Command.make(
  "lint",
  { id: Args.text({ name: "id" }) },
  ({ id }) =>
    Effect.gen(function* () {
      const auth = yield* Effect.promise(resolveAuth);
      const broadcast = yield* Effect.promise(() =>
        fetchBroadcast(id, auth.headers),
      );
      const content = (broadcast.content as string) ?? "";
      const issues = lintBroadcastContent(content);
      const publicationId = broadcast.publication_id as string | undefined;

      const errors = issues.filter((i) => i.severity === "error");
      const warnings = issues.filter((i) => i.severity === "warning");

      printEnvelope(
        success(
          `kit bcasts lint ${id}`,
          {
            broadcast_id: broadcast.id ?? id,
            subject: broadcast.subject,
            issues_total: issues.length,
            errors: errors.length,
            warnings: warnings.length,
            issues,
            clean: issues.length === 0,
          },
          [
            ...(issues.length > 0
              ? [
                  {
                    command: `kit bcasts replace ${id} --find <old> --replace <new>`,
                    description: "Fix an issue with find/replace",
                    params: {
                      old: { description: "Text to find", required: true },
                      new: {
                        description: "Replacement text",
                        required: true,
                      },
                    },
                  },
                ]
              : []),
            ...bcastsNextActions(id, publicationId?.toString()),
          ],
        ),
      );
    }).pipe(
      withErrorEnvelope(
        "kit bcasts lint",
        "FETCH_FAILED",
        "Check that the broadcast ID exists and your auth is configured.",
        [{ command: "kit auth status", description: "Check auth" }],
      ),
    ),
).pipe(
  Command.withDescription(
    "Check broadcast content for copy issues (em dashes, stiff language, signatures)",
  ),
);

const bcastsFromDocCommand = Command.make(
  "from-doc",
  {
    section: Options.text("section").pipe(
      Options.withDescription("Section name to find in the doc (e.g. 'Launch Email #4')"),
    ),
    subject: Options.text("subject").pipe(
      Options.optional,
      Options.withDescription("Override the subject line (auto-detected from doc if omitted)"),
    ),
    preview: Options.text("preview").pipe(
      Options.optional,
      Options.withDescription("Preview text for the broadcast"),
    ),
    schedule: Options.text("schedule").pipe(
      Options.optional,
      Options.withDescription("Send time in UTC ISO format (omit to create as draft)"),
    ),
    docId: Options.text("doc-id").pipe(
      Options.optional,
      Options.withDescription("Google Doc ID (defaults to launch planning doc)"),
    ),
    dryRun: Options.boolean("dry-run").pipe(Options.withDefault(false)),
  },
  ({ section, subject, preview, schedule, docId, dryRun }) =>
    Effect.gen(function* () {
        const resolvedDocId =
          docId._tag === "Some" ? docId.value : undefined;

        // Step 1: Fetch doc
        const docText = yield* Effect.promise(() =>
          fetchDocText(resolvedDocId),
        );

        // Step 2: Extract section
        const extracted = extractSection(docText, section);
        if (!extracted) {
          printEnvelope(
            failure(
              `kit bcasts from-doc --section "${section}"`,
              `Section "${section}" not found in the Google Doc.`,
              "SECTION_NOT_FOUND",
              'Check the section name matches a marker in the doc. Look for lines with emoji status markers.',
              [
                {
                  command: `kit bcasts from-doc --section <section>`,
                  description: "Try a different section name",
                  params: {
                    section: {
                      description: "Section name (e.g. 'Launch Email #4')",
                      required: true,
                    },
                  },
                },
              ],
            ),
          );
          return;
        }

        // Step 3: Convert to HTML
        const html = textToHtml(extracted.body);

        // Step 4: Lint it
        const issues = lintBroadcastContent(html);

        // Step 5: Build payload
        const resolvedSubject =
          subject._tag === "Some"
            ? subject.value
            : extracted.subject ?? section;
        const resolvedPreview =
          preview._tag === "Some" ? preview.value : undefined;
        const resolvedSchedule =
          schedule._tag === "Some" ? schedule.value : undefined;

        const payload = buildBroadcastPayload(html, {
          subject: resolvedSubject,
          previewText: resolvedPreview,
          description: extracted.marker,
          sendAt: resolvedSchedule,
        });

        if (dryRun) {
          const textPreview = htmlToText(html);
          printEnvelope(
            success(
              `kit bcasts from-doc --section "${section}" --dry-run`,
              {
                dry_run: true,
                section_found: true,
                marker: extracted.marker,
                subject: resolvedSubject,
                preview_text: resolvedPreview,
                send_at: resolvedSchedule ?? null,
                content_length: html.length,
                text_preview: textPreview.slice(0, 500),
                lint_issues: issues.length,
                issues,
              },
              [
                {
                  command: `kit bcasts from-doc --section "${section}"`,
                  description: "Create the broadcast (remove --dry-run)",
                },
              ],
            ),
          );
          return;
        }

        // Step 6: Create broadcast via Kit API
        const auth = yield* Effect.promise(resolveAuth);
        const baseUrl = "https://api.kit.com";
        const createResponse = yield* Effect.promise(() =>
          fetch(`${baseUrl}/v4/broadcasts`, {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              ...auth.headers,
            },
            body: JSON.stringify(payload),
          }),
        );

        if (!createResponse.ok) {
          const errText = yield* Effect.promise(() =>
            createResponse.text(),
          );
          printEnvelope(
            failure(
              `kit bcasts from-doc --section "${section}"`,
              `Kit API returned ${createResponse.status}: ${errText}`,
              `HTTP_${createResponse.status}`,
              "Check your Kit auth credentials.",
              [
                { command: "kit auth status", description: "Check auth" },
              ],
            ),
          );
          return;
        }

        const created = (yield* Effect.promise(() =>
          createResponse.json(),
        )) as Record<string, unknown>;
        const broadcast = (created.broadcast ?? created) as Record<
          string,
          unknown
        >;
        const broadcastId = broadcast.id as number;
        const publicationId = broadcast.publication_id as number | undefined;
        const template = broadcast.email_template as
          | Record<string, unknown>
          | undefined;

        printEnvelope(
          success(
            `kit bcasts from-doc --section "${section}"`,
            {
              broadcast_id: broadcastId,
              publication_id: publicationId,
              subject: broadcast.subject,
              preview_text: broadcast.preview_text,
              send_at: broadcast.send_at ?? null,
              template: template
                ? `${template.name} (${template.id})`
                : null,
              from: broadcast.email_address,
              public: broadcast.public,
              subscriber_filter: broadcast.subscriber_filter,
              content_length: html.length,
              lint_issues: issues.length,
              issues: issues.length > 0 ? issues : undefined,
              status: resolvedSchedule ? "scheduled" : "draft",
            },
            [
              ...(broadcastId
                ? [
                    {
                      command: `kit bcasts text ${broadcastId}`,
                      description: "View the broadcast as plain text",
                    },
                    {
                      command: `kit bcasts lint ${broadcastId}`,
                      description: "Run lint checks on the broadcast",
                    },
                    {
                      command: `kit bcasts replace ${broadcastId} --find <old> --replace <new>`,
                      description: "Make surgical edits",
                      params: {
                        old: {
                          description: "Text to find",
                          required: true,
                        },
                        new: {
                          description: "Replacement text",
                          required: true,
                        },
                      },
                    },
                  ]
                : []),
              ...(publicationId
                ? [
                    {
                      command: `open https://app.kit.com/publications/${publicationId}/reports/overview`,
                      description: "Preview in Kit UI",
                    },
                  ]
                : []),
              {
                command: "kit campaign status",
                description: "Check campaign state",
              },
            ],
          ),
        );
    }).pipe(
      withErrorEnvelope(
        "kit bcasts from-doc",
        "FROM_DOC_FAILED",
        "Check network access to Google Docs and Kit API auth.",
        [{ command: "kit auth status", description: "Check auth" }],
      ),
    ),
).pipe(
  Command.withDescription(
    "Pull a section from the launch Google Doc, convert to HTML, and create a broadcast",
  ),
);

// Build the bcasts group with both generated and custom commands
const buildBcastsGroup = (node: CommandNode): any => {
  const pathSegments = [node.name];
  const generatedSubcommands = [...node.children.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((child) => buildCommand(child, pathSegments));

  // Merge generated + custom subcommands
  const allSubcommands = [
    ...generatedSubcommands,
    bcastsTextCommand,
    bcastsReplaceCommand,
    bcastsLintCommand,
    bcastsFromDocCommand,
  ];

  const commands = [
    ...[...node.children.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((child) => ({
        name: child.name,
        description: child.target?.summary ?? `${child.name} command group`,
        usage: `kit bcasts ${child.name}`,
      })),
    {
      name: "text",
      description: "Display broadcast content as readable plain text",
      usage: "kit bcasts text <id>",
    },
    {
      name: "replace",
      description:
        "Find/replace text in broadcast content (preserves all fields)",
      usage: "kit bcasts replace <id> --find <old> --replace <new>",
    },
    {
      name: "lint",
      description: "Check broadcast content for copy issues",
      usage: "kit bcasts lint <id>",
    },
    {
      name: "from-doc",
      description: "Pull a section from the launch Google Doc, convert to HTML, and create a broadcast",
      usage: 'kit bcasts from-doc --section "Launch Email #4"',
    },
  ];

  const groupCommand = Command.make("bcasts", {}, () =>
    Effect.sync(() => {
      printEnvelope(
        groupEnvelope(
          "kit bcasts",
          "Broadcast operations (Kit API + editing tools)",
          commands
        )
      );
    })
  ).pipe(
    Command.withDescription("Broadcast operations (Kit API + editing tools)")
  );

  return withSubcommandsIfAny(groupCommand, allSubcommands);
};

const generatedCommands = [...rootTree.children.values()]
  .sort((left, right) => left.name.localeCompare(right.name))
  .map((child) => {
    if (child.name === "bcasts") {
      return buildBcastsGroup(child);
    }
    return buildCommand(child, []);
  });

// ---------------------------------------------------------------------------
// Memory: recall and store support observations via Typesense
// ---------------------------------------------------------------------------

const TYPESENSE_HOST = "ibtv3lrk986pagomp-1.a1.typesense.net";
const MEMORY_COLLECTION = "support_memory";

const getTypesenseKey = (): string | null => {
  try {
    return execSync("secrets lease ai-hero::typesense_admin_key --ttl 15m", {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
};

const typesenseFetch = (path: string, key: string, init?: RequestInit) =>
  Effect.promise(() =>
    fetch(`https://${TYPESENSE_HOST}${path}`, {
      ...init,
      headers: { "X-TYPESENSE-API-KEY": key, ...init?.headers },
    }).then((r) => r.json() as Promise<Record<string, unknown>>)
  );

const memoryRecallCommand = Command.make(
  "recall",
  {
    query: Args.text({ name: "query" }),
    perPage: Options.integer("per-page").pipe(Options.withDefault(5)),
    category: Options.text("category").pipe(Options.optional),
    semantic: Options.boolean("semantic").pipe(Options.withDefault(false)),
  },
  ({ query, perPage, category, semantic }) =>
    Effect.gen(function* () {
      const key = getTypesenseKey();
      if (!key) {
        printEnvelope(failure("memory recall", "secrets daemon unavailable", "NO_KEY", "Start the secrets daemon: nohup secrets serve &", []));
        return;
      }

      const filterParts = ["write_verdict:=allow", "stale:=false"];
      const cat = Option.getOrUndefined(category);
      if (cat) filterParts.push(`category:=${cat}`);

      const params = new URLSearchParams({
        q: query,
        query_by: semantic ? "embedding,observation" : "observation",
        exclude_fields: "embedding",
        filter_by: filterParts.join("&&"),
        per_page: String(perPage),
        prefix: "false",
      });
      if (semantic) params.set("vector_query", "embedding:([], alpha: 0.6)");

      const data = yield* typesenseFetch(
        `/collections/${MEMORY_COLLECTION}/documents/search?${params}`, key
      ) as Effect.Effect<{ found: number; search_time_ms: number; hits: Array<{ document: Record<string, unknown>; vector_distance?: number }> }, never, never>;

      const observations = ((data as unknown as { hits: Array<{ document: Record<string, unknown>; vector_distance?: number }> }).hits || []).map((h) => ({
        id: h.document.id,
        observation: h.document.observation,
        category: h.document.category,
        source: h.document.source,
        merged_count: h.document.merged_count,
        ...(h.vector_distance != null && { vector_distance: h.vector_distance }),
      }));

      printEnvelope(success(`memory recall "${query}"`, {
        query,
        mode: semantic ? "hybrid" : "keyword",
        found: (data as unknown as { found: number }).found,
        search_time_ms: (data as unknown as { search_time_ms: number }).search_time_ms,
        observations,
      }, [
        { command: `kit memory recall "${query}" --semantic`, description: "Try hybrid semantic search" },
        { command: "kit memory store <observation> --category <cat>", description: "Store a new observation" },
      ]));
    })
).pipe(Command.withDescription("Recall support memory observations"));

const memoryStoreCommand = Command.make(
  "store",
  {
    observation: Args.text({ name: "observation" }),
    category: Options.text("category"),
    source: Options.text("source").pipe(Options.withDefault("manual")),
    verdict: Options.text("verdict").pipe(Options.withDefault("allow")),
  },
  ({ observation, category, source, verdict }) =>
    Effect.gen(function* () {
      const key = getTypesenseKey();
      if (!key) {
        printEnvelope(failure("memory store", "secrets daemon unavailable", "NO_KEY", "Start the secrets daemon: nohup secrets serve &", []));
        return;
      }

      const result = yield* typesenseFetch(
        `/collections/${MEMORY_COLLECTION}/documents`, key,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            observation,
            observation_type: "fact",
            category,
            source,
            timestamp: Math.floor(Date.now() / 1000),
            write_verdict: verdict,
            confidence: 0.9,
            merged_count: 1,
            recall_count: 0,
            stale: false,
          }),
        }
      );

      printEnvelope(success("memory store", {
        action: "created",
        id: result.id,
        observation: observation.slice(0, 80),
        category,
      }, [
        { command: `kit memory recall "${observation.slice(0, 40)}"`, description: "Verify the stored observation" },
      ]));
    })
).pipe(Command.withDescription("Store a new support memory observation"));

const memoryStatusCommand = Command.make("status", {}, () =>
  Effect.gen(function* () {
    const key = getTypesenseKey();
    if (!key) {
      printEnvelope(failure("memory status", "secrets daemon unavailable", "NO_KEY", "Start the secrets daemon: nohup secrets serve &", []));
      return;
    }

    const data = yield* typesenseFetch(`/collections/${MEMORY_COLLECTION}`, key);
    const facetData = yield* typesenseFetch(
      `/collections/${MEMORY_COLLECTION}/documents/search?q=*&query_by=observation&facet_by=category,write_verdict&per_page=0&exclude_fields=embedding`, key
    );

    const categories: Record<string, number> = {};
    const verdicts: Record<string, number> = {};
    for (const facet of (facetData as unknown as { facet_counts: Array<{ field_name: string; counts: Array<{ value: string; count: number }> }> }).facet_counts || []) {
      const target = facet.field_name === "category" ? categories : verdicts;
      for (const c of facet.counts) target[c.value] = c.count;
    }

    printEnvelope(success("memory status", {
      collection: data.name,
      total_observations: data.num_documents,
      categories,
      verdicts,
    }, [
      { command: "kit memory recall <query> [--semantic]", description: "Search memory" },
      { command: "kit memory store <observation> --category <cat>", description: "Store observation" },
    ]));
  })
).pipe(Command.withDescription("Memory collection stats"));

const memoryCommand = Command.make("memory", {}, () =>
  Effect.sync(() => {
    printEnvelope(success("memory", {
      description: "Support memory system (Typesense-backed, 128+ observations)",
      commands: [
        { name: "status", usage: "kit memory status" },
        { name: "recall", usage: 'kit memory recall "query" [--semantic] [--category cat]' },
        { name: "store", usage: 'kit memory store "fact" --category product-fact' },
      ],
    }, [
      { command: "kit memory status", description: "Collection health" },
    ]));
  })
).pipe(
  Command.withSubcommands([memoryStatusCommand, memoryRecallCommand, memoryStoreCommand]),
  Command.withDescription("Support memory system"),
);

const rootCommand = Command.make(CLI_NAME, {}, () =>
  Effect.sync(() => {
    const commands = [
      {
        name: "auth",
        description: "Manage Kit authentication",
        usage: "kit auth status",
      },
      {
        name: "account",
        description: "Manage Kit accounts and short aliases",
        usage: "kit account list",
      },
      {
        name: "campaign",
        description: "Campaign tracking for the active launch",
        usage: "kit campaign status",
      },
      {
        name: "defaults",
        description: "Inspect local Kit defaults",
        usage: "kit defaults broadcast",
      },
      {
        name: "shortlink",
        description: "Shortlink CRUD on course-builder sites",
        usage: "kit shortlink list",
      },
      {
        name: "resource",
        description: "Content resource operations on course-builder sites",
        usage: "kit resource get <slug> [--type cohort]",
      },
      {
        name: "site",
        description: "Manage course-builder site connections (auth, switch)",
        usage: "kit site auth status",
      },
      ...canonicalTargets.map((target) => ({
        name: target.commandSegments.join(" "),
        description: target.summary,
        usage: commandStringForOperation(target.operation),
      })),
    ];

    const aliases = aliasTargets.map((target) => ({
      name: target.commandSegments.join(" "),
      description: target.summary,
      usage: commandStringForSegments(target.commandSegments),
      alias_for: target.aliasFor,
    }));

    printEnvelope(
      success(
        "kit",
        {
          name: CLI_NAME,
          version: CLI_VERSION,
          description: "OpenAPI-generated Effect CLI wrapper around Kit API v4",
          branding: {
            mascot_name: "MAIL GOBLIN",
            mascot_mood: "nasty_af",
            creature_tagline: CREATURE_TAGLINE,
            hero_ascii_art: CREATE_CREATURE_ASCII_ART,
            kit_ascii_art: KIT_ASCII_ART,
            create_ascii_art: CREATE_ASCII_ART,
            creature_ascii_art: CREATE_CREATURE_ASCII_ART,
          },
          openapi_spec: "https://developers.kit.com/api-reference/v4.json",
          generated_operations: operations.length,
          curated_aliases: aliases.length,
          commands,
          aliases,
        },
        [
          {
            command: "kit account current",
            description: "Check which Kit account is active",
          },
          {
            command: "kit auth status",
            description: "Inspect local auth state before calling the API",
          },
          {
            command: "kit defaults broadcast",
            description:
              "Inspect the effective local defaults for broadcast drafting",
          },
          {
            command: "kit whoami",
            description: "Fetch the current Kit account via the shortcut alias",
          },
        ]
      )
    );
  })
).pipe(
  Command.withDescription(
    "OpenAPI-generated Effect CLI wrapper around Kit API v4"
  ),
  Command.withSubcommands([
    accountCommand,
    authCommand,
    campaignCommand,
    defaultsCommand,
    memoryCommand,
    resourceCommand,
    shortlinkCommand,
    siteCommand,
    ...generatedCommands,
  ])
);

const cli = Command.run(rootCommand, {
  name: CLI_NAME,
  version: CLI_VERSION,
});

cli(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer)),
  NodeRuntime.runMain as never
);
