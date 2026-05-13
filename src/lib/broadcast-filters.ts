import { readFile } from "node:fs/promises";
import { Option } from "effect";

export type SubscriberFilterCondition = {
  type: "segment" | "tag";
  ids: number[];
};

export type SubscriberFilterBlock =
  | { all: SubscriberFilterCondition[] }
  | { none: SubscriberFilterCondition[] };

export type SubscriberFilter = SubscriberFilterBlock[];

export type SubscriberFilterInput = {
  segments?: Array<number | string>;
  excludeTags?: Array<number | string>;
};

const toNumberIds = (values: Array<number | string> | undefined, label: string) => {
  const ids = (values ?? []).map((value) => {
    const id = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid ${label} id: ${String(value)}`);
    }
    return id;
  });

  return [...new Set(ids)];
};

export const buildSubscriberFilter = ({
  segments,
  excludeTags,
}: SubscriberFilterInput): SubscriberFilter => {
  const segmentIds = toNumberIds(segments, "segment");
  const excludeTagIds = toNumberIds(excludeTags, "exclude-tag");
  const filter: SubscriberFilter = [];

  if (segmentIds.length > 0) {
    filter.push({ all: [{ type: "segment", ids: segmentIds }] });
  }

  if (excludeTagIds.length > 0) {
    filter.push({ none: [{ type: "tag", ids: excludeTagIds }] });
  }

  return filter;
};

export const hasStructuredFilterInput = (options: Record<string, unknown>) =>
  Array.from((options.segment as Iterable<unknown> | undefined) ?? []).length > 0 ||
  Array.from((options.excludeTag as Iterable<unknown> | undefined) ?? []).length > 0 ||
  Option.isSome(options.subscriberFilterFile as Option.Option<string>);

export const buildSubscriberFilterFromOptions = async (
  options: Record<string, unknown>,
): Promise<SubscriberFilter | undefined> => {
  const subscriberFilterFile = options.subscriberFilterFile as Option.Option<string> | undefined;

  if (subscriberFilterFile && Option.isSome(subscriberFilterFile)) {
    return JSON.parse(await readFile(subscriberFilterFile.value, "utf8"));
  }

  const segments = Array.from((options.segment as Iterable<string> | undefined) ?? []);
  const excludeTags = Array.from((options.excludeTag as Iterable<string> | undefined) ?? []);

  if (segments.length === 0 && excludeTags.length === 0) {
    return undefined;
  }

  return buildSubscriberFilter({ segments, excludeTags });
};
