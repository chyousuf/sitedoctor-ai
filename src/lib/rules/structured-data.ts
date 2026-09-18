import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateStructuredDataRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];
  if (!ctx.data) return results;

  const schemas = ctx.data.jsonLdSchemas;

  if (schemas.length === 0) {
    results.push({
      ruleId: "SCHEMA_JSONLD_PRESENT",
      ruleVersion: "1.0",
      category: "structured_data",
      state: "warning",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "No Structured Data (JSON-LD) Detected",
      explanation: "No JSON-LD structured data was found. Structured data helps search engines and LLMs understand entities, products, organizations, and rich result eligibility.",
      observedValue: "0 JSON-LD scripts",
      expectedValue: "Valid JSON-LD schema (e.g. Organization, Article, BreadcrumbList, WebSite)",
      remediation: "Add Schema.org JSON-LD structured data matching the page content type.",
      repairSupported: true,
      repairRisk: "low",
    });
    return results;
  }

  // Check for parse errors
  const parseErrors = schemas.filter((s) => s._parseError);
  if (parseErrors.length > 0) {
    results.push({
      ruleId: "SCHEMA_SYNTAX_VALID",
      ruleVersion: "1.0",
      category: "structured_data",
      state: "failed",
      severity: "high",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "Invalid JSON-LD Syntax",
      explanation: `${parseErrors.length} JSON-LD block(s) contained invalid JSON syntax and could not be parsed by search engines.`,
      observedValue: "JSON Parse Error in <script type='application/ld+json'>",
      expectedValue: "Well-formed JSON-LD",
      remediation: "Correct JSON formatting, remove trailing commas, and validate against jsonlint/Schema.org.",
      repairSupported: true,
      repairRisk: "low",
    });
    return results;
  }

  // Inspect valid schema types
  const validSchemas = schemas.filter((s) => !s._parseError);
  const foundTypes: string[] = [];

  for (const item of validSchemas) {
    const type = item["@type"];
    if (typeof type === "string") {
      foundTypes.push(type);
    } else if (Array.isArray(type)) {
      foundTypes.push(...type);
    }
  }

  results.push({
    ruleId: "SCHEMA_JSONLD_PRESENT",
    ruleVersion: "1.0",
    category: "structured_data",
    state: "passed",
    severity: "medium",
    confidence: 1.0,
    affectedUrl: ctx.pageUrl,
    title: "Valid Structured Data Present",
    explanation: `Discovered structured data entities: ${foundTypes.join(", ") || "Custom Schema"}.`,
    observedValue: foundTypes.join(", ") || "Found",
    expectedValue: "Valid Schema.org markup",
    remediation: "None required.",
    repairSupported: false,
    repairRisk: "low",
  });

  return results;
}
