import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAuditPipeline } from "@/lib/audit-runner";
import { validateTargetUrl } from "@/lib/security/ssrf";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetUrl, maxPages, projectId } = body;

    if (!targetUrl) {
      return NextResponse.json({ error: "Missing required field: targetUrl" }, { status: 400 });
    }

    // SSRF pre-flight validation
    await validateTargetUrl(targetUrl);

    // Run audit pipeline
    const auditId = await runAuditPipeline({
      targetUrl,
      projectId,
      trigger: projectId ? "manual" : "guest",
      options: {
        maxPages: maxPages ? parseInt(maxPages, 10) : 10,
        maxDepth: 3,
      },
    });

    return NextResponse.json({
      success: true,
      auditId,
      message: "Audit completed successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initiate audit." },
      { status: err.name === "SsrfSecurityError" ? 403 : 500 }
    );
  }
}

export async function GET() {
  try {
    const audits = await db.auditJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        targetUrl: true,
        status: true,
        healthScore: true,
        issuesCount: true,
        pagesCrawled: true,
        coveragePct: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ audits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
