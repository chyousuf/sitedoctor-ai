import { extractPageData } from "../crawler/link-graph";
import { evaluateAllRules } from "../rules/registry";
import { RuleResult } from "../rules/types";

export interface VerificationOutcome {
  targetUrl: string;
  testedRuleId: string;
  passed: boolean;
  httpStatus: number;
  regressionDetected: boolean;
  explanation: string;
  reEvaluatedResults: RuleResult[];
}

export class RepairVerifier {
  /**
   * Verifies repair by parsing the post-repair HTML content and re-running the rule engine
   */
  public verifyContentRepair(
    targetUrl: string,
    ruleId: string,
    repairedHtml: string
  ): VerificationOutcome {
    const parsedData = extractPageData(repairedHtml, targetUrl, new URL(targetUrl).hostname);

    const allResults = evaluateAllRules({
      pageUrl: targetUrl,
      httpStatus: 200,
      responseTimeMs: 80,
      mimeType: "text/html",
      redirectHops: [targetUrl],
      finalUrl: targetUrl,
      rawHtml: repairedHtml,
      data: parsedData,
    });

    // Check the target rule
    const targetRuleResult = allResults.find((r) => r.ruleId === ruleId);
    const passed = targetRuleResult ? targetRuleResult.state === "passed" : true;

    // Check for critical regressions introduced by repair
    const criticalFailures = allResults.filter(
      (r) => r.severity === "critical" && r.state === "failed"
    );
    const regressionDetected = criticalFailures.length > 0;

    return {
      targetUrl,
      testedRuleId: ruleId,
      passed,
      httpStatus: 200,
      regressionDetected,
      explanation: passed
        ? `Verification SUCCESS: Finding ${ruleId} is resolved on ${targetUrl}.`
        : `Verification PENDING: Finding ${ruleId} still indicates ${targetRuleResult?.state || "unresolved"}.`,
      reEvaluatedResults: allResults,
    };
  }
}
