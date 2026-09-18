import zlib from "node:zlib";
import { promisify } from "node:util";

const gunzip = promisify(zlib.gunzip);

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

export interface SitemapParseResult {
  isIndex: boolean;
  urls: SitemapEntry[];
  subSitemaps: string[];
}

/**
 * Parses XML sitemap text or buffer (handling gzip if compressed)
 */
export async function parseSitemap(
  content: string | Buffer,
  isGzipped: boolean = false
): Promise<SitemapParseResult> {
  let xmlText: string;

  if (isGzipped || Buffer.isBuffer(content)) {
    try {
      const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "binary");
      // Check gzip magic bytes: 0x1f, 0x8b
      if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
        const unzipped = await gunzip(buf);
        xmlText = unzipped.toString("utf8");
      } else {
        xmlText = buf.toString("utf8");
      }
    } catch {
      xmlText = typeof content === "string" ? content : content.toString("utf8");
    }
  } else {
    xmlText = content;
  }

  const isIndex = xmlText.includes("<sitemapindex");
  const subSitemaps: string[] = [];
  const urls: SitemapEntry[] = [];

  if (isIndex) {
    const sitemapRegex = /<sitemap>([\s\S]*?)<\/sitemap>/gi;
    let match: RegExpExecArray | null;
    while ((match = sitemapRegex.exec(xmlText)) !== null) {
      const block = match[1];
      const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(block);
      if (locMatch && locMatch[1]) {
        subSitemaps.push(locMatch[1].trim());
      }
    }
  } else {
    const urlRegex = /<url>([\s\S]*?)<\/url>/gi;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(xmlText)) !== null) {
      const block = match[1];
      const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(block);
      const lastmodMatch = /<lastmod>\s*(.*?)\s*<\/lastmod>/i.exec(block);
      const changefreqMatch = /<changefreq>\s*(.*?)\s*<\/changefreq>/i.exec(block);
      const priorityMatch = /<priority>\s*(.*?)\s*<\/priority>/i.exec(block);

      if (locMatch && locMatch[1]) {
        urls.push({
          loc: locMatch[1].trim(),
          lastmod: lastmodMatch?.[1]?.trim(),
          changefreq: changefreqMatch?.[1]?.trim(),
          priority: priorityMatch?.[1]?.trim(),
        });
      }
    }
  }

  return { isIndex, urls, subSitemaps };
}
