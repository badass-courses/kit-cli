/**
 * Kit API authentication.
 *
 * Supports API key and OAuth modes. API keys resolve through:
 * 1. KIT_API_KEY env var (highest priority)
 * 2. Credential store (provider: "kit", account from KIT_ACCOUNT_ID or "default")
 * 3. Legacy ~/.kit/credentials.json (backward compat)
 *
 * OAuth tokens resolve through the credential store or env vars.
 */

import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import type { AuthMode } from "../generated/operations";
import { createDefaultCredentialStore } from "./auth/index";
import { loadConfig, saveConfig } from "./config";
import type { AuthHeaders, KitConfig, StoredOAuth } from "./types";

const oauthTokenUrl = "https://api.kit.com/v4/oauth/token";
const oauthAuthorizeUrl = "https://api.kit.com/v4/oauth/authorize";

const now = () => Date.now();

const credentialStore = createDefaultCredentialStore();

// ---------------------------------------------------------------------------
// API key resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a Kit API key. Priority:
 * 1. KIT_API_KEY env var
 * 2. Credential store (provider: "kit")
 * 3. Legacy ~/.kit/credentials.json
 */
const resolveApiKey = async (): Promise<string | undefined> => {
  // 1. Env var
  if (process.env.KIT_API_KEY) {
    return process.env.KIT_API_KEY;
  }

  // 2. Credential store
  const accountId = process.env.KIT_ACCOUNT_ID ?? "default";
  const stored = await Effect.runPromise(
    credentialStore.get({ provider: "kit", account: accountId }).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    ),
  );
  if (stored?.token.accessToken) {
    return stored.token.accessToken;
  }

  // 3. Legacy ~/.kit/credentials.json
  try {
    const legacyPath = join(homedir(), ".kit", "credentials.json");
    const raw = await readFile(legacyPath, "utf-8");
    const legacy = JSON.parse(raw) as {
      accounts?: Array<{ id?: string; apiKey?: string }>;
    };
    const account = legacy.accounts?.find(
      (a) => a.id === (process.env.KIT_ACCOUNT_ID ?? "totaltypescript-ai-hero"),
    );
    if (account?.apiKey) return account.apiKey;
    // Fall back to first account
    const first = legacy.accounts?.[0];
    if (first?.apiKey) return first.apiKey;
  } catch {
    // No legacy config
  }

  return undefined;
};

// ---------------------------------------------------------------------------
// OAuth resolution (unchanged, uses config.ts)
// ---------------------------------------------------------------------------

const envOAuth = (): StoredOAuth => ({
  accessToken: process.env.KIT_ACCESS_TOKEN,
  refreshToken: process.env.KIT_REFRESH_TOKEN,
  clientId: process.env.KIT_CLIENT_ID,
  clientSecret: process.env.KIT_CLIENT_SECRET,
  redirectUri: process.env.KIT_REDIRECT_URI,
});

const mergeOAuth = (
  base: StoredOAuth | undefined,
  override: StoredOAuth,
): StoredOAuth => ({
  ...base,
  ...Object.fromEntries(
    Object.entries(override).filter(([, v]) => v !== undefined),
  ),
});

const codeChallengeFor = (codeVerifier: string) =>
  createHash("sha256").update(codeVerifier).digest("base64url");

const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

const isOAuthExpired = (oauth: StoredOAuth | undefined) => {
  if (!(oauth?.accessToken && oauth.expiresAt)) return false;
  return oauth.expiresAt <= now() + 30_000;
};

const normalizeTokenResponse = (
  oauth: StoredOAuth | undefined,
  response: Record<string, unknown>,
): StoredOAuth => ({
  ...oauth,
  accessToken:
    typeof response.access_token === "string"
      ? response.access_token
      : oauth?.accessToken,
  refreshToken:
    typeof response.refresh_token === "string"
      ? response.refresh_token
      : oauth?.refreshToken,
  tokenType:
    typeof response.token_type === "string" ? response.token_type : "Bearer",
  scope: typeof response.scope === "string" ? response.scope : oauth?.scope,
  createdAt:
    typeof response.created_at === "number"
      ? response.created_at
      : oauth?.createdAt,
  expiresAt:
    typeof response.expires_in === "number"
      ? now() + response.expires_in * 1000
      : oauth?.expiresAt,
});

const tokenRequest = async (payload: Record<string, unknown>) => {
  const response = await fetch(oauthTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const errors = Array.isArray(data.errors)
      ? data.errors.join("; ")
      : `OAuth token request failed with ${response.status}`;
    throw new Error(errors);
  }

  return data;
};

// ---------------------------------------------------------------------------
// Public API (used by index.ts and execute.ts)
// ---------------------------------------------------------------------------

export const getMergedConfig = async () => {
  const config = await loadConfig();
  // Merge env OAuth into stored config
  config.oauth = mergeOAuth(config.oauth, envOAuth());
  // Resolve API key through the credential store chain
  const apiKey = await resolveApiKey();
  if (apiKey) config.apiKey = apiKey;
  return config;
};

export const setApiKey = async (apiKey: string) => {
  // Store in credential store
  const accountId = process.env.KIT_ACCOUNT_ID ?? "default";
  await Effect.runPromise(
    credentialStore
      .set(
        { provider: "kit", account: accountId },
        { token: { accessToken: apiKey, tokenType: "api-key" } },
      )
      .pipe(Effect.catchAll(() => Effect.void)),
  );

  // Also store in legacy config for backward compat
  const config = await loadConfig();
  config.apiKey = apiKey;
  await saveConfig(config);
  return config;
};

export const clearStoredAuth = async (target: "all" | "api-key" | "oauth") => {
  const config = await loadConfig();

  if (target === "all" || target === "api-key") {
    delete config.apiKey;
    const accountId = process.env.KIT_ACCOUNT_ID ?? "default";
    await Effect.runPromise(
      credentialStore
        .delete({ provider: "kit", account: accountId })
        .pipe(Effect.catchAll(() => Effect.void)),
    );
  }

  if (target === "all" || target === "oauth") {
    delete config.oauth;
  }

  await saveConfig(config);
  return config;
};

export const buildAuthorizeUrl = async (input: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  tenantName?: string;
  pkce: boolean;
}) => {
  const config = await loadConfig();
  const state = input.state ?? randomToken(24);
  const codeVerifier = input.pkce ? randomToken(48) : undefined;

  const params = new URLSearchParams({
    client_id: input.clientId,
    response_type: "code",
    redirect_uri: input.redirectUri,
    state,
  });

  if (input.scope) params.set("scope", input.scope);
  if (input.tenantName) params.set("tenant_name", input.tenantName);

  if (codeVerifier) {
    params.set("code_challenge", codeChallengeFor(codeVerifier));
    params.set("code_challenge_method", "S256");
  }

  config.oauth = {
    ...config.oauth,
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    pending: {
      state,
      codeVerifier,
      pkce: input.pkce,
      redirectUri: input.redirectUri,
      createdAt: now(),
    },
  };

  await saveConfig(config);

  return {
    url: `${oauthAuthorizeUrl}?${params.toString()}`,
    state,
    pkce: input.pkce,
    hasCodeVerifier: Boolean(codeVerifier),
  };
};

export const exchangeOAuthCode = async (input: {
  code: string;
  state?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}) => {
  const config = await loadConfig();
  const pending = config.oauth?.pending;
  const clientId = input.clientId ?? config.oauth?.clientId;
  const redirectUri =
    input.redirectUri ?? pending?.redirectUri ?? config.oauth?.redirectUri;

  if (!clientId)
    throw new Error(
      "Missing client_id. Pass --client-id or configure OAuth first.",
    );
  if (!redirectUri)
    throw new Error(
      "Missing redirect_uri. Pass --redirect-uri or create an authorize URL first.",
    );
  if (input.state && pending?.state && input.state !== pending.state)
    throw new Error("Returned state does not match the pending OAuth flow.");

  const payload: Record<string, unknown> = {
    client_id: clientId,
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: redirectUri,
  };

  if (pending?.pkce && pending.codeVerifier) {
    payload.code_verifier = pending.codeVerifier;
  } else if (input.clientSecret ?? config.oauth?.clientSecret) {
    payload.client_secret = input.clientSecret ?? config.oauth?.clientSecret;
  }

  const tokenData = await tokenRequest(payload);
  config.oauth = normalizeTokenResponse(config.oauth, tokenData);
  config.oauth.clientId = clientId;
  config.oauth.clientSecret = input.clientSecret ?? config.oauth.clientSecret;
  config.oauth.redirectUri = redirectUri;
  delete config.oauth.pending;
  await saveConfig(config);

  return config;
};

export const refreshOAuthToken = async () => {
  const config = await loadConfig();
  const oauth = config.oauth;

  if (!(oauth?.refreshToken && oauth.clientId))
    throw new Error(
      "Missing refresh_token or client_id. Run the OAuth exchange flow first.",
    );

  const tokenData = await tokenRequest({
    client_id: oauth.clientId,
    grant_type: "refresh_token",
    refresh_token: oauth.refreshToken,
  });

  config.oauth = normalizeTokenResponse(oauth, tokenData);
  await saveConfig(config);
  return config;
};

export const resolveAuthHeaders = async (input: {
  mode: AuthMode;
  supportsApiKey: boolean;
  supportsOAuth: boolean;
}): Promise<AuthHeaders> => {
  const config = await getMergedConfig();
  const apiKey = config.apiKey;
  const oauth = config.oauth;

  if (input.mode === "api-key") {
    if (!input.supportsApiKey)
      throw new Error(
        "This endpoint does not support API key authentication.",
      );
    if (!apiKey)
      throw new Error(
        "No Kit API key configured. Set KIT_API_KEY or run `kit auth api set --api-key <key>`.",
      );
    return { mode: "api-key", headers: { "X-Kit-Api-Key": apiKey } };
  }

  if (input.mode === "oauth") {
    if (!input.supportsOAuth)
      throw new Error(
        "This endpoint does not support OAuth authentication.",
      );
    if (!oauth?.accessToken)
      throw new Error(
        "No OAuth access token configured. Run the OAuth authorize/exchange flow or set KIT_ACCESS_TOKEN.",
      );
    if (isOAuthExpired(oauth) && oauth.refreshToken && oauth.clientId)
      await refreshOAuthToken();
    const refreshed = await getMergedConfig();
    if (!refreshed.oauth?.accessToken)
      throw new Error("OAuth token refresh did not produce an access token.");
    return {
      mode: "oauth",
      headers: { Authorization: `Bearer ${refreshed.oauth.accessToken}` },
    };
  }

  // Auto mode
  if (input.supportsApiKey && apiKey) {
    return { mode: "api-key", headers: { "X-Kit-Api-Key": apiKey } };
  }

  if (input.supportsOAuth && oauth?.accessToken) {
    if (isOAuthExpired(oauth) && oauth.refreshToken && oauth.clientId)
      await refreshOAuthToken();
    const refreshed = await getMergedConfig();
    if (!refreshed.oauth?.accessToken)
      throw new Error("OAuth token refresh did not produce an access token.");
    return {
      mode: "oauth",
      headers: { Authorization: `Bearer ${refreshed.oauth.accessToken}` },
    };
  }

  if (input.supportsApiKey && input.supportsOAuth)
    throw new Error(
      "No Kit auth configured. Set KIT_API_KEY, run `kit auth api set --api-key <key>`, or complete the OAuth authorize/exchange flow.",
    );
  if (input.supportsApiKey)
    throw new Error(
      "No Kit API key configured. Set KIT_API_KEY or run `kit auth api set --api-key <key>`.",
    );
  if (input.supportsOAuth)
    throw new Error(
      "No OAuth access token configured. Run the OAuth authorize/exchange flow or set KIT_ACCESS_TOKEN.",
    );

  throw new Error("This endpoint does not support the selected auth mode.");
};
