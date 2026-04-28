/**
 * Environment variable credential store (read-only).
 *
 * Checks KIT_<PROVIDER>_AUTH_JSON and KIT_AUTH_JSON env vars.
 */

import { Effect, Layer } from "effect";
import { env as processEnv } from "node:process";
import {
  CredentialStore,
  CredentialStoreError,
  type StoredCredential,
  envVarNameForProvider,
  type CredentialKey,
} from "./credential-store";

export const createEnvCredentialStore = (
  env: Record<string, string | undefined> = processEnv,
): CredentialStore => ({
  get: (key: CredentialKey) => {
    const providerVar = envVarNameForProvider(key.provider);
    const raw = env[providerVar] ?? env.KIT_AUTH_JSON;
    if (!raw) return Effect.succeed(null);

    return Effect.try({
      try: () => {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        // Support both flat token and wrapped { token: ... } format
        if ("accessToken" in parsed) {
          return { token: parsed } as StoredCredential;
        }
        return parsed as StoredCredential;
      },
      catch: (cause) =>
        new CredentialStoreError({
          reason: "Invalid JSON in environment credentials",
          cause,
        }),
    });
  },
  set: () =>
    Effect.fail(
      new CredentialStoreError({
        reason: "Environment credential store is read-only",
      }),
    ),
  delete: () =>
    Effect.fail(
      new CredentialStoreError({
        reason: "Environment credential store is read-only",
      }),
    ),
});

export const EnvCredentialStoreLive = (
  env?: Record<string, string | undefined>,
): Layer.Layer<CredentialStore> =>
  Layer.succeed(CredentialStore, createEnvCredentialStore(env));
