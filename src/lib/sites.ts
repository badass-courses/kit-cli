/**
 * Multi-site configuration for course-builder powered sites.
 *
 * Each site shares the same API surface (shortlinks, resources, auth)
 * but has its own base URL, app ID, and stored credentials.
 *
 * Credentials stored via the credential store at provider "site".
 * Current site preference stored in ~/.config/kit-cli/preferences.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import {
  createDefaultCredentialStore,
  type CredentialStore,
  type StoredCredential,
} from "./auth/index";

export interface SiteDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly auth: {
    readonly deviceCodePath: string;
    readonly tokenPath: string;
    readonly userInfoPath: string;
  };
}

/**
 * Registry of known course-builder sites.
 * Add new sites here as they come online.
 */
export const KNOWN_SITES: Record<string, SiteDefinition> = {
  "ai-hero": {
    id: "ai-hero",
    displayName: "AI Hero",
    baseUrl: "https://www.aihero.dev",
    auth: {
      deviceCodePath: "/oauth/device/code",
      tokenPath: "/oauth/token",
      userInfoPath: "/oauth/userinfo",
    },
  },
  "total-typescript": {
    id: "total-typescript",
    displayName: "Total TypeScript",
    baseUrl: "https://www.totaltypescript.com",
    auth: {
      deviceCodePath: "/oauth/device/code",
      tokenPath: "/oauth/token",
      userInfoPath: "/oauth/userinfo",
    },
  },
  "epic-web": {
    id: "epic-web",
    displayName: "Epic Web",
    baseUrl: "https://www.epicweb.dev",
    auth: {
      deviceCodePath: "/oauth/device/code",
      tokenPath: "/oauth/token",
      userInfoPath: "/oauth/userinfo",
    },
  },
};

// ---------------------------------------------------------------------------
// Preferences (just the current site selection, not credentials)
// ---------------------------------------------------------------------------

const prefsPath = () =>
  process.env.KIT_PREFS_PATH ??
  join(homedir(), ".config", "kit-cli", "preferences.json");

interface Preferences {
  currentSite: string;
}

export const loadPreferences = async (): Promise<Preferences> => {
  try {
    const raw = await readFile(prefsPath(), "utf-8");
    return JSON.parse(raw) as Preferences;
  } catch {
    return { currentSite: "ai-hero" };
  }
};

export const savePreferences = async (prefs: Preferences): Promise<void> => {
  const path = prefsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(prefs, null, 2));
};

// ---------------------------------------------------------------------------
// Credential store integration
// ---------------------------------------------------------------------------

const store = createDefaultCredentialStore();

const siteCredentialKey = (siteId: string) => ({
  provider: "site" as const,
  account: siteId,
});

/**
 * Resolve the active site and its token from the credential store.
 */
export const resolveSite = async (
  siteFlag?: string,
): Promise<{ site: SiteDefinition; token?: string }> => {
  const prefs = await loadPreferences();
  const siteId = siteFlag ?? process.env.KIT_SITE ?? prefs.currentSite;

  const site = KNOWN_SITES[siteId];
  if (!site) {
    const { SiteNotFoundError } = await import("./errors");
    throw new SiteNotFoundError({
      siteId,
      available: Object.keys(KNOWN_SITES),
    });
  }

  // Read token from credential store
  const credential = await Effect.runPromise(
    store.get(siteCredentialKey(siteId)).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    ),
  );

  return { site, token: credential?.token.accessToken };
};

/**
 * Store a token for a site and set it as current.
 */
export const storeSiteToken = async (
  siteId: string,
  token: string,
): Promise<void> => {
  const credential: StoredCredential = {
    token: {
      accessToken: token,
      tokenType: "Bearer",
    },
  };

  await Effect.runPromise(
    store.set(siteCredentialKey(siteId), credential).pipe(
      Effect.catchAll(() => Effect.void),
    ),
  );

  // Update current site preference
  const prefs = await loadPreferences();
  prefs.currentSite = siteId;
  await savePreferences(prefs);
};

/**
 * Get auth status for all known sites.
 */
export const getSiteAuthStatus = async (): Promise<
  Array<{
    id: string;
    displayName: string;
    authenticated: boolean;
    current: boolean;
  }>
> => {
  const prefs = await loadPreferences();

  const results = await Promise.all(
    Object.entries(KNOWN_SITES).map(async ([id, def]) => {
      const credential = await Effect.runPromise(
        store.get(siteCredentialKey(id)).pipe(
          Effect.catchAll(() => Effect.succeed(null)),
        ),
      );
      return {
        id,
        displayName: def.displayName,
        authenticated: Boolean(credential?.token.accessToken),
        current: id === prefs.currentSite,
      };
    }),
  );

  return results;
};

/**
 * Fetch from a site's API with Bearer auth.
 */
export const siteApiFetch = async <T>(
  site: SiteDefinition,
  token: string,
  path: string,
  options?: {
    method?: string;
    body?: unknown;
  },
): Promise<{ ok: boolean; status: number; data: T }> => {
  const url = `${site.baseUrl}${path}`;
  const headers: Record<string, string> = {
    accept: "application/json",
    authorization: `Bearer ${token}`,
  };

  if (options?.body !== undefined) {
    headers["content-type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);

  return { ok: response.ok, status: response.status, data };
};

// ---------------------------------------------------------------------------
// Backward compat: loadSitesConfig / saveSitesConfig removed.
// Use resolveSite / storeSiteToken / loadPreferences / savePreferences instead.
// ---------------------------------------------------------------------------
