import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluatePerformanceRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];

  // 1. Mobile Viewport
  if (!ctx.data?.hasViewport) {
    results.push({
      ruleId: "PERF_VIEWPORT_PRESENT",
      ruleVersion: "1.0",
      category: "performance",
      state: "failed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Mobile Viewport Meta Tag",
      explanation: "Without a viewport tag, mobile browsers render desktop-width layouts, resulting in poor mobile usability and Google mobile indexing penalties.",
      observedValue: "No <meta name='viewport'> found",
      expectedValue: "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
      remediation: "Add a standard viewport meta tag to the <head> element.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    results.push({
      ruleId: "PERF_VIEWPORT_PRESENT",
      ruleVersion: "1.0",
      category: "performance",
      state: "passed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Mobile Viewport Configured",
      explanation: "Mobile viewport meta tag is properly configured for responsive rendering.",
      observedValue: "Viewport meta tag present",
      expectedValue: "Viewport meta tag present",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 2. Server Response Time (TTFB proxy)
  if (ctx.responseTimeMs > 2000) {
    results.push({
      ruleId: "PERF_RESPONSE_TIME",
      ruleVersion: "1.0",
      category: "performance",
      state: "warning",
      severity: "high",
      confidence: 0.95,
      affectedUrl: ctx.pageUrl,
      title: "Slow Server Response Time",
      explanation: `Server took ${ctx.responseTimeMs}ms to respond. Google recommends Time to First Byte (TTFB) under 800ms.`,
      observedValue: `${ctx.responseTimeMs}ms`,
      expectedValue: "< 800ms TTFB",
      remediation: "Investigate server CPU/database bottlenecks, enable page caching, or configure an edge CDN.",
      repairSupported: false,
      repairRisk: "medium",
    });
  } else {
    results.push({
      ruleId: "PERF_RESPONSE_TIME",
      ruleVersion: "1.0",
      category: "performance",
      state: "passed",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Fast Initial Server Response",
      explanation: `Server responded quickly in ${ctx.responseTimeMs}ms.`,
      observedValue: `${ctx.responseTimeMs}ms`,
      expectedValue: "< 800ms",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 3. Render Blocking Scripts
  if (ctx.data && ctx.data.renderBlockingScripts.length > 2) {
    results.push({
      ruleId: "PERF_RENDER_BLOCKING_SCRIPTS",
      ruleVersion: "1.0",
      category: "performance",
      state: "warning",
      severity: "medium",
      confidence: 0.9,
      affectedUrl: ctx.pageUrl,
      title: `${ctx.data.renderBlockingScripts.length} Render-Blocking Scripts`,
      explanation: "Synchronous external scripts block HTML parsing and delay First Contentful Paint (FCP).",
      observedValue: `${ctx.data.renderBlockingScripts.length} scripts without defer/async`,
      expectedValue: "Non-critical scripts use 'defer', 'async', or type='module'",
      remediation: "Add 'defer' or 'async' attributes to scripts that are not required for immediate initial rendering.",
      repairSupported: true,
      repairRisk: "medium",
    });
  }

  return results;
}
