import * as cheerio from "cheerio";
import { normalizeUrl, isInternalUrl } from "./url-normalizer";

export interface DiscoveredLink {
  rawHref: string;
  normalizedUrl: string;
  anchorText: string;
  isInternal: boolean;
  isNoFollow: boolean;
}

export interface PageExtraction {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  metaRobots?: string;
  xRobotsTag?: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
  };
  images: {
    src: string;
    alt?: string;
    width?: string;
    height?: string;
    loading?: string;
  }[];
  jsonLdSchemas: any[];
  links: DiscoveredLink[];
  openGraph: Record<string, string>;
  wordCount: number;
  hasViewport: boolean;
  htmlLang?: string;
  charset?: string;
  hasFavicon: boolean;
  renderBlockingScripts: string[];
  hasAnalyticsOrGtm: boolean;
  mainContentText: string;
}

export function extractPageData(html: string, currentUrl: string, rootDomain: string): PageExtraction {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim() || undefined;
  const metaDescription = $('meta[name="description" i]').attr("content")?.trim() || undefined;
  const canonicalUrl = $('link[rel="canonical" i]').attr("href")?.trim() || undefined;
  const metaRobots = $('meta[name="robots" i]').attr("content")?.trim() || undefined;
  const htmlLang = $("html").attr("lang")?.trim() || undefined;
  const charset = $("meta[charset]").attr("charset") || $('meta[http-equiv="content-type" i]').attr("content") || undefined;
  const hasViewport = $('meta[name="viewport" i]').length > 0;
  const hasFavicon = $('link[rel*="icon" i]').length > 0;

  // Headings
  const headings = {
    h1: $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h2: $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h3: $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean),
    h4: $("h4").map((_, el) => $(el).text().trim()).get().filter(Boolean),
  };

  // Images
  const images = $("img").map((_, el) => {
    const $el = $(el);
    return {
      src: $el.attr("src") || $el.attr("data-src") || "",
      alt: $el.attr("alt"),
      width: $el.attr("width"),
      height: $el.attr("height"),
      loading: $el.attr("loading"),
    };
  }).get();

  // JSON-LD
  const jsonLdSchemas: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const rawText = $(el).text().trim();
      if (rawText) {
        const parsed = JSON.parse(rawText);
        jsonLdSchemas.push(parsed);
      }
    } catch {
      // Invalid JSON-LD block
      jsonLdSchemas.push({ _parseError: true, raw: $(el).text() });
    }
  });

  // Open Graph
  const openGraph: Record<string, string> = {};
  $('meta[property^="og:"], meta[name^="twitter:"]').each((_, el) => {
    const key = $(el).attr("property") || $(el).attr("name");
    const val = $(el).attr("content");
    if (key && val) {
      openGraph[key] = val;
    }
  });

  // Links
  const links: DiscoveredLink[] = [];
  $("a[href]").each((_, el) => {
    const $a = $(el);
    const rawHref = ($a.attr("href") || "").trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) {
      return;
    }

    const normalized = normalizeUrl(rawHref, currentUrl);
    if (!normalized) return;

    const rel = ($a.attr("rel") || "").toLowerCase();
    const isNoFollow = rel.includes("nofollow");
    const isInternal = isInternalUrl(normalized, rootDomain);
    const anchorText = $a.text().trim();

    links.push({
      rawHref,
      normalizedUrl: normalized,
      anchorText,
      isInternal,
      isNoFollow,
    });
  });

  // Scripts (Render blocking analysis)
  const renderBlockingScripts: string[] = [];
  $("script[src]").each((_, el) => {
    const $s = $(el);
    const isAsync = $s.attr("async") !== undefined;
    const isDefer = $s.attr("defer") !== undefined;
    const isModule = $s.attr("type") === "module";
    const src = $s.attr("src") || "";

    if (!isAsync && !isDefer && !isModule) {
      renderBlockingScripts.push(src);
    }
  });

  // Analytics detection
  const hasAnalyticsOrGtm =
    html.includes("googletagmanager.com/gtm.js") ||
    html.includes("google-analytics.com/analytics.js") ||
    html.includes("gtag(") ||
    html.includes("clarity.ms/tag") ||
    html.includes("plausible.io");

  // Content text extraction
  const clone = $("body").clone();
  clone.find("script, style, nav, footer, header, noscript, svg, aside").remove();
  const mainContentText = clone.text().replace(/\s+/g, " ").trim();
  const wordCount = mainContentText ? mainContentText.split(/\s+/).length : 0;

  return {
    title,
    metaDescription,
    canonicalUrl,
    metaRobots,
    headings,
    images,
    jsonLdSchemas,
    links,
    openGraph,
    wordCount,
    hasViewport,
    htmlLang,
    charset,
    hasFavicon,
    renderBlockingScripts,
    hasAnalyticsOrGtm,
    mainContentText,
  };
}
