import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../src/lib/db";
import { AiRepairGenerator } from "../src/lib/ai/repair-generator";
import { computeSha256 } from "../src/lib/security/vault";
import { computeImmutablePlanHash } from "../src/lib/repairs/state-machine";
import { StaticAdapter } from "../src/lib/adapters/static-adapter";
import { RepairEngine } from "../src/lib/repairs/repair-engine";
import { RollbackEngine } from "../src/lib/repairs/rollback-engine";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("Live API Repair & Rollback Pipeline", () => {
  let stagingDir: string;
  let backupDir: string;

  beforeEach(async () => {
    stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), "sitedoctor-staging-"));
    backupDir = await fs.mkdtemp(path.join(os.tmpdir(), "sitedoctor-backup-"));
  });

  afterEach(async () => {
    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
  });

  it("successfully proposes, approves, applies with backup, and rolls back an issue", async () => {
    // 1. Setup DB fixtures
    const org = await db.organization.upsert({
      where: { slug: "test-org" },
      update: {},
      create: { name: "Test Org", slug: "test-org" },
    });

    const project = await db.project.create({
      data: {
        name: "Test Store",
        domain: "example.com",
        organizationId: org.id,
      },
    });

    const audit = await db.auditJob.create({
      data: {
        projectId: project.id,
        targetUrl: "https://example.com/",
        scopeConfigJson: "{}",
      },
    });

    const finding = await db.ruleFinding.create({
      data: {
        auditJobId: audit.id,
        ruleId: "ONPAGE_TITLE_PRESENT",
        category: "onpage",
        severity: "critical",
        title: "Missing Page Title",
        explanation: "No title tag found on homepage.",
        affectedUrl: "https://example.com/",
        remediation: "Add descriptive <title> tag.",
        repairSupported: true,
      },
    });

    // 2. Propose repair
    const sampleBeforeHtml = `<!DOCTYPE html><html><head></head><body><h1>Welcome</h1></body></html>`;
    const generator = new AiRepairGenerator();
    const { proposal, fullUnifiedDiff, simulatedAfterContent } = await generator.generateProposal({
      finding,
      resourceContent: sampleBeforeHtml,
      resourceIdentifier: "index.html",
    });

    expect(proposal.title).toBeDefined();
    expect(fullUnifiedDiff).toContain("+");
    expect(simulatedAfterContent).toContain("<title>");

    const origSha = computeSha256(sampleBeforeHtml);
    const patches = [
      {
        targetResource: "index.html",
        operation: proposal.patches[0].operation,
        beforeContent: sampleBeforeHtml,
        afterContent: simulatedAfterContent,
        originalSha256: origSha,
        explanation: proposal.explanation,
      },
    ];

    const planHash = computeImmutablePlanHash(patches);

    const plan = await db.repairPlan.create({
      data: {
        projectId: project.id,
        auditJobId: audit.id,
        title: proposal.title,
        summary: proposal.explanation,
        status: "awaiting_approval",
        planHash,
        patches: {
          create: patches.map((p) => ({
            findingId: finding.id,
            targetResource: p.targetResource,
            operation: p.operation,
            beforeContent: p.beforeContent,
            afterContent: p.afterContent,
            unifiedDiff: fullUnifiedDiff,
            originalSha256: p.originalSha256,
            explanation: p.explanation,
          })),
        },
      },
    });

    expect(plan.status).toBe("awaiting_approval");

    // 3. Approve Repair
    const user = await db.user.upsert({
      where: { email: "test-admin@sitedoctor.ai" },
      update: {},
      create: { email: "test-admin@sitedoctor.ai", name: "Admin" },
    });

    const approval = await db.approval.create({
      data: {
        repairPlanId: plan.id,
        userId: user.id,
        boundPlanHash: planHash,
        environment: "production",
      },
    });

    await db.repairPlan.update({
      where: { id: plan.id },
      data: { status: "approved" },
    });

    // 4. Apply Repair
    const targetFile = path.join(stagingDir, "index.html");
    await fs.writeFile(targetFile, sampleBeforeHtml, "utf8");

    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "https://example.com",
      allowedRoot: stagingDir,
    });

    const repairEngine = new RepairEngine(backupDir);
    const execResult = await repairEngine.executeRepair(adapter, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedPlanHash: approval.boundPlanHash,
      patches,
      targetUrl: finding.affectedUrl,
      ruleId: finding.ruleId,
    });

    expect(execResult.status).toBe("completed");
    expect(execResult.verification.passed).toBe(true);

    // Verify file on disk has been updated
    const diskRepaired = await fs.readFile(targetFile, "utf8");
    expect(diskRepaired).toContain("<title>");

    // 5. Rollback
    const rollbackEngine = new RollbackEngine(backupDir);
    const rbResult = await rollbackEngine.executeRollback(adapter, {
      executionId: execResult.executionId,
      backupStoragePath: execResult.backupSnapshot.storagePath,
    });

    expect(rbResult.status).toBe("completed");
    expect(rbResult.restoredCount).toBe(1);

    // Verify file on disk has returned to exact initial state
    const diskRestored = await fs.readFile(targetFile, "utf8");
    expect(diskRestored).toBe(sampleBeforeHtml);
  });
});
