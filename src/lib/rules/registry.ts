import { RuleDefinition, RuleEvaluationContext, RuleResult } from "./types";
import { evaluateCrawlabilityRules } from "./crawlability";
import { evaluateOnPageRules } from "./onpage";
import { evaluateImageRules } from "./images";
import { evaluateStructuredDataRules } from "./structured-data";
import { evaluatePerformanceRules } from "./performance";
import { evaluateAeoGeoRules } from "./aeo-geo";
import { evaluateQualityRules } from "./quality";

export const RULE_CATALOG: RuleDefinition[] = [
  // Crawlability
  {
    id: "CRAWL_HTTP_STATUS",
    version: "1.0",
    category: "crawlability",
    name: "HTTP Status Code",
    description: "Ensures page returns a successful HTTP 200 status code.",
    severity: "critical",
    weight: 20,
    repairSupported: false,
    repairRisk: "low",
    authoritativeSource: "RFC 9110 / Google Search Central",
  },
  {
    id: "CRAWL_REDIRECT_CHAIN",
    version: "1.0",
    category: "crawlability",
    name: "Redirect Chain Length",
    description: "Detects multiple sequential redirects that consume crawl budget.",
    severity: "medium",
    weight: 10,
    repairSupported: true,
    repairRisk: "low",
    authoritativeSource: "Google Webmaster Guidelines",
  },
  {
    id: "CRAWL_CANONICAL_PRESENT",
    version: "1.0",
    category: "crawlability",
    name: "Canonical Tag Presence",
    description: "Verifies the presence of a rel=canonical link element.",
    severity: "medium",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
    authoritativeSource: "RFC 6596",
  },
  {
    id: "CRAWL_CANONICAL_VALID",
    version: "1.0",
    category: "crawlability",
    name: "Canonical Tag Absolute Format",
    description: "Ensures canonical link is an absolute HTTPS URL.",
    severity: "high",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "CRAWL_ROBOTS_NOINDEX",
    version: "1.0",
    category: "crawlability",
    name: "Meta Robots Noindex",
    description: "Warns if indexation is prevented by a noindex directive.",
    severity: "high",
    weight: 15,
    repairSupported: true,
    repairRisk: "high",
  },
  {
    id: "CRAWL_SOFT_404_HEURISTIC",
    version: "1.0",
    category: "crawlability",
    name: "Soft 404 Detection (Heuristic)",
    description: "Identifies 200 OK pages that display 'not found' error content.",
    severity: "medium",
    weight: 10,
    repairSupported: false,
    repairRisk: "medium",
  },

  // On-Page SEO
  {
    id: "ONPAGE_TITLE_PRESENT",
    version: "1.0",
    category: "onpage",
    name: "Title Tag Presence",
    description: "Ensures <title> tag exists and is non-empty.",
    severity: "critical",
    weight: 20,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_TITLE_LENGTH",
    version: "1.0",
    category: "onpage",
    name: "Title Tag Length Guidance",
    description: "Guides title length between 30 and 60 characters to avoid SERP truncation.",
    severity: "low",
    weight: 5,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_META_DESC_PRESENT",
    version: "1.0",
    category: "onpage",
    name: "Meta Description Presence",
    description: "Checks if a meta description snippet is provided.",
    severity: "high",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_META_DESC_LENGTH",
    version: "1.0",
    category: "onpage",
    name: "Meta Description Length Guidance",
    description: "Guides description length between 120 and 160 characters.",
    severity: "low",
    weight: 5,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_H1_PRESENT",
    version: "1.0",
    category: "onpage",
    name: "Primary H1 Heading",
    description: "Verifies the presence of a primary H1 heading element.",
    severity: "high",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_OPEN_GRAPH",
    version: "1.0",
    category: "onpage",
    name: "Open Graph Social Metadata",
    description: "Verifies og:title, og:description, and og:image for rich social sharing cards.",
    severity: "low",
    weight: 10,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "ONPAGE_HTML_LANG",
    version: "1.0",
    category: "onpage",
    name: "HTML Lang Attribute",
    description: "Ensures html tag specifies a valid language identifier.",
    severity: "low",
    weight: 5,
    repairSupported: true,
    repairRisk: "low",
  },

  // Images
  {
    id: "IMG_ALT_PRESENT",
    version: "1.0",
    category: "images",
    name: "Image Alt Attributes",
    description: "Checks for alt text on content images and explicit empty alt on decorative elements.",
    severity: "medium",
    weight: 20,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "IMG_DIMENSIONS_PRESENT",
    version: "1.0",
    category: "images",
    name: "Image Dimensions (CLS Prevention)",
    description: "Checks for width/height attributes to prevent Cumulative Layout Shift.",
    severity: "low",
    weight: 10,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "IMG_LAZY_ABOVE_FOLD",
    version: "1.0",
    category: "images",
    name: "Above-the-Fold Lazy Loading",
    description: "Warns if primary hero image is delayed by loading='lazy'.",
    severity: "medium",
    weight: 10,
    repairSupported: true,
    repairRisk: "low",
  },

  // Structured Data
  {
    id: "SCHEMA_JSONLD_PRESENT",
    version: "1.0",
    category: "structured_data",
    name: "JSON-LD Structured Data",
    description: "Checks for Schema.org JSON-LD markup.",
    severity: "medium",
    weight: 25,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "SCHEMA_SYNTAX_VALID",
    version: "1.0",
    category: "structured_data",
    name: "JSON-LD Syntax Validity",
    description: "Verifies JSON-LD script blocks are well-formed JSON.",
    severity: "high",
    weight: 25,
    repairSupported: true,
    repairRisk: "low",
  },

  // Performance
  {
    id: "PERF_VIEWPORT_PRESENT",
    version: "1.0",
    category: "performance",
    name: "Mobile Viewport Meta Tag",
    description: "Checks for responsive mobile viewport declaration.",
    severity: "critical",
    weight: 30,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "PERF_RESPONSE_TIME",
    version: "1.0",
    category: "performance",
    name: "Server Response Time (TTFB)",
    description: "Monitors initial server response latency under 800ms.",
    severity: "medium",
    weight: 20,
    repairSupported: false,
    repairRisk: "medium",
  },
  {
    id: "PERF_RENDER_BLOCKING_SCRIPTS",
    version: "1.0",
    category: "performance",
    name: "Render-Blocking Scripts",
    description: "Identifies synchronous scripts blocking page rendering.",
    severity: "medium",
    weight: 15,
    repairSupported: true,
    repairRisk: "medium",
  },

  // AEO / GEO Readiness
  {
    id: "AEO_DIRECT_ANSWER_STRUCTURE",
    version: "1.0",
    category: "aeo_geo",
    name: "AEO Direct Answer Structure",
    description: "Evaluates question subheadings and concise answer paragraphs for AI answer engines.",
    severity: "low",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "AEO_STRUCTURED_LISTS",
    version: "1.0",
    category: "aeo_geo",
    name: "AEO Extractable Lists and Tables",
    description: "Evaluates structured list and table usage for LLM fact extraction.",
    severity: "low",
    weight: 15,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "GEO_AI_BOT_ACCESS",
    version: "1.0",
    category: "aeo_geo",
    name: "AI Search Bot Crawler Access",
    description: "Inspects robots.txt access rules for AI search engines.",
    severity: "info",
    weight: 10,
    repairSupported: true,
    repairRisk: "medium",
  },

  // Website Quality & Security
  {
    id: "QUALITY_HTTPS_ENFORCED",
    version: "1.0",
    category: "quality",
    name: "HTTPS Protocol Security",
    description: "Ensures communication is encrypted via HTTPS.",
    severity: "critical",
    weight: 35,
    repairSupported: false,
    repairRisk: "medium",
  },
  {
    id: "QUALITY_MIXED_CONTENT",
    version: "1.0",
    category: "quality",
    name: "Mixed Content Assets",
    description: "Detects insecure http:// resources on https:// pages.",
    severity: "high",
    weight: 25,
    repairSupported: true,
    repairRisk: "low",
  },
  {
    id: "QUALITY_CHARSET_DECLARED",
    version: "1.0",
    category: "quality",
    name: "Character Encoding Declaration",
    description: "Verifies meta charset UTF-8 declaration.",
    severity: "low",
    weight: 10,
    repairSupported: true,
    repairRisk: "low",
  },
];

/**
 * Runs all registered rules against a crawled page
 */
export function evaluateAllRules(ctx: RuleEvaluationContext): RuleResult[] {
  const allResults: RuleResult[] = [];

  allResults.push(...evaluateCrawlabilityRules(ctx));
  allResults.push(...evaluateOnPageRules(ctx));
  allResults.push(...evaluateImageRules(ctx));
  allResults.push(...evaluateStructuredDataRules(ctx));
  allResults.push(...evaluatePerformanceRules(ctx));
  allResults.push(...evaluateAeoGeoRules(ctx));
  allResults.push(...evaluateQualityRules(ctx));

  return allResults;
}
