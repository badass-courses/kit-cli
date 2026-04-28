/**
 * Composite credential store.
 *
 * Resolution order:
 * 1. Environment variables (read-only, highest priority)
 * 2. Primary store (file-based, read/write)
 *
 * Writes go to primary. Reads check env first, then primary.
 */

import { Effect, Layer } from "effect";
import {
  CredentialStore,
  type CredentialStoreError,
  type CredentialKey,
  type StoredCredential,
} from "./credential-store";

export interface CompositeConfig {
  readonly envStore: CredentialStore;
  readonly primaryStore: CredentialStore;
}

export const createCompositeCredentialStore = (
  config: CompositeConfig,
): CredentialStore => ({
  get: (key: CredentialKey) =>
    Effect.flatMap(
      config.envStore.get(key),
      (envResult: StoredCredential | null) =>
        envResult
          ? Effect.succeed(envResult)
          : config.primaryStore.get(key),
    ),

  set: (key: CredentialKey, credential: StoredCredential) =>
    config.primaryStore.set(key, credential),

  delete: (key: CredentialKey) =>
    config.primaryStore.delete(key),
});

export const CompositeCredentialStoreLive = (
  config: CompositeConfig,
): Layer.Layer<CredentialStore> =>
  Layer.succeed(CredentialStore, createCompositeCredentialStore(config));
