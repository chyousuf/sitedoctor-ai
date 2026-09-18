/**
 * Semantic Patch Applier
 * Safely injects, updates, or deduplicates SEO and metadata elements into existing HTML
 * preserving the host's actual codebase, scripts, styles, and markup.
 */

/**
 * Deduplicates and cleans common head metadata tags to prevent duplicate viewports,
 * canonical tags, descriptions, titles, or charsets.
 */
export function cleanupHeadDuplicates(html: string, targetUrl?: string): string {
  let res = html;

  // 1. Deduplicate viewport tags (keep only the first standard one)
  const viewportMatches = res.match(/<meta\s+[^>]*name=["']viewport["'][^>]*>\s*/gi);
  if (viewportMatches && viewportMatches.length > 1) {
    let keptFirst = false;
    res = res.replace(/<meta\s+[^>]*name=["']viewport["'][^>]*>\s*/gi, () => {
      if (!keptFirst) {
        keptFirst = true;
        return '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n    ';
      }
      return "";
    });
  }

  // 2. Deduplicate canonical link tags & remove placeholder example.com tags
  const canonicalMatches = res.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi);
  if (canonicalMatches && canonicalMatches.length > 0) {
    let keptFirst = false;
    res = res.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/gi, (match) => {
      // If match points to dummy example.com and targetUrl is available, rewrite it
      if (match.includes("example.com") && targetUrl && !targetUrl.includes("example.com")) {
        if (!keptFirst) {
          keptFirst = true;
          return `<link rel="canonical" href="${targetUrl}">\n    `;
        }
        return "";
      }
      if (!keptFirst) {
        keptFirst = true;
        return match;
      }
      return "";
    });
  }

  // 3. Deduplicate title tags (keep only the first one)
  const titleMatches = res.match(/<title>[\s\S]*?<\/title>\s*/gi);
  if (titleMatches && titleMatches.length > 1) {
    let keptFirst = false;
    res = res.replace(/<title>[\s\S]*?<\/title>\s*/gi, (match) => {
      if (!keptFirst) {
        keptFirst = true;
        return match;
      }
      return "";
    });
  }

  // 4. Deduplicate meta description tags (keep only the first one)
  const descMatches = res.match(/<meta\s+[^>]*name=["']description["'][^>]*>\s*/gi);
  if (descMatches && descMatches.length > 1) {
    let keptFirst = false;
    res = res.replace(/<meta\s+[^>]*name=["']description["'][^>]*>\s*/gi, (match) => {
      if (!keptFirst) {
        keptFirst = true;
        return match;
      }
      return "";
    });
  }

  // 5. Deduplicate charset tags
  const charsetMatches = res.match(/<meta\s+charset=[^>]*>\s*/gi);
  if (charsetMatches && charsetMatches.length > 1) {
    let keptFirst = false;
    res = res.replace(/<meta\s+charset=[^>]*>\s*/gi, () => {
      if (!keptFirst) {
        keptFirst = true;
        return '<meta charset="UTF-8">\n    ';
      }
      return "";
    });
  }

  return res;
}

export function applySemanticPatch(
  existingContent: string,
  patch: {
    operation: string;
    beforeContent?: string;
    afterContent: string;
    targetResource?: string;
    explanation?: string;
    beforeSnippet?: string;
    afterSnippet?: string;
  },
  targetUrl: string
): string {
  // If the target content matches the baseline identically, return cleaned up afterContent
  if (patch.beforeContent && existingContent.trim() === patch.beforeContent.trim()) {
    return cleanupHeadDuplicates(patch.afterContent, targetUrl);
  }

  let modified = existingContent;
  const op = patch.operation;

  // 1. Mobile Viewport Meta Tag: Update existing tag or insert once into <head>
  if (op === "add_viewport") {
    const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    if (/<meta\s+[^>]*name=["']viewport["'][^>]*>/i.test(modified)) {
      // Replace existing viewport meta tag
      modified = modified.replace(/<meta\s+[^>]*name=["']viewport["'][^>]*>/i, viewportTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>\s*)/i, `$1${viewportTag}\n    `);
    } else {
      modified = `<head>\n    ${viewportTag}\n</head>\n${modified}`;
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 2. Canonical Link Tag: Update existing tag or insert once into <head>
  if (op === "add_canonical") {
    let validUrl = targetUrl;
    if ((!validUrl || validUrl.includes("example.com")) && patch.afterContent) {
      const match = patch.afterContent.match(/<link\s+[^>]*href=["']([^"']+)["']/i);
      if (match && !match[1].includes("example.com")) {
        validUrl = match[1];
      }
    }
    const canonicalTag = `<link rel="canonical" href="${validUrl}">`;

    if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(modified)) {
      // Replace existing canonical link tag
      modified = modified.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i, canonicalTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>\s*)/i, `$1${canonicalTag}\n    `);
    } else {
      modified = `<head>\n    ${canonicalTag}\n</head>\n${modified}`;
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 3. Meta Description: Update existing tag or insert once into <head>
  if (op === "update_meta_description") {
    const match = patch.afterContent.match(/<meta\s+[^>]*content=["']([^"']+)["']/i);
    const descContent = match ? match[1] : "Optimized page description for search engines.";
    const descTag = `<meta name="description" content="${descContent}">`;

    if (/<meta\s+[^>]*name=["']description["'][^>]*>/i.test(modified)) {
      // Replace existing meta description tag
      modified = modified.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/i, descTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>\s*)/i, `$1${descTag}\n    `);
    } else {
      modified = `<head>\n    ${descTag}\n</head>\n${modified}`;
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 4. Page Title: Update existing tag or insert once into <head>
  if (op === "update_title") {
    const match = patch.afterContent.match(/<title>([^<]+)<\/title>/i);
    const titleText = match ? match[1] : "Optimized Website Title";
    const titleTag = `<title>${titleText}</title>`;

    if (/<title>[^<]*<\/title>/i.test(modified)) {
      // Replace existing title tag
      modified = modified.replace(/<title>[^<]*<\/title>/i, titleTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>\s*)/i, `$1${titleTag}\n    `);
    } else {
      modified = `<head>\n    ${titleTag}\n</head>\n${modified}`;
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 5. Character Encoding (UTF-8): Update existing charset or insert once
  if (op === "update_charset") {
    const charsetTag = '<meta charset="utf-8">';
    if (/<meta\s+charset=[^>]*>/i.test(modified)) {
      modified = modified.replace(/<meta\s+charset=[^>]*>/i, charsetTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>\s*)/i, `$1${charsetTag}\n    `);
    } else {
      modified = `<head>\n    ${charsetTag}\n</head>\n${modified}`;
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 6. HTML Lang Attribute
  if (op === "update_html_lang") {
    if (/<html(?![^>]*\blang=)/i.test(modified)) {
      modified = modified.replace(/<html/i, '<html lang="en"');
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 7. Inject Schema (JSON-LD)
  if (op === "inject_schema") {
    const schemaMatch = patch.afterContent.match(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i);
    const schemaTag = schemaMatch ? schemaMatch[0] : "";
    if (schemaTag && !modified.includes(schemaTag)) {
      if (/<\/head>/i.test(modified)) {
        modified = modified.replace(/<\/head>/i, `  ${schemaTag}\n</head>`);
      } else if (/<head[^>]*>/i.test(modified)) {
        modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${schemaTag}`);
      } else {
        modified = `<head>\n  ${schemaTag}\n</head>\n${modified}`;
      }
    }
    return cleanupHeadDuplicates(modified, targetUrl);
  }

  // 8. Update Image Alt / Custom Snippets
  if (patch.beforeSnippet && patch.afterSnippet && modified.includes(patch.beforeSnippet)) {
    return cleanupHeadDuplicates(modified.replace(patch.beforeSnippet, patch.afterSnippet), targetUrl);
  }

  // Fallback: return cleaned up afterContent or existingContent
  return cleanupHeadDuplicates(patch.afterContent || existingContent, targetUrl);
}
