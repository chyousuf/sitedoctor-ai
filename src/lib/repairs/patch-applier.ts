/**
 * Semantic Patch Applier
 * Safely injects or updates SEO and metadata elements into existing HTML
 * preserving the host's actual codebase, scripts, styles, and markup.
 */
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
  // If the target content matches the baseline identically, return afterContent
  if (patch.beforeContent && existingContent.trim() === patch.beforeContent.trim()) {
    return patch.afterContent;
  }

  let modified = existingContent;
  const op = patch.operation;

  // 1. Mobile Viewport Meta Tag
  if (op === "add_viewport") {
    if (!/<meta\s+name=["']viewport["']/i.test(modified)) {
      const viewportTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
      if (/<head[^>]*>/i.test(modified)) {
        modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${viewportTag}`);
      } else {
        modified = `<head>\n  ${viewportTag}\n</head>\n${modified}`;
      }
    }
    return modified;
  }

  // 2. Canonical Link Tag
  if (op === "add_canonical") {
    if (!/<link\s+rel=["']canonical["']/i.test(modified)) {
      const canonicalTag = `<link rel="canonical" href="${targetUrl}">`;
      if (/<head[^>]*>/i.test(modified)) {
        modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${canonicalTag}`);
      } else {
        modified = `<head>\n  ${canonicalTag}\n</head>\n${modified}`;
      }
    }
    return modified;
  }

  // 3. Meta Description
  if (op === "update_meta_description") {
    const match = patch.afterContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const descContent = match ? match[1] : "Optimized page description for search engines.";
    const descTag = `<meta name="description" content="${descContent}">`;

    if (/<meta\s+name=["']description["'][^>]*>/i.test(modified)) {
      modified = modified.replace(/<meta\s+name=["']description["'][^>]*>/i, descTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${descTag}`);
    } else {
      modified = `<head>\n  ${descTag}\n</head>\n${modified}`;
    }
    return modified;
  }

  // 4. Page Title
  if (op === "update_title") {
    const match = patch.afterContent.match(/<title>([^<]+)<\/title>/i);
    const titleText = match ? match[1] : "Optimized Website Title";
    const titleTag = `<title>${titleText}</title>`;

    if (/<title>[^<]*<\/title>/i.test(modified)) {
      modified = modified.replace(/<title>[^<]*<\/title>/i, titleTag);
    } else if (/<head[^>]*>/i.test(modified)) {
      modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${titleTag}`);
    } else {
      modified = `<head>\n  ${titleTag}\n</head>\n${modified}`;
    }
    return modified;
  }

  // 5. Character Encoding (UTF-8)
  if (op === "update_charset") {
    const charsetTag = '<meta charset="utf-8">';
    if (!/<meta\s+charset=/i.test(modified)) {
      if (/<head[^>]*>/i.test(modified)) {
        modified = modified.replace(/(<head[^>]*>)/i, `$1\n  ${charsetTag}`);
      } else {
        modified = `<head>\n  ${charsetTag}\n</head>\n${modified}`;
      }
    }
    return modified;
  }

  // 6. HTML Lang Attribute
  if (op === "update_html_lang") {
    if (/<html(?![^>]*\blang=)/i.test(modified)) {
      modified = modified.replace(/<html/i, '<html lang="en"');
    }
    return modified;
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
    return modified;
  }

  // 8. Update Image Alt / Custom Snippets
  if (patch.beforeSnippet && patch.afterSnippet && modified.includes(patch.beforeSnippet)) {
    return modified.replace(patch.beforeSnippet, patch.afterSnippet);
  }

  // Fallback: return afterContent if nothing else matched
  return patch.afterContent || existingContent;
}
