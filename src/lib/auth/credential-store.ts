/**
 * Credential store service.
 *
 * Ported from @stats/auth. Provides a unified interface for storing and
 * retrieving credentials across providers (Kit API keys, site tokens,
 * Stripe keys, etc.).
 *
 * Key format: provider:account (e.g. "kit:totaltypescript-ai-hero", "site:ai-hero")
 */

import { Context, Effect, Schema } from "effect";

export interface CredentialKey {
  readonly provider: string;
  readonly account: string;
}

export class CredentialStoreError extends Error {
  readonly reason: string;
  override cause?: unknown;

  constructor({ reason, cause }: { reason: string; cause?: unknown }) {
    super(reason);
    this.name = "CredentialStoreError";
    this.reason = reason;
    this.cause = cause;
  }
}

export const AuthTokenSchema = Schema.Struct({
  accessToken: Schema.String,
  refreshToken: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.Number),
  tokenType: Schema.optional(Schema.String),
});

export type AuthToken = Schema.Schema.Type<typeof AuthTokenSchema>;

export const StoredCredentialSchema = Schema.Struct({
  token: AuthTokenSchema,
  profile: Schema.optional(
    Schema.Struct({
      propertyId: Schema.optional(Schema.String),
    }),
  ),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
});

export type StoredCredential = Schema.Schema.Type<typeof StoredCredentialSchema>;

export interface CredentialStore {
  readonly get: (
    key: CredentialKey,
  ) => Effect.Effect<StoredCredential | null, CredentialStoreError>;
  readonly set: (
    key: CredentialKey,
    credential: StoredCredential,
  ) => Effect.Effect<void, CredentialStoreError>;
  readonly delete: (
    key: CredentialKey,
  ) => Effect.Effect<void, CredentialStoreError>;
}

export const CredentialStore =
  Context.GenericTag<CredentialStore>("@kit-cli/CredentialStore");

export const formatCredentialId = (key: CredentialKey): string =>
  `${key.provider}:${key.account}`;

export const envVarNameForProvider = (provider: string): string =>
  `KIT_${provider.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_AUTH_JSON`;

export const isTokenExpiring = (
  token: AuthToken,
  options?: { now?: number; bufferMs?: number },
): boolean => {
  if (!token.expiresAt) return false;
  const now = options?.now ?? Date.now();
  const bufferMs = options?.bufferMs ?? 300_000;
  return token.expiresAt - now <= bufferMs;
};

export const toAuthorizationHeader = (token: AuthToken): string =>
  `${token.tokenType ?? "Bearer"} ${token.accessToken}`;
