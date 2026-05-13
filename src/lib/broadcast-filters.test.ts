import { describe, expect, test } from "bun:test";
import { buildSubscriberFilter } from "./broadcast-filters";

describe("buildSubscriberFilter", () => {
  test("builds exclude-only tag filters", () => {
    expect(buildSubscriberFilter({ excludeTags: [19562218, 8244351] })).toEqual([
      { none: [{ type: "tag", ids: [19562218, 8244351] }] },
    ]);
  });

  test("builds segment targeting plus exclusions", () => {
    expect(
      buildSubscriberFilter({
        segments: [548647],
        excludeTags: [19562218, 8244351],
      }),
    ).toEqual([
      { all: [{ type: "segment", ids: [548647] }] },
      { none: [{ type: "tag", ids: [19562218, 8244351] }] },
    ]);
  });

  test("collapses duplicate exclude tags into one none tag block", () => {
    expect(buildSubscriberFilter({ excludeTags: [19562218, 8244351, 19562218] })).toEqual([
      { none: [{ type: "tag", ids: [19562218, 8244351] }] },
    ]);
  });
});
