export type RuleCategory =
  | "crawlability"
  | "onpage"
  | "images"
  | "structured_data"
  | "performance"
  | "aeo_geo"
  | "quality";

export type RuleSeverity = "critical" | "high" | "medium" | "low" | "info";

export type RuleState = "passed" | "failed" | "warning" | "not_applicable" | "blocked";

export type RepairRisk = "low" | "medium" | "high";

export interface RuleDefinition {
  id: string;
  version: string;
  category: RuleCategory;
  name: string;
  description: string;
  severity: RuleSeverity;
  weight: number; // For transparent scoring formula
  repairSupported: boolean;
  repairRisk: RepairRisk;
  authoritativeSource?: string;
}

export interface RuleEvaluationContext {
  pageUrl: string;
  httpStatus: number;
  responseTimeMs: number;
  mimeType: string;
  redirectHops: string[];
  finalUrl: string;
  rawHtml?: string;
  data?: import("../crawler/link-graph").PageExtraction;
  allCrawledPages?: Map<string, import("../crawler/crawler").CrawledPage>;
  robotsTxt?: import("../crawler/robots").RobotsAnalysis | null;
  sitemapUrls?: import("../crawler/sitemap").SitemapEntry[];
}

export interface RuleResult {
  ruleId: string;
  ruleVersion: string;
  category: RuleCategory;
  state: RuleState;
  severity: RuleSeverity;
  confidence: number;
  affectedUrl: string;
  title: string;
  explanation: string;
  observedValue?: string;
  expectedValue?: string;
  evidenceSnippet?: string;
  remediation: string;
  repairSupported: boolean;
  repairRisk: RepairRisk;
  templateGroupId?: string;
}
