export type StoredOAuth = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  createdAt?: number;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  pending?: {
    state: string;
    codeVerifier?: string;
    pkce: boolean;
    redirectUri?: string;
    createdAt: number;
  };
};

export type KitAccount = {
  id: string;
  aliases?: string[];
  name?: string;
  email?: string;
  accountId?: number;
};

export type KitConfig = {
  apiKey?: string;
  oauth?: StoredOAuth;
  currentKitAccount?: string;
  accounts?: Record<string, KitAccount>;
};

export type BroadcastDefaults = {
  templateId?: number;
  templateName?: string;
  fromAddress?: string;
  subscriberFilter?: unknown[];
};

export type KitHomeConfig = {
  schemaVersion?: number;
  updatedAt?: string;
  defaultAccount?: string;
  accounts?: Record<
    string,
    {
      broadcastDefaults?: BroadcastDefaults;
    }
  >;
};

export type AuthHeaders = {
  headers: Record<string, string>;
  mode: "api-key" | "oauth";
};
