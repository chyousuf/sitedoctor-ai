import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateAeoGeoRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];
  if (!ctx.data) return results;

  const { headings, wordCount, mainContentText, rawHtml } = {
    ...ctx.data,
    rawHtml: ctx.rawHtml || "",
  };

  // 1. AEO Direct Answer & Summary Structure (Heuristic)
  const h2List = headings?.h2 || [];
  const h3List = headings?.h3 || [];
  const hasSubheadings = h2List.length > 0 || h3List.length > 0;
  const hasQuestionHeadings = [...h2List, ...h3List].some((h) =>
    /\b(what|how|why|when|where|which|who|can|is|are|best)\b/i.test(h)
  );

  if (hasQuestionHeadings) {
    results.push({
      ruleId: "AEO_DIRECT_ANSWER_STRUCTURE",
      ruleVersion: "1.0",
      category: "aeo_geo",
      state: "passed",
      severity: "info",
      confidence: 0.8,
      affectedUrl: ctx.pageUrl,
      title: "Question-Formatted Headings Identified (AEO Readiness)",
      explanation: "Headings formatted as explicit user questions help answer engines (Perplexity, Google AI Overviews) extract direct answers for conversational queries.",
      observedValue: "Detected question headings (e.g., FAQ / explanatory style)",
      expectedValue: "Clear questions paired with concise answers",
      remediation: "Ensure the paragraph immediately beneath each question provides a direct, concise 1-2 sentence answer before elaboration.",
      repairSupported: false,
      repairRisk: "low",
    });
  } else if (hasSubheadings) {
    results.push({
      ruleId: "AEO_DIRECT_ANSWER_STRUCTURE",
      ruleVersion: "1.0",
      category: "aeo_geo",
      state: "warning",
      severity: "low",
      confidence: 0.75,
      affectedUrl: ctx.pageUrl,
      title: "Opportunity for Direct-Answer Formatting (AEO Heuristic)",
      explanation: "Subheadings present do not use conversational or question phrases. Formatting relevant headings as questions and answering them directly improves extraction likelihood in AI search engines.",
      observedValue: "Standard topical headings without question formats",
      expectedValue: "Targeted question-style subheadings where appropriate",
      remediation: "Add an FAQ or question-based subheading with a concise answer block for primary user queries.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  // 2. Structured Lists & Tables for Extractability
  const hasListsOrTables =
    rawHtml.includes("<ul") || rawHtml.includes("<ol") || rawHtml.includes("<table");

  if (!hasListsOrTables && wordCount > 250) {
    results.push({
      ruleId: "AEO_STRUCTURED_LISTS",
      ruleVersion: "1.0",
      category: "aeo_geo",
      state: "warning",
      severity: "low",
      confidence: 0.85,
      affectedUrl: ctx.pageUrl,
      title: "No Structured Lists or Tables (Extractability Opportunity)",
      explanation: "Generative search engines favor structured lists and data tables when synthesizing comparisons, steps, or features.",
      observedValue: "Content consists solely of paragraphs without <ul>, <ol>, or <table> elements",
      expectedValue: "Key takeaways, steps, or feature comparisons structured in HTML lists or tables",
      remediation: "Summarize key steps, benefits, or specifications in bullet points or tabular format.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else if (hasListsOrTables) {
    results.push({
      ruleId: "AEO_STRUCTURED_LISTS",
      ruleVersion: "1.0",
      category: "aeo_geo",
      state: "passed",
      severity: "info",
      confidence: 0.9,
      affectedUrl: ctx.pageUrl,
      title: "Structured Lists or Tables Present",
      explanation: "Content utilizes HTML lists or tables, facilitating clean extraction by AI crawlers and answer engines.",
      observedValue: "HTML list/table elements present",
      expectedValue: "Structured HTML data elements",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 3. AI Bot Policy in robots.txt (Informational)
  if (ctx.robotsTxt && ctx.robotsTxt.aiBotDirectives) {
    const aiBots = ctx.robotsTxt.aiBotDirectives;
    const blockedBots = Object.entries(aiBots)
      .filter(([, v]) => v.status === "disallowed")
      .map(([k]) => k);

    if (blockedBots.length > 0) {
      results.push({
        ruleId: "GEO_AI_BOT_ACCESS",
        ruleVersion: "1.0",
        category: "aeo_geo",
        state: "warning",
        severity: "info",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "AI Crawlers Restricted in robots.txt",
        explanation: `robots.txt restricts the following AI bots: ${blockedBots.join(", ")}. Note: AI bots serve distinct purposes—some power search citations (e.g. PerplexityBot), while others train foundation models. Blocking them prevents citation in AI search engines.`,
        observedValue: `Blocked: ${blockedBots.join(", ")}`,
        expectedValue: "Deliberate crawler policy aligned with business goals",
        remediation: "Review AI crawler directives. If you want citations in AI search summaries, consider allowing PerplexityBot and GPTBot while selectively restricting training-only scrapers.",
        repairSupported: true,
        repairRisk: "medium",
      });
    } else {
      results.push({
        ruleId: "GEO_AI_BOT_ACCESS",
        ruleVersion: "1.0",
        category: "aeo_geo",
        state: "passed",
        severity: "info",
        confidence: 1.0,
        affectedUrl: ctx.pageUrl,
        title: "AI Search Bots Permitted",
        explanation: "No blanket robots.txt disallow rules are blocking major AI search crawlers.",
        observedValue: "AI bots permitted or unspecified",
        expectedValue: "Search crawlers permitted",
        remediation: "None required.",
        repairSupported: false,
        repairRisk: "low",
      });
    }
  }

  return results;
}
