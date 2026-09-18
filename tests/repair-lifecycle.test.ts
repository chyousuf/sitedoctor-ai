import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { StaticAdapter } from "../src/lib/adapters/static-adapter";
import { RepairEngine } from "../src/lib/repairs/repair-engine";
import { RollbackEngine } from "../src/lib/repairs/rollback-engine";
import { computeImmutablePlanHash } from "../src/lib/repairs/state-machine";
import { computeSha256 } from "../src/lib/security/vault";

describe("End-to-End Safe Repair & Rollback Lifecycle", () => {
  let tempDir: string;
  let backupDir: string;
  let targetFile: string;

  const originalBrokenHtml = `<!DOCTYPE html>
<html>
<head>
  <!-- No title tag -->
</head>
<body>
  <h1>Welcome to Fixture</h1>
</body>
</html>`;

  const repairedHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Repaired by SiteDoctor AI</title>
</head>
<body>
  <h1>Welcome to Fixture</h1>
</body>
</html>`;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sitedoctor-test-site-"));
    backupDir = await fs.mkdtemp(path.join(os.tmpdir(), "sitedoctor-test-backup-"));
    targetFile = path.join(tempDir, "index.html");
    await fs.writeFile(targetFile, originalBrokenHtml, "utf8");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(backupDir, { recursive: true, force: true });
  });

  it("completes Proposal -> Hash Binding -> Backup -> Apply -> Verify -> Rollback flow", async () => {
    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "http://localhost:3000",
      allowedRoot: tempDir,
    });

    const origSha = computeSha256(originalBrokenHtml);

    // 1. Prepare patch
    const patches = [
      {
        targetResource: "index.html",
        operation: "update_title",
        beforeContent: originalBrokenHtml,
        afterContent: repairedHtml,
        originalSha256: origSha,
        explanation: "Injects missing page title",
      },
    ];

    // 2. Compute plan hash and verify approval binding
    const planHash = computeImmutablePlanHash(patches);
    const approvedHash = planHash; // Valid approval matches plan hash

    // 3. Execute Repair via Engine
    const repairEngine = new RepairEngine(backupDir);
    const executionResult = await repairEngine.executeRepair(adapter, {
      planId: "test-plan-001",
      planHash,
      approvedPlanHash: approvedHash,
      patches,
      targetUrl: "https://example.com/index.html",
      ruleId: "ONPAGE_TITLE_PRESENT",
    });

    expect(executionResult.status).toBe("completed");
    expect(executionResult.appliedPatchesCount).toBe(1);
    expect(executionResult.backupSnapshot.verifiedIntegrity).toBe(true);
    expect(executionResult.verification.passed).toBe(true);

    // Assert file on disk was modified to repaired content
    const updatedDiskContent = await fs.readFile(targetFile, "utf8");
    expect(updatedDiskContent).toBe(repairedHtml);

    // 4. Safe Rollback
    const rollbackEngine = new RollbackEngine(backupDir);
    const rollbackResult = await rollbackEngine.executeRollback(adapter, {
      executionId: executionResult.executionId,
      backupStoragePath: executionResult.backupSnapshot.storagePath,
    });

    expect(rollbackResult.status).toBe("completed");
    expect(rollbackResult.restoredCount).toBe(1);

    // Assert file on disk has returned to exact original broken content
    const restoredDiskContent = await fs.readFile(targetFile, "utf8");
    expect(restoredDiskContent).toBe(originalBrokenHtml);
  });

  it("rejects repair when plan hash does not match approval hash (tamper prevention)", async () => {
    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "http://localhost:3000",
      allowedRoot: tempDir,
    });

    const origSha = computeSha256(originalBrokenHtml);
    const patches = [
      {
        targetResource: "index.html",
        operation: "update_title",
        beforeContent: originalBrokenHtml,
        afterContent: repairedHtml,
        originalSha256: origSha,
        explanation: "Injects missing title",
      },
    ];

    const planHash = computeImmutablePlanHash(patches);
    const tamperedApprovalHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const repairEngine = new RepairEngine(backupDir);
    await expect(
      repairEngine.executeRepair(adapter, {
        planId: "test-plan-tampered",
        planHash,
        approvedPlanHash: tamperedApprovalHash,
        patches,
        targetUrl: "https://example.com/",
        ruleId: "ONPAGE_TITLE_PRESENT",
      })
    ).rejects.toThrow(/Approval Invalidation/);
  });

  it("detects conflict and halts if target file is modified externally before apply", async () => {
    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "http://localhost:3000",
      allowedRoot: tempDir,
    });

    const origSha = computeSha256(originalBrokenHtml);

    // Simulate external edit occurring right after proposal was generated!
    await fs.writeFile(targetFile, originalBrokenHtml + "\n<!-- external concurrent edit -->", "utf8");

    const patches = [
      {
        targetResource: "index.html",
        operation: "update_title",
        beforeContent: originalBrokenHtml,
        afterContent: repairedHtml,
        originalSha256: origSha, // Still holds the old SHA
        explanation: "Injects missing title",
      },
    ];

    const planHash = computeImmutablePlanHash(patches);
    const repairEngine = new RepairEngine(backupDir);

    await expect(
      repairEngine.executeRepair(adapter, {
        planId: "test-plan-conflict",
        planHash,
        approvedPlanHash: planHash,
        patches,
        targetUrl: "https://example.com/",
        ruleId: "ONPAGE_TITLE_PRESENT",
      })
    ).rejects.toThrow(/Conflict Detected/);
  });
});
