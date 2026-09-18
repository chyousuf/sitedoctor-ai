import { ConnectionAdapter } from "../adapters/types";
import { BackupManager } from "./backup-manager";

export interface RollbackRequest {
  executionId: string;
  backupStoragePath: string;
}

export interface RollbackResult {
  rollbackId: string;
  restoredCount: number;
  status: "completed" | "failed";
  logs: string[];
}

export class RollbackEngine {
  private backupManager: BackupManager;

  constructor(customBackupDir?: string) {
    this.backupManager = new BackupManager(customBackupDir);
  }

  public async executeRollback(
    adapter: ConnectionAdapter,
    request: RollbackRequest
  ): Promise<RollbackResult> {
    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] Initiating rollback from backup: ${request.backupStoragePath}`);

    // Read original resources from backup
    const originalItems = await this.backupManager.readBackupResources(request.backupStoragePath);
    logs.push(`Retrieved ${originalItems.length} original resource(s) from encrypted snapshot.`);

    let restoredCount = 0;
    for (const item of originalItems) {
      const writeResult = await adapter.writeResource(item.identifier, item.originalContent);
      if (!writeResult.success) {
        throw new Error(`Failed to restore resource: ${item.identifier}`);
      }
      restoredCount++;
      logs.push(`Restored ${item.identifier} to original version (SHA: ${item.originalSha256.slice(0, 8)}).`);
    }

    logs.push("Rollback completed successfully.");

    return {
      rollbackId: `rb_${Date.now()}`,
      restoredCount,
      status: "completed",
      logs,
    };
  }
}
