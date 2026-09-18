import { RuleEvaluationContext, RuleResult } from "./types";

export function evaluateImageRules(ctx: RuleEvaluationContext): RuleResult[] {
  const results: RuleResult[] = [];
  if (!ctx.data || !ctx.data.images || ctx.data.images.length === 0) {
    results.push({
      ruleId: "IMG_ALT_PRESENT",
      ruleVersion: "1.0",
      category: "images",
      state: "not_applicable",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "No Images Detected",
      explanation: "This page does not contain standard <img> tags.",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
    return results;
  }

  const images = ctx.data.images;
  const missingAltImgs = images.filter((img) => img.alt === undefined);
  const missingDimensions = images.filter((img) => !img.width || !img.height);

  // 1. Missing Alt Attributes
  if (missingAltImgs.length > 0) {
    const sampleSrcs = missingAltImgs.slice(0, 3).map((i) => i.src).join(", ");
    results.push({
      ruleId: "IMG_ALT_PRESENT",
      ruleVersion: "1.0",
      category: "images",
      state: "failed",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: `${missingAltImgs.length} Image(s) Missing Alt Attribute`,
      explanation: `Images without 'alt' attributes harm accessibility for screen readers and prevent image search indexing. Note: purely decorative icons should use an empty alt="" attribute rather than omitting it entirely.`,
      observedValue: `${missingAltImgs.length} images without alt (e.g. ${sampleSrcs})`,
      expectedValue: "All <img> tags have a descriptive alt attribute or intentional empty alt=\"\" for decorative elements",
      evidenceSnippet: `<img src="${missingAltImgs[0].src}">`,
      remediation: "Add descriptive alt text to content images, or alt=\"\" if purely decorative.",
      repairSupported: true,
      repairRisk: "low",
    });
  } else {
    results.push({
      ruleId: "IMG_ALT_PRESENT",
      ruleVersion: "1.0",
      category: "images",
      state: "passed",
      severity: "medium",
      confidence: 1.0,
      affectedUrl: ctx.pageUrl,
      title: "All Images Have Alt Attributes",
      explanation: `All ${images.length} images properly specify an alt attribute.`,
      observedValue: `${images.length}/${images.length} compliant`,
      expectedValue: "All images have alt attribute",
      remediation: "None required.",
      repairSupported: false,
      repairRisk: "low",
    });
  }

  // 2. Explicit Dimensions (CLS Prevention)
  if (missingDimensions.length > 0) {
    results.push({
      ruleId: "IMG_DIMENSIONS_PRESENT",
      ruleVersion: "1.0",
      category: "images",
      state: "warning",
      severity: "low",
      confidence: 0.9,
      affectedUrl: ctx.pageUrl,
      title: `${missingDimensions.length} Image(s) Missing Width/Height`,
      explanation: "Images lacking explicit width and height attributes can cause layout shifts as they load, negatively impacting Core Web Vitals (CLS).",
      observedValue: `${missingDimensions.length} images without width/height attributes`,
      expectedValue: "Explicit width and height attributes or CSS aspect-ratio",
      remediation: "Specify explicit width and height attributes on <img> tags.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  // 3. Lazy loading on the first image (Above the fold risk)
  if (images.length > 0 && images[0].loading === "lazy") {
    results.push({
      ruleId: "IMG_LAZY_ABOVE_FOLD",
      ruleVersion: "1.0",
      category: "images",
      state: "warning",
      severity: "medium",
      confidence: 0.85,
      affectedUrl: ctx.pageUrl,
      title: "Hero / First Image Is Lazy-Loaded",
      explanation: "The first image on the page specifies loading='lazy'. If this is the main hero image above the fold, lazy-loading delays its discovery and harms Largest Contentful Paint (LCP).",
      observedValue: `<img src="${images[0].src}" loading="lazy">`,
      expectedValue: "Eager loading (loading='eager' or fetchpriority='high') for primary above-the-fold images",
      remediation: "Remove loading='lazy' from the first above-the-fold hero image and consider adding fetchpriority='high'.",
      repairSupported: true,
      repairRisk: "low",
    });
  }

  return results;
}
