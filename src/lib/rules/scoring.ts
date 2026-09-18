import { RuleCategory, RuleResult } from "./types";
import { RULE_CATALOG } from "./registry";

export interface CategoryScoreSummary {
  score: number; // 0 - 100
  passedCount: number;
  warningCount: number;
  failedCount: number;
  totalTested: number;
}

export interface AuditScoringReport {
  overallHealthScore: number; // 0 - 100
  aeoGeoReadinessScore: number; // 0 - 100 (kept separate from technical health)
  coveragePercentage: number; // 0 - 100
  categoryScores: Record<RuleCategory, CategoryScoreSummary>;
  totalIssuesCount: number;
  formulaDescription: string;
}

const CATEGORY_WEIGHTS: Record<Exclude<RuleCategory, "aeo_geo">, number> = {
  crawlability: 0.25,
  onpage: 0.25,
  performance: 0.15,
  structured_data: 0.15,
  quality: 0.10,
  images: 0.10,
};

export function calculateAuditScores(results: RuleResult[]): AuditScoringReport {
  const catalogMap = new Map(RULE_CATALOG.map((r) => [r.id, r]));

  // Group by category
  const categorizedResults: Record<RuleCategory, RuleResult[]> = {
    crawlability: [],
    onpage: [],
    images: [],
    structured_data: [],
    performance: [],
    aeo_geo: [],
    quality: [],
  };

  for (const res of results) {
    if (categorizedResults[res.category]) {
      categorizedResults[res.category].push(res);
    }
  }

  const categorySummaries: Record<RuleCategory, CategoryScoreSummary> = {
    crawlability: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    onpage: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    images: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    structured_data: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    performance: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    aeo_geo: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
    quality: { score: 100, passedCount: 0, warningCount: 0, failedCount: 0, totalTested: 0 },
  };

  let totalIssuesCount = 0;
  let totalApplicableRulesCount = 0;

  for (const catKey of Object.keys(categorizedResults) as RuleCategory[]) {
    const list = categorizedResults[catKey];
    let earnedWeight = 0;
    let maxApplicableWeight = 0;

    for (const item of list) {
      if (item.state === "not_applicable" || item.state === "blocked") {
        continue;
      }

      totalApplicableRulesCount++;
      const def = catalogMap.get(item.ruleId);
      const ruleWeight = def ? def.weight : 10;
      maxApplicableWeight += ruleWeight;

      categorySummaries[catKey].totalTested++;

      if (item.state === "passed") {
        earnedWeight += ruleWeight;
        categorySummaries[catKey].passedCount++;
      } else if (item.state === "warning") {
        earnedWeight += ruleWeight * 0.5;
        categorySummaries[catKey].warningCount++;
        totalIssuesCount++;
      } else if (item.state === "failed") {
        categorySummaries[catKey].failedCount++;
        totalIssuesCount++;
      }
    }

    categorySummaries[catKey].score =
      maxApplicableWeight > 0 ? Math.round((earnedWeight / maxApplicableWeight) * 100) : 100;
  }

  // Calculate overall technical health
  let weightedHealthSum = 0;
  let totalTechWeight = 0;

  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS) as [Exclude<RuleCategory, "aeo_geo">, number][]) {
    weightedHealthSum += categorySummaries[cat].score * weight;
    totalTechWeight += weight;
  }

  const overallHealthScore = Math.round(weightedHealthSum / totalTechWeight);
  const aeoGeoReadinessScore = categorySummaries.aeo_geo.score;

  // Coverage % = Applicable tested rules / total registered catalog rules
  const coveragePercentage = Math.min(
    100,
    Math.round((totalApplicableRulesCount / Math.max(1, RULE_CATALOG.length)) * 100)
  );

  return {
    overallHealthScore,
    aeoGeoReadinessScore,
    coveragePercentage,
    categoryScores: categorySummaries,
    totalIssuesCount,
    formulaDescription:
      "Category Score = Σ(RuleWeight × Multiplier [Pass: 1.0, Warn: 0.5, Fail: 0]) / Σ(Applicable RuleWeights) × 100. Overall Health = Weighted sum of 6 technical categories (Crawlability 25%, On-Page 25%, Perf 15%, Schema 15%, Quality 10%, Images 10%). AEO/GEO readiness is computed independently as an advisory signal.",
  };
}
