import { describe, it, expect } from "vitest";
import { calculateAuditScores } from "../src/lib/rules/scoring";
import { RuleResult } from "../src/lib/rules/types";

describe("Transparent Scoring Engine", () => {
  it("calculates 100% health score when all rules pass", () => {
    const mockResults: RuleResult[] = [
      {
        ruleId: "CRAWL_HTTP_STATUS",
        ruleVersion: "1.0",
        category: "crawlability",
        state: "passed",
        severity: "critical",
        confidence: 1.0,
        affectedUrl: "https://example.com/",
        title: "OK",
        explanation: "OK",
        remediation: "None",
        repairSupported: false,
        repairRisk: "low",
      },
      {
        ruleId: "ONPAGE_TITLE_PRESENT",
        ruleVersion: "1.0",
        category: "onpage",
        state: "passed",
        severity: "critical",
        confidence: 1.0,
        affectedUrl: "https://example.com/",
        title: "OK",
        explanation: "OK",
        remediation: "None",
        repairSupported: true,
        repairRisk: "low",
      },
    ];

    const report = calculateAuditScores(mockResults);
    expect(report.overallHealthScore).toBe(100);
    expect(report.categoryScores.crawlability.score).toBe(100);
    expect(report.categoryScores.onpage.score).toBe(100);
  });

  it("reduces category score proportionately when critical rule fails", () => {
    const mockResults: RuleResult[] = [
      {
        ruleId: "ONPAGE_TITLE_PRESENT",
        ruleVersion: "1.0",
        category: "onpage",
        state: "failed", // 0 multiplier
        severity: "critical",
        confidence: 1.0,
        affectedUrl: "https://example.com/",
        title: "Missing Title",
        explanation: "Missing",
        remediation: "Fix",
        repairSupported: true,
        repairRisk: "low",
      },
      {
        ruleId: "ONPAGE_META_DESC_PRESENT",
        ruleVersion: "1.0",
        category: "onpage",
        state: "passed", // 1.0 multiplier
        severity: "high",
        confidence: 1.0,
        affectedUrl: "https://example.com/",
        title: "Meta Desc Present",
        explanation: "Present",
        remediation: "None",
        repairSupported: true,
        repairRisk: "low",
      },
    ];

    const report = calculateAuditScores(mockResults);
    // ONPAGE_TITLE_PRESENT (weight 20, 0 pts) + ONPAGE_META_DESC_PRESENT (weight 15, 15 pts) -> 15/35 = 43%
    expect(report.categoryScores.onpage.score).toBe(43);
    expect(report.totalIssuesCount).toBe(1);
  });

  it("excludes not_applicable checks from denominator", () => {
    const mockResults: RuleResult[] = [
      {
        ruleId: "IMG_ALT_PRESENT",
        ruleVersion: "1.0",
        category: "images",
        state: "not_applicable", // excluded from denominator!
        severity: "medium",
        confidence: 1.0,
        affectedUrl: "https://example.com/",
        title: "No images",
        explanation: "None",
        remediation: "None",
        repairSupported: false,
        repairRisk: "low",
      },
    ];

    const report = calculateAuditScores(mockResults);
    expect(report.categoryScores.images.totalTested).toBe(0);
    expect(report.categoryScores.images.score).toBe(100);
  });
});
