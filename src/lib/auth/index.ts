/**
 * Credential store - unified auth for all kit-cli providers.
 *
 * Resolution order: env vars -> file store (~/.config/kit-cli/credentials.json)
 *
 * Providers:
 *   kit:<account-id>    - Kit API keys (e.g. kit:totaltypescript-ai-hero)
 *   site:<site-id>      - Course-builder site tokens (e.g. site:ai-hero)
 *   stripe:<account>    - Stripe API keys
 *   analytics:<account> - Google Analytics OAuth tokens
 */

export {
  type AuthToken,
  type CredentialKey,
  CredentialStore,
  type CredentialStoreError,
  type StoredCredential,
  formatCredentialId,
  isTokenExpiring,
  toAuthorizationHeader,
} from "./credential-store";

export { createEnvCredentialStore } from "./env-store";
export { createFileCredentialStore } from "./file-store";
export {
  createCompositeCredentialStore,
  type CompositeConfig,
} from "./composite-store";

import { createEnvCredentialStore } from "./env-store";
import { createFileCredentialStore } from "./file-store";
import { createCompositeCredentialStore } from "./composite-store";
import type { CredentialStore } from "./credential-store";

/**
 * Default credential store for kit-cli.
 * Env vars override file store. File store at ~/.config/kit-cli/credentials.json.
 */
export const createDefaultCredentialStore = (): CredentialStore =>
  createCompositeCredentialStore({
    envStore: createEnvCredentialStore(),
    primaryStore: createFileCredentialStore(),
  });
