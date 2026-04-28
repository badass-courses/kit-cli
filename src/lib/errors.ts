/**
 * Domain errors for kit-cli.
 *
 * All errors are tagged for catchTag/catchTags recovery.
 * Yieldable in Effect.gen (no Effect.fail needed).
 */

import { Data } from "effect";

export class SiteNotFoundError extends Data.TaggedError("SiteNotFoundError")<{
  readonly siteId: string;
  readonly available: readonly string[];
}> {
  override get message() {
    return `Unknown site "${this.siteId}". Available: ${this.available.join(", ")}`;
  }
}

export class AuthRequiredError extends Data.TaggedError("AuthRequiredError")<{
  readonly siteId: string;
}> {
  override get message() {
    return `Not authenticated to ${this.siteId}. Run: kit site auth login --site ${this.siteId}`;
  }
}

export class FetchError extends Data.TaggedError("FetchError")<{
  readonly url: string;
  readonly status: number;
  readonly body?: string;
}> {
  override get message() {
    return `HTTP ${this.status} from ${this.url}`;
  }
}

export class DocSectionNotFoundError extends Data.TaggedError("DocSectionNotFoundError")<{
  readonly section: string;
}> {
  override get message() {
    return `Section "${this.section}" not found in the Google Doc.`;
  }
}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly reason: string;
  readonly path?: string;
}> {
  override get message() {
    return this.reason;
  }
}
