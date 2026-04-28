import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { BroadcastDefaults, KitConfig, KitHomeConfig } from "./types";

const defaultConfigPath = () =>
  join(homedir(), ".config", "kit-cli", "config.json");
const defaultKitHomeConfigPath = () => join(homedir(), ".kit", "config.json");

export const defaultConfig = (): KitConfig => ({
  oauth: {},
});

export const getConfigPath = () =>
  process.env.KIT_CONFIG_PATH ?? defaultConfigPath();
export const getKitHomeConfigPath = () =>
  process.env.KIT_HOME_CONFIG_PATH ?? defaultKitHomeConfigPath();

export const loadConfig = async (): Promise<KitConfig> => {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    return {
      ...defaultConfig(),
      ...(JSON.parse(raw) as KitConfig),
    };
  } catch {
    return defaultConfig();
  }
};

export const loadKitHomeConfig = async (): Promise<KitHomeConfig> => {
  try {
    const raw = await readFile(getKitHomeConfigPath(), "utf8");
    return JSON.parse(raw) as KitHomeConfig;
  } catch {
    return {};
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeBroadcastDefaults = (
  body: unknown,
  defaults?: BroadcastDefaults
) => {
  if (!(defaults && isRecord(body))) {
    return body;
  }

  const subscriberFilter = body.subscriber_filter;
  const mergedSubscriberFilter =
    subscriberFilter === undefined ||
    (Array.isArray(subscriberFilter) && subscriberFilter.length === 0)
      ? defaults.subscriberFilter
      : subscriberFilter;

  const merged: Record<string, unknown> = {
    ...body,
  };

  if (
    merged.email_template_id === undefined &&
    defaults.templateId !== undefined
  ) {
    merged.email_template_id = defaults.templateId;
  }

  if (
    merged.email_address === undefined &&
    defaults.fromAddress !== undefined
  ) {
    merged.email_address = defaults.fromAddress;
  }

  if (mergedSubscriberFilter !== undefined) {
    merged.subscriber_filter = mergedSubscriberFilter;
  }

  return merged;
};

export const resolveBroadcastDefaults = async (
  accountId = process.env.KIT_ACCOUNT_ID
) => {
  const config = await loadKitHomeConfig();
  const selectedAccountId = accountId ?? config.defaultAccount;
  if (!selectedAccountId) {
    return undefined;
  }

  return config.accounts?.[selectedAccountId]?.broadcastDefaults satisfies
    | BroadcastDefaults
    | undefined;
};

export const getEffectiveBroadcastDefaults = async (
  accountId = process.env.KIT_ACCOUNT_ID
) => {
  const config = await loadKitHomeConfig();
  const selectedAccountId = accountId ?? config.defaultAccount;

  return {
    config_path: getKitHomeConfigPath(),
    selected_account_id: selectedAccountId ?? null,
    broadcast_defaults: selectedAccountId
      ? (config.accounts?.[selectedAccountId]?.broadcastDefaults ?? null)
      : null,
  };
};

export const saveConfig = async (config: KitConfig) => {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
};
