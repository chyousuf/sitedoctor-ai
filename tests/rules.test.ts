import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { extractPageData } from "../src/lib/crawler/link-graph";
import { evaluateAllRules } from "../src/lib/rules/registry";

describe("Versioned Audit Rule Evaluation on Fixtures", () => {
  it("detects all known issues on the broken fixture site", async () => {
    const fixturePath = path.resolve("./tests/fixtures/broken-site/index.html");
    const html = await fs.readFile(fixturePath, "utf8");

    const pageData = extractPageData(html, "https://example.com/", "example.com");
    const results = evaluateAllRules({
      pageUrl: "https://example.com/",
      httpStatus: 200,
      responseTimeMs: 150,
      mimeType: "text/html",
      redirectHops: ["https://example.com/"],
      finalUrl: "https://example.com/",
      rawHtml: html,
      data: pageData,
    });

    const ruleStateMap = new Map(results.map((r) => [r.ruleId, r.state]));

    // Assert specific failed checks
    expect(ruleStateMap.get("ONPAGE_TITLE_PRESENT")).toBe("failed");
    expect(ruleStateMap.get("ONPAGE_META_DESC_PRESENT")).toBe("failed");
    expect(ruleStateMap.get("PERF_VIEWPORT_PRESENT")).toBe("failed");
    expect(ruleStateMap.get("IMG_ALT_PRESENT")).toBe("failed");
    expect(ruleStateMap.get("CRAWL_CANONICAL_PRESENT")).toBe("failed");
    expect(ruleStateMap.get("QUALITY_MIXED_CONTENT")).toBe("failed");
  });

  it("confirms high compliance on the healthy fixture site", async () => {
    const fixturePath = path.resolve("./tests/fixtures/healthy-site/index.html");
    const html = await fs.readFile(fixturePath, "utf8");

    const pageData = extractPageData(html, "https://example.com/healthy-site", "example.com");
    const results = evaluateAllRules({
      pageUrl: "https://example.com/healthy-site",
      httpStatus: 200,
      responseTimeMs: 90,
      mimeType: "text/html",
      redirectHops: ["https://example.com/healthy-site"],
      finalUrl: "https://example.com/healthy-site",
      rawHtml: html,
      data: pageData,
    });

    const ruleStateMap = new Map(results.map((r) => [r.ruleId, r.state]));

    expect(ruleStateMap.get("ONPAGE_TITLE_PRESENT")).toBe("passed");
    expect(ruleStateMap.get("ONPAGE_META_DESC_PRESENT")).toBe("passed");
    expect(ruleStateMap.get("PERF_VIEWPORT_PRESENT")).toBe("passed");
    expect(ruleStateMap.get("SCHEMA_JSONLD_PRESENT")).toBe("passed");
    expect(ruleStateMap.get("CRAWL_CANONICAL_PRESENT")).toBe("passed");
    expect(ruleStateMap.get("AEO_DIRECT_ANSWER_STRUCTURE")).toBe("passed");
    expect(ruleStateMap.get("AEO_STRUCTURED_LISTS")).toBe("passed");
    expect(ruleStateMap.get("IMG_ALT_PRESENT")).toBe("passed");
  });
});
