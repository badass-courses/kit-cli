import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { BroadcastDefaults, KitConfig, KitHomeConfig } from "./types";

const defaultConfigPath = () =>
  join(homedir(), ".config", "kit-cli", "config.json");
const defaultProjectConfigPath = () => join(process.cwd(), ".kit", "config.json");
const defaultKitHomeConfigPath = () => join(homedir(), ".kit", "config.json");

export const defaultConfig = (): KitConfig => ({
  oauth: {},
});

export const getConfigPath = () =>
  process.env.KIT_CONFIG_PATH ?? defaultConfigPath();
export const getProjectConfigPath = () =>
  process.env.KIT_PROJECT_CONFIG_PATH ?? defaultProjectConfigPath();
export const getKitHomeConfigPath = () =>
  process.env.KIT_HOME_CONFIG_PATH ?? defaultKitHomeConfigPath();

const readConfigFile = async (path: string): Promise<Partial<KitConfig>> => {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as Partial<KitConfig>;
  } catch {
    return {};
  }
};

const mergeConfig = (...configs: Array<Partial<KitConfig>>): KitConfig => {
  const merged: KitConfig = defaultConfig();

  for (const config of configs) {
    Object.assign(merged, config);
    if (config.oauth) merged.oauth = { ...merged.oauth, ...config.oauth };
    if (config.accounts) {
      merged.accounts = {
        ...(merged.accounts ?? {}),
        ...config.accounts,
      };
    }
  }

  return merged;
};

export const loadConfig = async (): Promise<KitConfig> => {
  const userConfig = await readConfigFile(getConfigPath());
  const projectConfig = await readConfigFile(getProjectConfigPath());
  return mergeConfig(userConfig, projectConfig);
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

export const saveProjectConfig = async (config: Pick<KitConfig, "currentKitAccount">) => {
  const configPath = getProjectConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2));
};

export const resolveKitAccountId = (
  config: KitConfig,
  accountOrAlias?: string
): string | undefined => {
  const requested = accountOrAlias ?? process.env.KIT_ACCOUNT_ID ?? config.currentKitAccount;
  if (!requested) return undefined;

  if (config.accounts?.[requested]) return requested;

  const match = Object.entries(config.accounts ?? {}).find(([, account]) =>
    account.aliases?.includes(requested)
  );

  return match?.[0] ?? requested;
};

export const setCurrentKitAccount = async (accountOrAlias: string) => {
  const config = await loadConfig();
  const resolved = resolveKitAccountId(config, accountOrAlias) ?? accountOrAlias;
  config.currentKitAccount = resolved;
  await saveConfig(config);
  return { config, resolved };
};

export const upsertKitAccount = async (account: {
  id: string;
  aliases?: string[];
  name?: string;
  email?: string;
  accountId?: number;
}) => {
  const config = await loadConfig();
  config.accounts = config.accounts ?? {};
  config.accounts[account.id] = {
    ...config.accounts[account.id],
    ...account,
    aliases: Array.from(new Set(account.aliases ?? config.accounts[account.id]?.aliases ?? [])),
  };
  if (!config.currentKitAccount) config.currentKitAccount = account.id;
  await saveConfig(config);
  return config;
};
