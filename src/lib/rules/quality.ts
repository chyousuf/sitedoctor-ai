import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateQualityRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];

  // 1. HTTPS Protocol Enforcement
  const isHttps = ctx.finalUrl.startsWith("https://");
  if (!isHttps) {
    results.push({
      ruleId: "QUALITY_HTTPS_ENFORCED",
      ruleVersion: "1.0",
      category: "quality",
      state: "failed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Insecure HTTP Protocol",
      explanation: "Page is served over unencrypted HTTP. Modern browsers flag this as 'Not Secure' and search engines give ranking priority to HTTPS.",
      observedValue: "http:// protocol",
      expectedValue: "https:// protocol with 301 redirection",
      remediation: "Install an SSL/TLS certificate and configure permanent 301 redirects from HTTP to HTTPS.",
      repairSupported: false,
      repairRisk: "medium",
    });
  } else {
    results.push({
      ruleId: "QUALITY_HTTPS_ENFORCED",
      ruleVersion: "1.0",
      category: "quality",
      state: "passed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Secure HTTPS Protocol",
      explanation: "Page is served securely via encrypted HTTPS.",
      observedValue: "https://",
      expectedValue: "https://",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 2. Mixed Content Check (HTTP resources on HTTPS page)
  if (isHttps && ctx.rawHtml) {
    const mixedContentMatches = ctx.rawHtml.match(/(?:src|href)=["']http:\/\/[^"']+\.(?:js|css|png|jpg|jpeg|gif|webp|svg)["']/gi) || [];
    if (mixedContentMatches.length > 0) {
      results.push({
        ruleId: "QUALITY_MIXED_CONTENT",
        ruleVersion: "1.0",
        category: "quality",
        state: "failed",
        severity: "high",
        confidence: 0.95,
        affectedUrl: ctx.pageUrl,
        title: `${mixedContentMatches.length} Mixed Content Asset(s) Detected`,
        explanation: "Insecure 'http://' assets were found on an HTTPS page. Modern browsers block active mixed content (scripts) and flag passive mixed content (images).",
        observedValue: mixedContentMatches.slice(0, 3).join(", "),
        expectedValue: "All assets loaded over secure HTTPS or protocol-relative URLs",
        remediation: "Update asset URLs to use https:// instead of http://.",
        repairSupported: true,
        repairRisk: "low",
      });
    } else {
      results.push({
        ruleId: "QUALITY_MIXED_CONTENT",
        ruleVersion: "1.0",
        category: "quality",
        state: "passed",
        severity: "high",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "No Mixed Content Detected",
        explanation: "All linked subresources appear to use secure HTTPS.",
        observedValue: "0 insecure subresources",
        expectedValue: "0 insecure subresources",
        remediation: "None required.",
        repairSupported: false,
        repairRisk: "low",
      });
    }
  }

  // 3. Charset Declaration
  if (ctx.data && !ctx.data.charset) {
    results.push({
      ruleId: "QUALITY_CHARSET_DECLARED",
      ruleVersion: "1.0",
      category: "quality",
      state: "warning",
      severity: "low",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Character Encoding Declaration",
      explanation: "No <meta charset='utf-8'> tag was found. Missing encoding can cause unexpected symbol rendering and encoding vulnerabilities.",
      observedValue: "No charset meta tag",
      expectedValue: "<meta charset=\"utf-8\">",
      remediation: "Add <meta charset=\"utf-8\"> as the first child of <head>.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  return results;
}
