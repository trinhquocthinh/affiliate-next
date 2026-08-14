import { describe, it, expect } from "vitest";
import { buildQueueParams, buildCsvContent, type AffiliateQueueFilters } from "./affiliate-queue";

const baseFilters: AffiliateQueueFilters = {
  search: "",
  statusFilter: "ALL",
  buyerFilter: "ALL",
  sortBy: "createdAt",
  sortOrder: "desc",
  createdFrom: "",
  createdTo: "",
};

describe("buildQueueParams", () => {
  it("always includes statusFilter/sortBy/sortOrder/limit/page", () => {
    const params = buildQueueParams(baseFilters, 2);
    expect(params.get("statusFilter")).toBe("ALL");
    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortOrder")).toBe("desc");
    expect(params.get("limit")).toBe("20");
    expect(params.get("page")).toBe("2");
  });

  it("omits optional filters when unset", () => {
    const params = buildQueueParams(baseFilters, 1);
    expect(params.has("search")).toBe(false);
    expect(params.has("buyerId")).toBe(false);
    expect(params.has("createdFrom")).toBe(false);
    expect(params.has("createdTo")).toBe(false);
  });

  it("includes trimmed search, buyerId, and date range when set", () => {
    const params = buildQueueParams(
      {
        ...baseFilters,
        search: "  hello  ",
        buyerFilter: "buyer-1",
        createdFrom: "2026-01-01",
        createdTo: "2026-01-31",
      },
      1,
    );
    expect(params.get("search")).toBe("hello");
    expect(params.get("buyerId")).toBe("buyer-1");
    expect(params.get("createdFrom")).toBe("2026-01-01");
    expect(params.get("createdTo")).toBe("2026-01-31");
  });

  it("does not set buyerId when buyerFilter is ALL", () => {
    const params = buildQueueParams({ ...baseFilters, buyerFilter: "ALL" }, 1);
    expect(params.has("buyerId")).toBe(false);
  });

  it("respects a custom page size (used by CSV export)", () => {
    const params = buildQueueParams(baseFilters, 3, 100);
    expect(params.get("limit")).toBe("100");
    expect(params.get("page")).toBe("3");
  });
});

describe("buildCsvContent", () => {
  it("joins headers and rows with commas and a leading BOM", () => {
    const csv = buildCsvContent(["ID", "Name"], [["1", "Alice"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    // Header row is written verbatim (unquoted); only data cells are quoted.
    expect(csv).toContain("ID,Name");
    expect(csv).toContain('"1","Alice"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    const csv = buildCsvContent(["Note"], [['She said "hi"']]);
    expect(csv).toContain('"She said ""hi"""');
  });

  it("keeps commas inside a quoted cell intact", () => {
    const csv = buildCsvContent(["Note"], [["a, b, c"]]);
    expect(csv).toContain('"a, b, c"');
  });

  it("produces one line per row plus the header line", () => {
    const csv = buildCsvContent(["ID"], [["1"], ["2"], ["3"]]);
    const lines = csv.replace("﻿", "").split("\n");
    expect(lines).toHaveLength(4);
  });
});
