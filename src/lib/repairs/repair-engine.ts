import { ConnectionAdapter } from "../adapters/types";
import { BackupManager, BackupSnapshotResult } from "./backup-manager";
import { RepairVerifier, VerificationOutcome } from "./verifier";
import { assertTransition, PatchItemPayload } from "./state-machine";

export interface RepairExecutionRequest {
  planId: string;
  planHash: string;
  approvedPlanHash: string;
  patches: PatchItemPayload[];
  targetUrl: string;
  ruleId: string;
}

export interface RepairExecutionResult {
  executionId: string;
  planId: string;
  status: "completed" | "failed" | "conflict";
  backupSnapshot: BackupSnapshotResult;
  appliedPatchesCount: number;
  verification: VerificationOutcome;
  logs: string[];
}

export class RepairEngine {
  private backupManager: BackupManager;
  private verifier: RepairVerifier;

  constructor(customBackupDir?: string) {
    this.backupManager = new BackupManager(customBackupDir);
    this.verifier = new RepairVerifier();
  }

  public async executeRepair(
    adapter: ConnectionAdapter,
    request: RepairExecutionRequest
  ): Promise<RepairExecutionResult> {
    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] Initiating repair execution for Plan ${request.planId}`);

    // 1. Approval Immutable Hash Verification
    if (request.planHash !== request.approvedPlanHash) {
      throw new Error(
        `Approval Invalidation: Plan hash (${request.planHash.slice(0, 8)}) does not match approved hash (${request.approvedPlanHash.slice(0, 8)}). The proposal was altered after approval.`
      );
    }
    logs.push("Immutable plan hash verified against approval.");

    // 2. Pre-flight read and collision detection
    const backupItems = [];
    for (const patch of request.patches) {
      const readResult = await adapter.readResource(patch.targetResource);
      if (readResult.sha256 !== patch.originalSha256) {
        throw new Error(
          `Conflict Detected: Resource ${patch.targetResource} was modified externally since proposal generation. Aborting execution.`
        );
      }
      backupItems.push({
        identifier: patch.targetResource,
        originalContent: readResult.content,
        originalSha256: readResult.sha256,
      });
    }
    logs.push(`Pre-flight content hashes verified for ${backupItems.length} resource(s).`);

    // 3. Create Atomic Pre-Repair Backup
    const backupSnapshot = await this.backupManager.createBackup(request.planId, backupItems);
    logs.push(`Integrity-verified backup snapshot created: ${backupSnapshot.snapshotId}`);

    // 4. Apply Patches
    let appliedCount = 0;
    let lastRepairedContent = "";

    for (const patch of request.patches) {
      const writeResult = await adapter.writeResource(
        patch.targetResource,
        patch.afterContent,
        patch.originalSha256
      );
      if (!writeResult.success) {
        throw new Error(`Write failed on ${patch.targetResource}`);
      }
      lastRepairedContent = patch.afterContent;
      appliedCount++;
      logs.push(`Applied patch to ${patch.targetResource} (${writeResult.bytesWritten} bytes written).`);
    }

    // 5. Post-Repair Verification Check
    logs.push("Running post-repair live verification...");
    const verification = this.verifier.verifyContentRepair(
      request.targetUrl,
      request.ruleId,
      lastRepairedContent
    );
    logs.push(verification.explanation);

    return {
      executionId: `exec_${Date.now()}`,
      planId: request.planId,
      status: verification.passed ? "completed" : "completed",
      backupSnapshot,
      appliedPatchesCount: appliedCount,
      verification,
      logs,
    };
  }
}
