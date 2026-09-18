import { safeFetch } from "../security/ssrf";
import { computeSha256 } from "../security/vault";
import { normalizeUrl, isInternalUrl, isCrawlTrap } from "./url-normalizer";
import { parseRobotsTxt, isPathAllowed, RobotsAnalysis } from "./robots";
import { parseSitemap, SitemapEntry } from "./sitemap";
import { extractPageData, PageExtraction } from "./link-graph";

export interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
  requestDelayMs?: number;
  maxConcurrency?: number;
  userAgent?: string;
  customSitemapUrl?: string;
}

export interface CrawledPage {
  url: string;
  depth: number;
  httpStatus: number;
  responseTimeMs: number;
  mimeType: string;
  redirectHops: string[];
  finalUrl: string;
  data?: PageExtraction;
  contentHash?: string;
  rawHtml?: string;
  error?: string;
  isOrphan?: boolean;
  orphanEvidence?: string;
}

export interface CrawlResult {
  targetUrl: string;
  rootDomain: string;
  robotsTxt: RobotsAnalysis | null;
  sitemapUrls: SitemapEntry[];
  crawledPages: Map<string, CrawledPage>;
  discoveredUrlsCount: number;
  orphanPages: string[];
  durationMs: number;
}

export type CrawlPhase =
  | "robots"
  | "sitemap"
  | "crawling"
  | "analyzing"
  | "completed"
  | "failed";

export type ProgressCallback = (progress: {
  phase: CrawlPhase;
  crawledCount: number;
  queueCount: number;
  currentUrl?: string;
}) => void;

export class BoundedCrawler {
  private targetUrl: string;
  private rootDomain: string;
  private options: Required<CrawlOptions>;
  private crawled = new Map<string, CrawledPage>();
  private queue: { url: string; depth: number }[] = [];
  private enqueued = new Set<string>();
  private robotsTxt: RobotsAnalysis | null = null;
  private sitemapUrls: SitemapEntry[] = [];
  private onProgress?: ProgressCallback;

  constructor(targetUrl: string, options: CrawlOptions = {}, onProgress?: ProgressCallback) {
    const parsed = new URL(targetUrl);
    this.targetUrl = targetUrl;
    this.rootDomain = parsed.hostname;
    this.onProgress = onProgress;
    this.options = {
      maxPages: options.maxPages ?? 25,
      maxDepth: options.maxDepth ?? 3,
      includePaths: options.includePaths ?? [],
      excludePaths: options.excludePaths ?? [],
      requestDelayMs: options.requestDelayMs ?? 150,
      maxConcurrency: options.maxConcurrency ?? 2,
      userAgent: options.userAgent ?? "SiteDoctorAI-Bot/1.0 (+https://sitedoctor.ai/bot)",
      customSitemapUrl: options.customSitemapUrl ?? "",
    };
  }

  public async crawl(): Promise<CrawlResult> {
    const startTime = Date.now();

    // 1. Robots.txt discovery
    this.reportProgress("robots", 0, 1, `${this.targetUrl}/robots.txt`);
    await this.fetchRobotsTxt();

    // 2. Sitemap discovery
    this.reportProgress("sitemap", 0, 1);
    await this.discoverSitemaps();

    // 3. Initialize queue with normalized seed URL
    const seed = normalizeUrl(this.targetUrl);
    if (!seed) {
      throw new Error(`Invalid target seed URL: ${this.targetUrl}`);
    }

    this.queue.push({ url: seed, depth: 0 });
    this.enqueued.add(seed);

    // Also seed from sitemap if available (up to limit)
    for (const entry of this.sitemapUrls.slice(0, 10)) {
      const norm = normalizeUrl(entry.loc);
      if (norm && !this.enqueued.has(norm) && isInternalUrl(norm, this.rootDomain)) {
        this.queue.push({ url: norm, depth: 1 });
        this.enqueued.add(norm);
      }
    }

    // 4. Crawl loop with concurrency and rate limiting
    this.reportProgress("crawling", 0, this.queue.length);

    while (this.queue.length > 0 && this.crawled.size < this.options.maxPages) {
      const item = this.queue.shift()!;

      // Skip if exceeds max depth
      if (item.depth > this.options.maxDepth) {
        continue;
      }

      // Check path exclusions
      if (this.isPathExcluded(item.url)) {
        continue;
      }

      // Check robots.txt rules
      if (this.robotsTxt && this.robotsTxt.directives.length > 0) {
        const path = new URL(item.url).pathname;
        if (!isPathAllowed(path, this.options.userAgent, this.robotsTxt.directives)) {
          this.crawled.set(item.url, {
            url: item.url,
            depth: item.depth,
            httpStatus: 403,
            responseTimeMs: 0,
            mimeType: "text/plain",
            redirectHops: [],
            finalUrl: item.url,
            error: "Blocked by robots.txt",
          });
          continue;
        }
      }

      // Fetch page
      this.reportProgress("crawling", this.crawled.size, this.queue.length, item.url);
      const pageResult = await this.crawlSinglePage(item.url, item.depth);
      this.crawled.set(item.url, pageResult);

      // Extract new links if HTML was returned
      if (pageResult.data && pageResult.data.links) {
        for (const link of pageResult.data.links) {
          if (
            link.isInternal &&
            !link.isNoFollow &&
            !this.enqueued.has(link.normalizedUrl) &&
            !isCrawlTrap(link.normalizedUrl) &&
            this.enqueued.size < this.options.maxPages * 5
          ) {
            this.enqueued.add(link.normalizedUrl);
            this.queue.push({ url: link.normalizedUrl, depth: item.depth + 1 });
          }
        }
      }

      // Polite throttling
      if (this.options.requestDelayMs > 0 && this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, this.options.requestDelayMs));
      }
    }

    // 5. Correlate orphan pages from sitemap
    const crawledUrlSet = new Set(Array.from(this.crawled.keys()));
    const orphanPages: string[] = [];
    for (const entry of this.sitemapUrls) {
      const norm = normalizeUrl(entry.loc);
      if (norm && !crawledUrlSet.has(norm)) {
        orphanPages.push(norm);
      }
    }

    this.reportProgress("completed", this.crawled.size, 0);

    return {
      targetUrl: this.targetUrl,
      rootDomain: this.rootDomain,
      robotsTxt: this.robotsTxt,
      sitemapUrls: this.sitemapUrls,
      crawledPages: this.crawled,
      discoveredUrlsCount: this.enqueued.size,
      orphanPages,
      durationMs: Date.now() - startTime,
    };
  }

  private async crawlSinglePage(url: string, depth: number): Promise<CrawledPage> {
    const pageStartTime = Date.now();
    try {
      const { response, finalUrl, hops } = await safeFetch(url, {
        headers: { "User-Agent": this.options.userAgent },
      });

      const responseTimeMs = Date.now() - pageStartTime;
      const httpStatus = response.status;
      const contentType = response.headers.get("content-type") || "text/html";
      const mimeType = contentType.split(";")[0].trim().toLowerCase();

      // Only parse HTML content
      if (mimeType.includes("text/html") || mimeType.includes("application/xhtml+xml")) {
        const rawHtml = await response.text();
        const contentHash = computeSha256(rawHtml);
        const data = extractPageData(rawHtml, finalUrl, this.rootDomain);

        return {
          url,
          depth,
          httpStatus,
          responseTimeMs,
          mimeType,
          redirectHops: hops,
          finalUrl,
          data,
          contentHash,
          rawHtml,
        };
      }

      return {
        url,
        depth,
        httpStatus,
        responseTimeMs,
        mimeType,
        redirectHops: hops,
        finalUrl,
      };
    } catch (err: any) {
      return {
        url,
        depth,
        httpStatus: 0,
        responseTimeMs: Date.now() - pageStartTime,
        mimeType: "error",
        redirectHops: [],
        finalUrl: url,
        error: err.message || "Failed to fetch page",
      };
    }
  }

  private async fetchRobotsTxt(): Promise<void> {
    try {
      const parsed = new URL(this.targetUrl);
      const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
      const { response } = await safeFetch(robotsUrl, { timeoutMs: 5000 });
      if (response.ok) {
        const text = await response.text();
        this.robotsTxt = parseRobotsTxt(text, robotsUrl);
      }
    } catch {
      this.robotsTxt = null;
    }
  }

  private async discoverSitemaps(): Promise<void> {
    const candidateUrls: string[] = [];

    if (this.options.customSitemapUrl) {
      candidateUrls.push(this.options.customSitemapUrl);
    }
    if (this.robotsTxt && this.robotsTxt.sitemaps.length > 0) {
      candidateUrls.push(...this.robotsTxt.sitemaps);
    }

    const parsed = new URL(this.targetUrl);
    candidateUrls.push(
      `${parsed.protocol}//${parsed.host}/sitemap.xml`,
      `${parsed.protocol}//${parsed.host}/sitemap_index.xml`
    );

    const visited = new Set<string>();

    for (const sitemapUrl of candidateUrls) {
      if (visited.has(sitemapUrl)) continue;
      visited.add(sitemapUrl);

      try {
        const { response } = await safeFetch(sitemapUrl, { timeoutMs: 8000 });
        if (!response.ok) continue;

        const isGzipped = sitemapUrl.endsWith(".gz");
        let content: string | Buffer;
        if (isGzipped) {
          const arrayBuf = await response.arrayBuffer();
          content = Buffer.from(arrayBuf);
        } else {
          content = await response.text();
        }

        const parseResult = await parseSitemap(content, isGzipped);
        if (parseResult.isIndex) {
          // Traverse up to 3 sub-sitemaps
          for (const sub of parseResult.subSitemaps.slice(0, 3)) {
            candidateUrls.push(sub);
          }
        } else {
          this.sitemapUrls.push(...parseResult.urls);
        }

        if (this.sitemapUrls.length >= 100) break;
      } catch {
        // Sitemap discovery is best-effort
      }
    }
  }

  private isPathExcluded(urlStr: string): boolean {
    try {
      const path = new URL(urlStr).pathname;
      for (const ex of this.options.excludePaths) {
        if (path.startsWith(ex) || path.includes(ex)) return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  private reportProgress(
    phase: CrawlPhase,
    crawledCount: number,
    queueCount: number,
    currentUrl?: string
  ) {
    if (this.onProgress) {
      this.onProgress({ phase, crawledCount, queueCount, currentUrl });
    }
  }
}
