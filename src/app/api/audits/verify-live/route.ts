import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeFetch } from "@/lib/security/ssrf";
import { extractPageData } from "@/lib/crawler/link-graph";
import { evaluateAllRules } from "@/lib/rules/registry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { findingId } = body;

    if (!findingId) {
      return NextResponse.json({ error: "Missing required findingId" }, { status: 400 });
    }

    const finding = await db.ruleFinding.findUnique({
      where: { id: findingId },
      include: {
        auditJob: true,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    const targetUrl = finding.affectedUrl;
    let rootDomain = "example.com";
    try {
      rootDomain = new URL(targetUrl).hostname;
    } catch {
      // keep fallback
    }

    // 1. Fetch live page directly over HTTP
    const startTime = Date.now();
    let rawHtml = "";
    let httpStatus = 200;
    let finalUrl = targetUrl;
    let hops: string[] = [];

    try {
      const fetchResult = await safeFetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteDoctorAI/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      httpStatus = fetchResult.response.status;
      finalUrl = fetchResult.finalUrl;
      hops = fetchResult.hops;
      rawHtml = await fetchResult.response.text();
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: `Could not connect to live URL (${targetUrl}): ${err.message}`,
      });
    }

    const responseTimeMs = Date.now() - startTime;

    // 2. Extract DOM data from live HTML
    const pageData = extractPageData(rawHtml, finalUrl, rootDomain);

    // 3. Evaluate rules on live page
    const liveResults = evaluateAllRules({
      pageUrl: targetUrl,
      httpStatus,
      responseTimeMs,
      mimeType: "text/html",
      redirectHops: hops,
      finalUrl,
      rawHtml,
      data: pageData,
    });

    // 4. Find the specific rule result for this finding
    const specificResult = liveResults.find((r) => r.ruleId === finding.ruleId);

    const isFixed = specificResult ? specificResult.state === "passed" : false;

    if (isFixed) {
      // Mark as verified on live website!
      await db.ruleFinding.update({
        where: { id: finding.id },
        data: {
          workflowStatus: "verified_live",
          ruleState: "passed",
        },
      });

      return NextResponse.json({
        success: true,
        verified: true,
        liveHttpStatus: httpStatus,
        message: `Live Verification Succeeded! ${finding.title} is active and verified on ${targetUrl}.`,
        observedValue: specificResult?.observedValue,
      });
    } else {
      // Still failing on live site
      await db.ruleFinding.update({
        where: { id: finding.id },
        data: {
          workflowStatus: "open",
          ruleState: specificResult?.state || "failed",
        },
      });

      return NextResponse.json({
        success: true,
        verified: false,
        liveHttpStatus: httpStatus,
        message: `Live Verification Failed: ${finding.title} was NOT detected on ${targetUrl}.`,
        observedValue: specificResult?.observedValue || "Condition still not met on live server",
        expectedValue: specificResult?.expectedValue || finding.expectedValue,
        remediation: specificResult?.remediation || finding.remediation,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
