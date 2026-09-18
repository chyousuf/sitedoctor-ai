export interface NormalizerOptions {
  stripTrackingParams?: boolean;
  stripAllQueryParams?: boolean;
  enforceTrailingSlash?: boolean | null; // true = force slash, false = strip slash, null = preserve
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_eid",
  "_hsenc",
  "_hsmi",
  "ref",
]);

/**
 * Normalizes URLs for crawling, index comparison, and duplicate detection.
 */
export function normalizeUrl(rawUrl: string, baseUrl?: string, options: NormalizerOptions = {}): string | null {
  try {
    let resolved: URL;
    if (baseUrl) {
      resolved = new URL(rawUrl, baseUrl);
    } else {
      resolved = new URL(rawUrl);
    }

    // Protocol must be http or https
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }

    // Lowercase hostname
    resolved.hostname = resolved.hostname.toLowerCase();

    // Remove default ports
    if ((resolved.protocol === "http:" && resolved.port === "80") ||
        (resolved.protocol === "https:" && resolved.port === "443")) {
      resolved.port = "";
    }

    // Strip hash fragment
    resolved.hash = "";

    // Handle query parameters
    if (options.stripAllQueryParams) {
      resolved.search = "";
    } else if (options.stripTrackingParams !== false) {
      // By default, strip common analytics/tracking query params but keep content params (id, page, slug, filter)
      const params = new URLSearchParams(resolved.search);
      const keysToDelete: string[] = [];
      for (const key of params.keys()) {
        if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((k) => params.delete(k));
      // Sort remaining params to prevent duplicate URL states (?a=1&b=2 vs ?b=2&a=1)
      params.sort();
      resolved.search = params.toString() ? `?${params.toString()}` : "";
    }

    // Trailing slash policy on paths without file extensions
    let pathname = resolved.pathname;
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
    if (!hasExtension && pathname.length > 1) {
      if (options.enforceTrailingSlash === true && !pathname.endsWith("/")) {
        pathname += "/";
      } else if (options.enforceTrailingSlash === false && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }
    }
    resolved.pathname = pathname;

    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * Detect crawl traps:
 * 1. Path length > 300 chars
 * 2. Repeating path segments: e.g. /category/electronics/category/electronics
 * 3. Deep folder nesting > 10 levels
 */
export function isCrawlTrap(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const path = parsed.pathname;

    // Overly long URL
    if (urlStr.length > 400 || path.length > 250) {
      return true;
    }

    const segments = path.split("/").filter(Boolean);

    // Deep folder nesting
    if (segments.length > 9) {
      return true;
    }

    // Repeating segments check
    const counts = new Map<string, number>();
    for (const seg of segments) {
      const lower = seg.toLowerCase();
      counts.set(lower, (counts.get(lower) || 0) + 1);
      if ((counts.get(lower) || 0) >= 3) {
        return true; // 3 or more repeated directory names is a classic CMS crawl trap
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Determine if a URL is internal to the host or root domain
 */
export function isInternalUrl(targetUrl: string, baseDomain: string): boolean {
  try {
    const targetHost = new URL(targetUrl).hostname.toLowerCase();
    const baseHost = new URL(baseDomain.startsWith("http") ? baseDomain : `https://${baseDomain}`).hostname.toLowerCase();

    // Exact host match or target is subdomain of base
    return targetHost === baseHost || targetHost.endsWith(`.${baseHost}`);
  } catch {
    return false;
  }
}
