import { describe, it, expect } from "vitest";
import { normalizeUrl, isCrawlTrap, isInternalUrl } from "../src/lib/crawler/url-normalizer";
import { parseRobotsTxt, isPathAllowed } from "../src/lib/crawler/robots";
import { parseSitemap } from "../src/lib/crawler/sitemap";

describe("Crawler Subsystems", () => {
  describe("URL Normalizer", () => {
    it("strips analytics tracking query parameters while preserving content queries", () => {
      const url = "https://EXAMPLE.com/blog/article/?utm_source=twitter&id=42&fbclid=xyz#section";
      const normalized = normalizeUrl(url);
      expect(normalized).toBe("https://example.com/blog/article/?id=42");
    });

    it("detects repetitive crawl trap paths", () => {
      const trap = "https://example.com/products/shoes/products/shoes/products/shoes/view";
      expect(isCrawlTrap(trap)).toBe(true);

      const normal = "https://example.com/products/shoes/nike-air-max";
      expect(isCrawlTrap(normal)).toBe(false);
    });

    it("verifies internal vs external domain matching", () => {
      expect(isInternalUrl("https://blog.example.com/post", "example.com")).toBe(true);
      expect(isInternalUrl("https://example.com/about", "example.com")).toBe(true);
      expect(isInternalUrl("https://otherdomain.com/about", "example.com")).toBe(false);
    });
  });

  describe("Robots.txt & AI Bot Analyzer", () => {
    const robotsSample = `
User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /admin/public/

User-agent: GPTBot
Disallow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://example.com/sitemap.xml
`;

    it("parses directives and extracts sitemaps", () => {
      const parsed = parseRobotsTxt(robotsSample, "https://example.com/robots.txt");
      expect(parsed.sitemaps).toContain("https://example.com/sitemap.xml");
      expect(parsed.directives.length).toBeGreaterThan(0);
    });

    it("accurately detects AI crawler policies", () => {
      const parsed = parseRobotsTxt(robotsSample, "https://example.com/robots.txt");
      expect(parsed.aiBotDirectives["GPTBot"].status).toBe("disallowed");
      expect(parsed.aiBotDirectives["PerplexityBot"].status).toBe("allowed");
      expect(parsed.aiBotDirectives["ClaudeBot"].status).toBe("unspecified");
    });

    it("evaluates path allowance rules correctly", () => {
      const parsed = parseRobotsTxt(robotsSample, "https://example.com/robots.txt");
      expect(isPathAllowed("/admin/settings", "*", parsed.directives)).toBe(false);
      expect(isPathAllowed("/admin/public/login", "*", parsed.directives)).toBe(true);
      expect(isPathAllowed("/blog/post-1", "*", parsed.directives)).toBe(true);
    });
  });

  describe("Sitemap Parser", () => {
    it("parses standard XML sitemaps with metadata", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-09-01</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-09-02</lastmod>
  </url>
</urlset>`;

      const res = await parseSitemap(xml);
      expect(res.isIndex).toBe(false);
      expect(res.urls.length).toBe(2);
      expect(res.urls[0].loc).toBe("https://example.com/");
      expect(res.urls[0].priority).toBe("1.0");
    });
  });
});
