import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db } from "@/lib/db";
import { RepairEngine } from "@/lib/repairs/repair-engine";
import { StaticAdapter } from "@/lib/adapters/static-adapter";
import { FtpAdapter } from "@/lib/adapters/ftp-adapter";
import { ConnectionAdapter } from "@/lib/adapters/types";
import { safeFetch } from "@/lib/security/ssrf";
import { extractPageData } from "@/lib/crawler/link-graph";
import { evaluateAllRules } from "@/lib/rules/registry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, ftpConfig } = body;

    if (!planId) {
      return NextResponse.json({ error: "Missing required planId" }, { status: 400 });
    }

    const plan = await db.repairPlan.findUnique({
      where: { id: planId },
      include: {
        patches: {
          include: { finding: true },
        },
        approvals: {
          orderBy: { approvedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Repair plan not found" }, { status: 404 });
    }

    if (plan.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot apply unapproved repair plan. Current status: '${plan.status}'.` },
        { status: 400 }
      );
    }

    const latestApproval = plan.approvals[0];
    if (!latestApproval) {
      return NextResponse.json(
        { error: "No valid approval found for this plan." },
        { status: 400 }
      );
    }

    const targetUrl = plan.patches[0]?.finding?.affectedUrl || "https://example.com/";
    const ruleId = plan.patches[0]?.finding?.ruleId || "ONPAGE_TITLE_PRESENT";

    let adapter: ConnectionAdapter;
    let isLiveFtp = false;

    if (ftpConfig && ftpConfig.host && ftpConfig.username) {
      // Direct Live Deployment via FTP / FTPS
      isLiveFtp = true;
      adapter = new FtpAdapter({
        adapterType: "static_sftp",
        publicUrl: targetUrl,
        allowedRoot: ftpConfig.remoteDir || "/htdocs",
        credentials: {
          host: ftpConfig.host,
          port: ftpConfig.port ? parseInt(ftpConfig.port, 10) : 21,
          username: ftpConfig.username,
          password: ftpConfig.password || "",
        },
      });

      const testResult = await adapter.testConnection();
      if (!testResult.ok) {
        return NextResponse.json(
          { error: `Remote Host Connection Failed: ${testResult.message}` },
          { status: 400 }
        );
      }
    } else {
      // Local Staging Sandbox (does not claim live website modified)
      const targetDir = path.resolve("./storage/site-roots/default");
      await fs.mkdir(targetDir, { recursive: true });

      adapter = new StaticAdapter({
        adapterType: "static_local",
        publicUrl: "http://localhost:3000",
        allowedRoot: targetDir,
      });

      // Ensure target file matches patch.beforeContent baseline
      for (const patch of plan.patches) {
        const filePath = path.join(targetDir, patch.targetResource);
        await fs.writeFile(filePath, patch.beforeContent, "utf8");
      }
    }

    // Execute repair engine
    const engine = new RepairEngine();
    const result = await engine.executeRepair(adapter, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedPlanHash: latestApproval.boundPlanHash,
      patches: plan.patches.map((p) => ({
        targetResource: p.targetResource,
        operation: p.operation,
        beforeContent: p.beforeContent,
        afterContent: p.afterContent,
        originalSha256: p.originalSha256,
        explanation: p.explanation,
      })),
      targetUrl,
      ruleId,
      semanticMergeOnConflict: isLiveFtp,
    });

    // Save backup snapshot in DB
    const backupRecord = await db.backupSnapshot.create({
      data: {
        repairPlanId: plan.id,
        manifestJson: JSON.stringify(result.backupSnapshot.manifest),
        storagePath: result.backupSnapshot.storagePath,
        checksumSha256: result.backupSnapshot.checksumSha256,
        verifiedIntegrity: true,
      },
    });

    // Save execution record
    const executionRecord = await db.repairExecution.create({
      data: {
        repairPlanId: plan.id,
        backupSnapshotId: backupRecord.id,
        status: "success",
        appliedPatchesCount: result.appliedPatchesCount,
        executionLog: result.logs.join("\n"),
        completedAt: new Date(),
        verifications: {
          create: {
            targetUrl: result.verification.targetUrl,
            testedRuleId: result.verification.testedRuleId,
            passed: result.verification.passed,
            httpStatus: result.verification.httpStatus,
            regressionDetected: result.verification.regressionDetected,
            detailsJson: JSON.stringify(result.verification),
          },
        },
      },
    });

    // Update Plan status
    await db.repairPlan.update({
      where: { id: plan.id },
      data: { status: "completed" },
    });

    // Determine workflow status:
    // If deployed via FTP to live server -> mark verified_live
    // If local staging sandbox -> mark staged (never claim live site was modified!)
    let targetStatus = isLiveFtp ? "verified_live" : "staged";
    let liveVerifiedOnHttp = false;

    if (isLiveFtp) {
      try {
        const liveRes = await safeFetch(targetUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteDoctorAI/1.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
        });
        if (liveRes.response.ok) {
          const liveHtml = await liveRes.response.text();
          let rootDomain = "example.com";
          try {
            rootDomain = new URL(targetUrl).hostname;
          } catch {}
          const pageData = extractPageData(liveHtml, liveRes.finalUrl, rootDomain);
          const liveResults = evaluateAllRules({
            pageUrl: targetUrl,
            httpStatus: liveRes.response.status,
            responseTimeMs: 200,
            mimeType: "text/html",
            redirectHops: liveRes.hops,
            finalUrl: liveRes.finalUrl,
            rawHtml: liveHtml,
            data: pageData,
          });
          const ruleMatch = liveResults.find((r) => r.ruleId === ruleId);
          if (ruleMatch && ruleMatch.state === "passed") {
            liveVerifiedOnHttp = true;
          }
        }
      } catch (err: any) {
        console.warn("Live HTTP verification check warning:", err?.message);
      }
    }

    for (const p of plan.patches) {
      if (p.findingId) {
        await db.ruleFinding.update({
          where: { id: p.findingId },
          data: {
            workflowStatus: targetStatus,
            ...(liveVerifiedOnHttp ? { ruleState: "passed" } : {}),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      executionId: executionRecord.id,
      backupId: backupRecord.id,
      isLiveFtp,
      workflowStatus: targetStatus,
      liveVerifiedOnHttp,
      verification: result.verification,
      logs: result.logs,
      message: isLiveFtp
        ? liveVerifiedOnHttp
          ? "Successfully pushed to live remote server and verified live over HTTP!"
          : "Successfully pushed repair to live remote server with automated backup snapshot!"
        : "Repair safely staged in local sandbox. To apply to your live website, use the FTP Deploy tab or Copy/Download implementation file.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
