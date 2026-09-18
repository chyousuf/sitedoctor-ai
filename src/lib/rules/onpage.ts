import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateOnPageRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];
  if (!ctx.data) return results;

  const { title, metaDescription, headings, openGraph, wordCount, htmlLang } = ctx.data;

  // 1. Title Presence
  if (!title || title.trim().length === 0) {
    results.push({
      ruleId: "ONPAGE_TITLE_PRESENT",
      ruleVersion: "1.0",
      category: "onpage",
      state: "failed",
      severity: "critical",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Page Title",
      explanation: "No <title> tag was found. Page titles are one of the most critical on-page ranking signals and browser tab labels.",
      observedValue: "No <title> tag found",
      expectedValue: "A unique, descriptive <title> tag between 30 and 60 characters",
      remediation: "Add a concise, keyword-relevant <title> tag summarizing the page topic.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    // Title Length Guidance
    const len = title.length;
    if (len < 20) {
      results.push({
        ruleId: "ONPAGE_TITLE_LENGTH",
        ruleVersion: "1.0",
        category: "onpage",
        state: "warning",
        severity: "low",
        confidence: 0.9,
        affectedUrl: ctx.pageUrl,
        title: "Short Page Title",
        explanation: `Title is only ${len} characters. Short titles may miss opportunities to include relevant search terms or branding.`,
        observedValue: `"${title}" (${len} chars)`,
        expectedValue: "Recommended guidance: 30 to 60 characters",
        remediation: "Expand the title with relevant subject context or brand suffix.",
        repairSupported: true,
        repairRisk: "low",
      });
    } else if (len > 65) {
      results.push({
        ruleId: "ONPAGE_TITLE_LENGTH",
        ruleVersion: "1.0",
        category: "onpage",
        state: "warning",
        severity: "low",
        confidence: 0.9,
        affectedUrl: ctx.pageUrl,
        title: "Long Page Title (Truncation Risk)",
        explanation: `Title is ${len} characters and will likely be truncated in Google search engine result snippets.`,
        observedValue: `"${title}" (${len} chars)`,
        expectedValue: "Recommended guidance: Under 60-65 characters",
        remediation: "Shorten the title to keep key terms within visible desktop/mobile SERP limits.",
        repairSupported: true,
        repairRisk: "low",
      });
    } else {
      results.push({
        ruleId: "ONPAGE_TITLE_PRESENT",
        ruleVersion: "1.0",
        category: "onpage",
        state: "passed",
        severity: "critical",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "Optimized Page Title",
        explanation: `Title tag is present and well-proportioned (${len} characters).`,
        observedValue: title,
        expectedValue: "Title present (30-65 chars)",
        remediation: "None required.",
        repairSupported: false,
        repairRisk: "low",
      });
    }
  }

  // 2. Meta Description Presence & Length
  if (!metaDescription || metaDescription.trim().length === 0) {
    results.push({
      ruleId: "ONPAGE_META_DESC_PRESENT",
      ruleVersion: "1.0",
      category: "onpage",
      state: "failed",
      severity: "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Meta Description",
      explanation: "No meta description found. Search engines will auto-generate snippets from body text, which may look unpolished.",
      observedValue: "No <meta name='description'> found",
      expectedValue: "A compelling summary between 120 and 160 characters",
      remediation: "Draft an engaging meta description that encourages organic click-through.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    const dLen = metaDescription.length;
    if (dLen < 50 || dLen > 165) {
      results.push({
        ruleId: "ONPAGE_META_DESC_LENGTH",
        ruleVersion: "1.0",
        category: "onpage",
        state: "warning",
        severity: "low",
        confidence: 0.85,
        affectedUrl: ctx.pageUrl,
        title: dLen < 50 ? "Short Meta Description" : "Long Meta Description",
        explanation: `Description is ${dLen} characters. The standard desktop/mobile display length is approximately 120-160 characters.`,
        observedValue: `"${metaDescription}" (${dLen} chars)`,
        expectedValue: "120 - 160 characters recommended guidance",
        remediation: "Refine description length to maximize click-through without premature truncation.",
        repairSupported: true,
        repairRisk: "low",
      });
    } else {
      results.push({
        ruleId: "ONPAGE_META_DESC_PRESENT",
        ruleVersion: "1.0",
        category: "onpage",
        state: "passed",
        severity: "high",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "Meta Description Present",
        explanation: `Meta description is well-balanced (${dLen} characters).`,
        observedValue: metaDescription,
        expectedValue: "120-160 characters",
        remediation: "None required.",
        repairSupported: false,
        repairRisk: "low",
      });
    }
  }

  // 3. Heading Structure (H1)
  const h1Count = headings.h1.length;
  if (h1Count === 0) {
    results.push({
      ruleId: "ONPAGE_H1_PRESENT",
      ruleVersion: "1.0",
      category: "onpage",
      state: "failed",
      severity: "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing Primary Heading (H1)",
      explanation: "No <h1> element was found. An H1 provides crucial semantic context for users and search engines.",
      observedValue: "0 H1 elements",
      expectedValue: "At least one descriptive <h1> element",
      remediation: "Add an H1 heading at the top of the main content area summarizing the page topic.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    results.push({
      ruleId: "ONPAGE_H1_PRESENT",
      ruleVersion: "1.0",
      category: "onpage",
      state: "passed",
      severity: "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Primary Heading (H1) Present",
      explanation: `Page has ${h1Count} H1 heading(s): "${headings.h1[0]}"`,
      observedValue: headings.h1.join("; "),
      expectedValue: "Descriptive H1 heading",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 4. Open Graph Social Metadata
  const hasOgTitle = !!openGraph["og:title"];
  const hasOgDesc = !!openGraph["og:description"];
  const hasOgImage = !!openGraph["og:image"];

  if (!hasOgTitle || !hasOgDesc || !hasOgImage) {
    const missing: string[] = [];
    if (!hasOgTitle) missing.push("og:title");
    if (!hasOgDesc) missing.push("og:description");
    if (!hasOgImage) missing.push("og:image");

    results.push({
      ruleId: "ONPAGE_OPEN_GRAPH",
      ruleVersion: "1.0",
      category: "onpage",
      state: "warning",
      severity: "low",
      confidence: 0.95,
      affectedUrl: ctx.pageUrl,
      title: "Incomplete Open Graph Tags",
      explanation: `Missing social sharing tags: ${missing.join(", ")}. Shares on LinkedIn, Slack, and Facebook may lack rich visual previews.`,
      observedValue: `Missing: ${missing.join(", ")}`,
      expectedValue: "Complete og:title, og:description, and og:image tags",
      remediation: "Add the missing Open Graph meta tags to provide attractive rich social link cards.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  // 5. HTML Lang attribute
  if (!htmlLang) {
    results.push({
      ruleId: "ONPAGE_HTML_LANG",
      ruleVersion: "1.0",
      category: "onpage",
      state: "warning",
      severity: "low",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Missing HTML Lang Attribute",
      explanation: "The <html> element lacks a 'lang' attribute, hindering accessibility screen readers and search language classifiers.",
      observedValue: "<html> without lang attribute",
      expectedValue: "<html lang='en'> (or appropriate language code)",
      remediation: "Add the appropriate language code to the <html> tag (e.g., lang='en').",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  return results;
}
