import { readFile } from "node:fs/promises";
import { Option } from "effect";
import type { AuthMode, GeneratedOperation } from "../generated/operations";
import { resolveAuthHeaders } from "./auth";
import { buildSubscriberFilterFromOptions } from "./broadcast-filters";
import { mergeBroadcastDefaults, resolveBroadcastDefaults } from "./config";
import { contextSafeResult, type Envelope, failure, type NextAction, success } from "./response";

const baseUrl = "https://api.kit.com";

const optionValue = <T>(value: T | Option.Option<T> | undefined): T | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return Option.isOption(value) ? (Option.isSome(value) ? value.value : undefined) : value;
};

const parseScalar = (value: string, type: string) => {
  if (type === "boolean") {
    return value === "true";
  }

  if (type === "number" || type === "integer") {
    return Number(value);
  }

  return value;
};

const parseJson = (value: string) => JSON.parse(value) as unknown;

const isBroadcastCreate = (operation: GeneratedOperation) => operation.id === "post__v4_broadcasts";

const isBroadcastUpdate = (operation: GeneratedOperation) =>
  operation.id === "put__v4_broadcasts_id_";

const isBroadcastMutation = (operation: GeneratedOperation) =>
  isBroadcastCreate(operation) || isBroadcastUpdate(operation);

const isSequenceEmailCreate = (operation: GeneratedOperation) =>
  operation.id === "post__v4_sequences_sequence_id_emails";

const withBroadcastDefaults = async (operation: GeneratedOperation, body: unknown) => {
  if (!isBroadcastMutation(operation)) {
    return body;
  }

  return mergeBroadcastDefaults(body, await resolveBroadcastDefaults());
};

/**
 * Fetch the current broadcast state for read-then-merge updates.
 * Returns the broadcast object from GET /v4/broadcasts/{id}.
 */
export const fetchBroadcast = async (
  broadcastId: string,
  authHeaders: Record<string, string>,
): Promise<Record<string, unknown>> => {
  const url = `${baseUrl}/v4/broadcasts/${encodeURIComponent(broadcastId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", ...authHeaders },
  });

  if (!response.ok) {
    const err = new Error(`Failed to fetch broadcast ${broadcastId}: HTTP ${response.status}`);
    err.name = "FetchError";
    throw err;
  }

  const data = (await response.json()) as Record<string, unknown>;
  const broadcast = (data.broadcast ?? data) as Record<string, unknown>;
  return broadcast;
};

/**
 * Merge user-supplied fields into the existing broadcast state.
 * Only the fields present in userBody override the existing values.
 * This prevents subscriber_filter, send_at, etc. from being silently reset.
 */
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

const mergeWithExistingBroadcast = (
  existing: Record<string, unknown>,
  userBody: Record<string, unknown>,
): Record<string, unknown> => {
  // Start with a clean subset of existing fields that the Kit API accepts on PUT.
  // We only carry forward fields that are safe to round-trip.
  const carriedFields: Record<string, unknown> = {};
  const safeKeys = [
    "content",
    "description",
    "email_address",
    "email_template_id",
    "preview_text",
    "public",
    "published_at",
    "send_at",
    "subject",
    "thumbnail_alt",
    "thumbnail_url",
  ];

  for (const key of safeKeys) {
    if (existing[key] !== undefined && existing[key] !== null) {
      carriedFields[key] = existing[key];
    }
  }

  if (
    existing.subscriber_filter !== undefined &&
    existing.subscriber_filter !== null &&
    isSupportedBroadcastFilter(existing.subscriber_filter)
  ) {
    carriedFields.subscriber_filter = existing.subscriber_filter;
  }

  // Carry email_template.id as email_template_id if not already set
  if (carriedFields.email_template_id === undefined && existing.email_template) {
    const template = existing.email_template as Record<string, unknown>;
    if (template.id !== undefined) {
      carriedFields.email_template_id = template.id;
    }
  }

  // User fields override everything
  return { ...carriedFields, ...userBody };
};

/** Build the raw request body without applying broadcast config defaults. */
const buildBodyRaw = async (_operation: GeneratedOperation, options: Record<string, unknown>) => {
  const body = optionValue(options.body as Option.Option<string> | undefined);
  const bodyFile = optionValue(options.bodyFile as Option.Option<string> | undefined);

  if (!(body || bodyFile)) {
    return undefined;
  }

  if (bodyFile) {
    return parseJson(await readFile(bodyFile, "utf8"));
  }

  return body ? parseJson(body) : undefined;
};

const mergeStructuredBroadcastOptions = async (body: unknown, options: Record<string, unknown>) => {
  const subscriberFilter = await buildSubscriberFilterFromOptions(options);
  if (subscriberFilter === undefined) {
    return body;
  }

  if (body !== undefined && (typeof body !== "object" || body === null)) {
    throw new Error("Broadcast body must be a JSON object when using filter flags.");
  }

  return {
    ...(body as Record<string, unknown> | undefined),
    subscriber_filter: subscriberFilter,
  };
};

const buildBody = async (operation: GeneratedOperation, options: Record<string, unknown>) => {
  if (!operation.requestBody) {
    return undefined;
  }

  const body = optionValue(options.body as Option.Option<string> | undefined);
  const bodyFile = optionValue(options.bodyFile as Option.Option<string> | undefined);
  const structuredBody = await mergeStructuredBroadcastOptions(
    bodyFile ? parseJson(await readFile(bodyFile, "utf8")) : body ? parseJson(body) : undefined,
    options,
  );

  if (structuredBody === undefined) {
    if (operation.requestBody.required) {
      throw new Error(
        "This operation requires a request body. Pass --body '<json>' or --body-file <path>.",
      );
    }

    return undefined;
  }

  return withBroadcastDefaults(operation, structuredBody);
};

const buildUrl = (
  operation: GeneratedOperation,
  args: Record<string, string>,
  options: Record<string, unknown>,
) => {
  let resolvedPath = operation.path;

  for (const parameter of operation.pathParams) {
    const value = args[parameter.cliName];
    if (!value) {
      throw new Error(`Missing required path argument: ${parameter.name}`);
    }

    resolvedPath = resolvedPath.replace(`{${parameter.name}}`, encodeURIComponent(value));
  }

  const url = new URL(`${baseUrl}${resolvedPath}`);

  for (const parameter of operation.queryParams) {
    const rawValue = optionValue(options[parameter.cliName] as Option.Option<string> | undefined);
    if (rawValue === undefined) {
      continue;
    }

    url.searchParams.set(parameter.name, String(parseScalar(rawValue, parameter.type)));
  }

  return url;
};

const buildCommandString = (
  operation: GeneratedOperation,
  args: Record<string, string>,
  options: Record<string, unknown>,
  commandSegments = operation.commandSegments,
) => {
  const parts = ["kit", ...commandSegments];

  for (const parameter of operation.pathParams) {
    const value = args[parameter.cliName];
    if (value) {
      parts.push(value);
    }
  }

  for (const parameter of operation.queryParams) {
    const rawValue = optionValue(options[parameter.cliName] as Option.Option<string> | undefined);
    if (rawValue !== undefined) {
      parts.push(`--${parameter.name}`);
      parts.push(String(rawValue));
    }
  }

  const body = optionValue(options.body as Option.Option<string> | undefined);
  const bodyFile = optionValue(options.bodyFile as Option.Option<string> | undefined);
  const auth = options.auth;

  if (auth && auth !== "auto") {
    parts.push("--auth", String(auth));
  }

  if (body) {
    parts.push("--body", body);
  }

  if (bodyFile) {
    parts.push("--body-file", bodyFile);
  }

  return parts.join(" ");
};

const nextActionsFor = (
  operation: GeneratedOperation,
  command: string,
  data: Record<string, unknown>,
): NextAction[] => {
  const actions: NextAction[] = [
    {
      command,
      description: "Repeat this Kit API request",
    },
    {
      command: "kit auth status",
      description: "Inspect the active auth configuration",
    },
  ];

  const pagination = data.pagination;
  if (pagination && typeof pagination === "object" && pagination !== null) {
    const typedPagination = pagination as Record<string, unknown>;

    if (typeof typedPagination.end_cursor === "string") {
      actions.push({
        command: `${command} --after <cursor>`,
        description: "Fetch the next page of results",
        params: {
          cursor: {
            value: typedPagination.end_cursor,
            description: "Cursor returned by the previous page",
            required: true,
          },
        },
      });
    }

    if (typeof typedPagination.start_cursor === "string") {
      actions.push({
        command: `${command} --before <cursor>`,
        description: "Fetch the previous page of results",
        params: {
          cursor: {
            value: typedPagination.start_cursor,
            description: "Cursor returned by the previous page",
            required: true,
          },
        },
      });
    }
  }

  if (isSequenceEmailCreate(operation)) {
    const email = data.email as Record<string, unknown> | undefined;
    const sequenceId = email?.sequence_id;
    const emailId = email?.id;

    if (sequenceId !== undefined) {
      actions.push({
        command: `kit sequences emails list ${sequenceId}`,
        description: "List emails in this sequence",
      });
    }

    if (sequenceId !== undefined && emailId !== undefined) {
      actions.push({
        command: `kit sequences emails get ${sequenceId} ${emailId}`,
        description: "Read back the created sequence email",
      });
      actions.push({
        command: `kit sequences emails update ${sequenceId} ${emailId} --body '{"published":false}'`,
        description: "Keep this sequence email as a draft",
      });
    }
  }

  if (operation.docsUrl) {
    actions.push({
      command: `open ${operation.docsUrl}`,
      description: "Open the matching Kit developer docs page",
    });
  }

  return actions;
};

const extractMessage = (payload: unknown, fallback: string) => {
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as Record<string, unknown>).errors)
  ) {
    return ((payload as Record<string, unknown>).errors as unknown[])
      .map((entry) => String(entry))
      .join("; ");
  }

  return fallback;
};

export const executeOperation = async (
  operation: GeneratedOperation,
  rawArgs: Record<string, string>,
  rawOptions: Record<string, unknown>,
  commandSegments = operation.commandSegments,
): Promise<Envelope> => {
  const authMode = (rawOptions.auth as AuthMode | undefined) ?? "auto";
  const command = buildCommandString(operation, rawArgs, rawOptions, commandSegments);

  try {
    const url = buildUrl(operation, rawArgs, rawOptions);
    const auth = await resolveAuthHeaders({
      mode: authMode,
      supportsApiKey: operation.supportsApiKey,
      supportsOAuth: operation.supportsOAuth,
    });
    let body: unknown;

    // Read-then-merge: for broadcast updates, fetch existing state first,
    // merge user fields on top, THEN apply config defaults for any remaining gaps.
    // This prevents subscriber_filter and other fields from being silently reset.
    if (isBroadcastUpdate(operation)) {
      // Get the raw user body WITHOUT config defaults applied yet
      const rawUserBody = await mergeStructuredBroadcastOptions(
        await buildBodyRaw(operation, rawOptions),
        rawOptions,
      );
      if (rawUserBody !== undefined && typeof rawUserBody === "object") {
        const broadcastId = rawArgs.id;
        if (broadcastId) {
          const existing = await fetchBroadcast(broadcastId, auth.headers);
          // Existing state as base, user fields override
          body = mergeWithExistingBroadcast(existing, rawUserBody as Record<string, unknown>);
        } else {
          body = await withBroadcastDefaults(operation, rawUserBody);
        }
      } else {
        body = rawUserBody;
      }
    } else {
      body = await buildBody(operation, rawOptions);
    }

    const headers: Record<string, string> = {
      accept: "application/json",
      ...auth.headers,
    };

    if (body !== undefined) {
      headers["content-type"] = operation.requestBody?.contentTypes[0] ?? "application/json";
    }

    const response = await fetch(url, {
      method: operation.method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as unknown) : {};

    if (!response.ok) {
      return failure(
        command,
        extractMessage(parsed, `Kit API request failed with status ${response.status}.`),
        `HTTP_${response.status}`,
        "Check your auth credentials, request body, and query parameters against the Kit docs for this endpoint.",
        [
          {
            command: "kit auth status",
            description: "Inspect your stored auth credentials",
          },
          {
            command: `open ${operation.docsUrl}`,
            description: "Open the endpoint documentation",
          },
        ],
      );
    }

    const contextSafe = await contextSafeResult(parsed);
    return success(
      command,
      {
        operation: {
          id: operation.id,
          summary: operation.summary,
          method: operation.method,
          path: operation.path,
          auth_mode: auth.mode,
          docs_url: operation.docsUrl,
        },
        ...(operation.id === "get__v4_email_templates"
          ? {
              note: "Use returned email_templates[].id as API email_template_id. Kit editor URL template IDs may differ and are not mapped by this API response.",
            }
          : {}),
        ...(isSequenceEmailCreate(operation)
          ? {
              note: "Sequence emails are created as drafts by default. Keep published false until the sequence is intentionally ready to send.",
            }
          : {}),
        response: contextSafe,
      },
      nextActionsFor(operation, command, contextSafe),
    );
  } catch (error) {
    return failure(
      command,
      error instanceof Error ? error.message : String(error),
      "REQUEST_FAILED",
      "Check that your auth is configured, your JSON body is valid, and your local config matches Kit OAuth requirements.",
      [
        {
          command: "kit auth status",
          description: "Inspect the current auth configuration",
        },
        {
          command: `open ${operation.docsUrl}`,
          description: "Open the matching Kit documentation",
        },
      ],
    );
  }
};
