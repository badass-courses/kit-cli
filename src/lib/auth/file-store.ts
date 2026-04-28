/**
 * JSON file credential store.
 *
 * Stores credentials in a plain JSON file at ~/.config/kit-cli/credentials.json.
 * For simplicity, no encryption (unlike @stats/auth's AES-256-GCM store).
 * File permissions set to 0600.
 *
 * Can be upgraded to encrypted storage later by swapping this implementation.
 */

import { Effect, Layer } from "effect";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  CredentialStore,
  CredentialStoreError,
  formatCredentialId,
  type CredentialKey,
  type StoredCredential,
} from "./credential-store";

const defaultPath = () =>
  process.env.KIT_CREDENTIALS_PATH ??
  join(homedir(), ".config", "kit-cli", "credentials.json");

const readRecord = (
  filePath: string,
): Effect.Effect<Record<string, unknown>, CredentialStoreError> =>
  Effect.catchAll(
    Effect.tryPromise({
      try: () => readFile(filePath, "utf-8").then((raw) => JSON.parse(raw) as Record<string, unknown>),
      catch: (cause) => cause,
    }),
    (cause) => {
      if (cause instanceof Error && "code" in cause && (cause as NodeJS.ErrnoException).code === "ENOENT") {
        return Effect.succeed({});
      }
      return Effect.fail(
        new CredentialStoreError({ reason: "Failed to read credential file", cause }),
      );
    },
  );

const writeRecord = (
  filePath: string,
  record: Record<string, unknown>,
): Effect.Effect<void, CredentialStoreError> =>
  Effect.tryPromise({
    try: async () => {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(record, null, 2), "utf-8");
      await chmod(filePath, 0o600);
    },
    catch: (cause) =>
      new CredentialStoreError({ reason: "Failed to write credential file", cause }),
  });

export const createFileCredentialStore = (
  filePath = defaultPath(),
): CredentialStore => ({
  get: (key: CredentialKey) =>
    Effect.map(readRecord(filePath), (record) => {
      const stored = record[formatCredentialId(key)];
      if (!stored) return null;
      return stored as StoredCredential;
    }),

  set: (key: CredentialKey, credential: StoredCredential) =>
    Effect.flatMap(readRecord(filePath), (record) => {
      record[formatCredentialId(key)] = credential;
      return writeRecord(filePath, record);
    }),

  delete: (key: CredentialKey) =>
    Effect.flatMap(readRecord(filePath), (record) => {
      delete record[formatCredentialId(key)];
      return writeRecord(filePath, record);
    }),
});

export const FileCredentialStoreLive = (
  filePath?: string,
): Layer.Layer<CredentialStore> =>
  Layer.succeed(CredentialStore, createFileCredentialStore(filePath));
