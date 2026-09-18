import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateCrawlabilityRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];

  // 1. HTTP Status Check
  if (ctx.httpStatus >= 400 || ctx.httpStatus === 0) {
    results.push({
      ruleId: "CRAWL_HTTP_STATUS",
      ruleVersion: "1.0",
      category: "crawlability",
      state: "failed",
      severity: ctx.httpStatus >= 500 || ctx.httpStatus === 0 ? "critical" : "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: `HTTP ${ctx.httpStatus === 0 ? "Network Error" : ctx.httpStatus} Encountered`,
      explanation: `Search engines and visitors could not successfully load this URL (Status: ${ctx.httpStatus}).`,
      observedValue: `HTTP ${ctx.httpStatus}`,
      expectedValue: "HTTP 200 OK",
      remediation: "Verify server routing, fix dead links, or implement a 301 redirect if the page was moved.",
      repairSupported: false,
      repairRisk: "medium",
    });
  } else {
    results.push({
      ruleId: "CRAWL_HTTP_STATUS",
      ruleVersion: "1.0",
      category: "crawlability",
      state: "passed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Valid HTTP Status Code",
      explanation: `Server responded with successful status ${ctx.httpStatus} OK.`,
      observedValue: `HTTP ${ctx.httpStatus}`,
      expectedValue: "HTTP 200 OK",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 2. Redirect Chains
  if (ctx.redirectHops && ctx.redirectHops.length > 2) {
    results.push({
      ruleId: "CRAWL_REDIRECT_CHAIN",
      ruleVersion: "1.0",
      category: "crawlability",
      state: "warning",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Redirect Chain Detected",
      explanation: `The page took ${ctx.redirectHops.length - 1} hops before reaching its final URL, consuming crawl budget and slowing load time.`,
      observedValue: ctx.redirectHops.join(" -> "),
      expectedValue: "Direct single-hop or direct 200 OK destination",
      remediation: "Update internal links to point directly to the destination URL.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  // 3. Canonical Tag Presence & Validity
  const canonical = ctx.data?.canonicalUrl;
  if (!canonical) {
    results.push({
      ruleId: "CRAWL_CANONICAL_PRESENT",
      ruleVersion: "1.0",
      category: "crawlability",
      state: "failed",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Canonical Tag",
      explanation: "No canonical link element was found on this page. Search engines may identify duplicate parameter variations.",
      observedValue: "No <link rel='canonical'> present",
      expectedValue: `<link rel="canonical" href="${ctx.finalUrl}">`,
      remediation: "Add a self-referential or authoritative canonical tag in the <head>.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    // Check if canonical is relative or points to a different host
    const isAbsolute = canonical.startsWith("http://") || canonical.startsWith("https://");
    if (!isAbsolute) {
      results.push({
        ruleId: "CRAWL_CANONICAL_VALID",
        ruleVersion: "1.0",
        category: "crawlability",
        state: "failed",
        severity: "high",
        confidence: 0.95,
        affectedUrl: ctx.pageUrl,
        title: "Relative Canonical URL",
        explanation: `Canonical tag specifies a relative path (${canonical}) instead of an absolute URL. Search engines recommend absolute canonicals.`,
        observedValue: canonical,
        expectedValue: ctx.finalUrl,
        remediation: "Update the canonical tag to use an absolute HTTPS URL.",
        repairSupported: true,
        repairRisk: "low",
      });
    } else {
      results.push({
        ruleId: "CRAWL_CANONICAL_PRESENT",
        ruleVersion: "1.0",
        category: "crawlability",
        state: "passed",
        severity: "medium",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "Canonical Tag Configured",
        explanation: "Authoritative canonical link tag is correctly declared.",
        observedValue: canonical,
        expectedValue: "Absolute canonical URL",
        remediation: "None required.",
        repairSupported: false,
        repairRisk: "low",
      });
    }
  }

  // 4. Meta Robots & X-Robots-Tag
  const metaRobots = (ctx.data?.metaRobots || "").toLowerCase();
  if (metaRobots.includes("noindex")) {
    results.push({
      ruleId: "CRAWL_ROBOTS_NOINDEX",
      ruleVersion: "1.0",
      category: "crawlability",
      state: "warning",
      severity: "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Page Blocked from Indexing (noindex)",
      explanation: "A 'noindex' directive is preventing search engines from listing this page.",
      observedValue: `<meta name="robots" content="${ctx.data?.metaRobots}">`,
      expectedValue: "index, follow (or absence of noindex for public landing pages)",
      remediation: "Remove the 'noindex' tag if this page is intended for public search visibility.",
      repairSupported: true,
      repairRisk: "high",
    });
  }

  // 5. Soft 404 Heuristic
  if (ctx.httpStatus === 200 && ctx.data) {
    const textLower = (ctx.data.mainContentText || "").toLowerCase();
    const titleLower = (ctx.data.title || "").toLowerCase();
    const isSuspectedSoft404 =
      (titleLower.includes("404") || titleLower.includes("not found")) &&
      (textLower.includes("page not found") || textLower.includes("does not exist") || ctx.data.wordCount < 30);

    if (isSuspectedSoft404) {
      results.push({
        ruleId: "CRAWL_SOFT_404_HEURISTIC",
        ruleVersion: "1.0",
        category: "crawlability",
        state: "warning",
        severity: "medium",
        confidence: 0.85,
        affectedUrl: ctx.pageUrl,
        title: "Suspected Soft 404 Page (Heuristic)",
        explanation: "The server responded with HTTP 200 OK, but the page content strongly resembles an error or missing-page template.",
        observedValue: `HTTP 200 OK with title "${ctx.data.title}" and ${ctx.data.wordCount} words`,
        expectedValue: "Genuine HTTP 404 Not Found status header or rich content",
        remediation: "Configure the server or CMS to send a true 404 or 410 status code for non-existent resources.",
        repairSupported: false,
        repairRisk: "medium",
      });
    }
  }

  return results;
}
