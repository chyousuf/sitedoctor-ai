import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db } from "@/lib/db";
import { RepairEngine } from "@/lib/repairs/repair-engine";
import { StaticAdapter } from "@/lib/adapters/static-adapter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = body;

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

    // Set up working staging directory for this project/repair
    const targetDir = path.resolve("./storage/site-roots/default");
    await fs.mkdir(targetDir, { recursive: true });

    // Initialize adapter
    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "http://localhost:3000",
      allowedRoot: targetDir,
    });

    // Write original before-content if file doesn't exist yet
    for (const patch of plan.patches) {
      const filePath = path.join(targetDir, patch.targetResource);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, patch.beforeContent, "utf8");
      }
    }

    // Execute repair
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
      targetUrl: "https://example.com/",
      ruleId: plan.patches[0]?.finding?.ruleId || "ONPAGE_TITLE_PRESENT",
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

    // Save execution and verification
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

    // Update Plan and Finding status
    await db.repairPlan.update({
      where: { id: plan.id },
      data: { status: "completed" },
    });

    for (const p of plan.patches) {
      if (p.findingId) {
        await db.ruleFinding.update({
          where: { id: p.findingId },
          data: { workflowStatus: "fixed" },
        });
      }
    }

    return NextResponse.json({
      success: true,
      executionId: executionRecord.id,
      backupId: backupRecord.id,
      verification: result.verification,
      logs: result.logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
