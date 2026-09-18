import { db } from "./db";
import { BoundedCrawler, CrawlOptions, CrawledPage } from "./crawler/crawler";
import { evaluateAllRules } from "./rules/registry";
import { calculateAuditScores } from "./rules/scoring";
import { RuleResult } from "./rules/types";

export interface StartAuditInput {
  targetUrl: string;
  projectId?: string;
  trigger?: "manual" | "guest" | "schedule";
  options?: CrawlOptions;
}

export async function runAuditPipeline(input: StartAuditInput): Promise<string> {
  const scopeConfig = {
    maxPages: input.options?.maxPages ?? 10,
    maxDepth: input.options?.maxDepth ?? 3,
    includePaths: input.options?.includePaths ?? [],
    excludePaths: input.options?.excludePaths ?? [],
  };

  // 1. Create Job in DB
  const auditJob = await db.auditJob.create({
    data: {
      projectId: input.projectId,
      targetUrl: input.targetUrl,
      status: "crawling",
      trigger: input.trigger || "manual",
      scopeConfigJson: JSON.stringify(scopeConfig),
      startedAt: new Date(),
    },
  });

  // Run crawler
  try {
    const crawler = new BoundedCrawler(input.targetUrl, scopeConfig);
    const crawlResult = await crawler.crawl();

    // 2. Persist crawled pages and evaluate rules
    await db.auditJob.update({
      where: { id: auditJob.id },
      data: { status: "analyzing" },
    });

    const allFindings: RuleResult[] = [];
    let savedPageCount = 0;

    for (const [url, page] of crawlResult.crawledPages.entries()) {
      const pageCrawl = await db.pageCrawl.create({
        data: {
          auditJobId: auditJob.id,
          url,
          depth: page.depth,
          httpStatus: page.httpStatus,
          responseTimeMs: page.responseTimeMs,
          mimeType: page.mimeType,
          title: page.data?.title,
          metaDescription: page.data?.metaDescription,
          canonicalUrl: page.data?.canonicalUrl,
          contentHash: page.contentHash,
          domStatsJson: JSON.stringify({
            wordCount: page.data?.wordCount || 0,
            headingsCount: (page.data?.headings.h1.length || 0) + (page.data?.headings.h2.length || 0),
            imagesCount: page.data?.images.length || 0,
            linksCount: page.data?.links.length || 0,
          }),
        },
      });
      savedPageCount++;

      // Evaluate rules for this page
      const pageResults = evaluateAllRules({
        pageUrl: url,
        httpStatus: page.httpStatus,
        responseTimeMs: page.responseTimeMs,
        mimeType: page.mimeType,
        redirectHops: page.redirectHops,
        finalUrl: page.finalUrl,
        rawHtml: page.rawHtml,
        data: page.data,
        robotsTxt: crawlResult.robotsTxt,
        sitemapUrls: crawlResult.sitemapUrls,
      });

      allFindings.push(...pageResults);

      // Persist failed or warning findings in DB
      for (const res of pageResults) {
        if (res.state === "failed" || res.state === "warning") {
          await db.ruleFinding.create({
            data: {
              auditJobId: auditJob.id,
              pageCrawlId: pageCrawl.id,
              ruleId: res.ruleId,
              ruleVersion: res.ruleVersion,
              category: res.category,
              severity: res.severity,
              confidence: res.confidence,
              affectedUrl: url,
              title: res.title,
              explanation: res.explanation,
              observedValue: res.observedValue,
              expectedValue: res.expectedValue,
              evidenceSnippet: res.evidenceSnippet,
              remediation: res.remediation,
              repairSupported: res.repairSupported,
              repairRisk: res.repairRisk,
              workflowStatus: "open",
              ruleState: res.state,
            },
          });
        }
      }
    }

    // 3. Compute Transparent Scores
    const scoringReport = calculateAuditScores(allFindings);

    // 4. Update AuditJob to completed
    await db.auditJob.update({
      where: { id: auditJob.id },
      data: {
        status: "completed",
        pagesCrawled: savedPageCount,
        pagesDiscovered: crawlResult.discoveredUrlsCount,
        issuesCount: scoringReport.totalIssuesCount,
        healthScore: scoringReport.overallHealthScore,
        coveragePct: scoringReport.coveragePercentage,
        categoryScoresJson: JSON.stringify(scoringReport.categoryScores),
        summaryJson: JSON.stringify({
          aeoGeoReadiness: scoringReport.aeoGeoReadinessScore,
          orphanPagesCount: crawlResult.orphanPages.length,
          orphanPages: crawlResult.orphanPages.slice(0, 10),
          durationMs: crawlResult.durationMs,
        }),
        completedAt: new Date(),
      },
    });

    return auditJob.id;
  } catch (err: any) {
    await db.auditJob.update({
      where: { id: auditJob.id },
      data: {
        status: "failed",
        errorMessage: err.message || "Audit execution encountered an unhandled error.",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}
