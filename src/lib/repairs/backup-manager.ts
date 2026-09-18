import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { computeSha256, encryptCredential, decryptCredential } from "../security/vault";

export interface BackupResourceItem {
  identifier: string;
  originalContent: string;
  originalSha256: string;
}

export interface BackupSnapshotResult {
  snapshotId: string;
  storagePath: string;
  checksumSha256: string;
  verifiedIntegrity: boolean;
  manifest: {
    createdAt: string;
    resources: { identifier: string; sha256: string }[];
  };
}

export class BackupManager {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = path.resolve(customDir || process.env.STORAGE_LOCAL_DIR || "./storage/backups");
  }

  /**
   * Creates an encrypted backup of the target resources and verifies integrity
   */
  public async createBackup(
    planId: string,
    resources: BackupResourceItem[]
  ): Promise<BackupSnapshotResult> {
    await fs.mkdir(this.baseDir, { recursive: true });

    const snapshotId = `bk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const storagePath = path.join(this.baseDir, `${snapshotId}.json`);

    const manifestData = {
      snapshotId,
      planId,
      createdAt: new Date().toISOString(),
      resources: resources.map((r) => ({
        identifier: r.identifier,
        sha256: r.originalSha256,
        encryptedContent: encryptCredential(r.originalContent),
      })),
    };

    const serialized = JSON.stringify(manifestData, null, 2);
    const checksumSha256 = computeSha256(serialized);

    // Atomic write to disk
    const tmpPath = `${storagePath}.tmp`;
    await fs.writeFile(tmpPath, serialized, "utf8");
    await fs.rename(tmpPath, storagePath);

    // Immediate Integrity Verification Readback
    const readback = await fs.readFile(storagePath, "utf8");
    const readbackSha = computeSha256(readback);

    if (readbackSha !== checksumSha256) {
      // Abort write operation immediately if backup is corrupt!
      await fs.unlink(storagePath).catch(() => {});
      throw new Error(
        `Pre-repair backup integrity verification failed for plan ${planId}. SHA mismatch.`
      );
    }

    return {
      snapshotId,
      storagePath,
      checksumSha256,
      verifiedIntegrity: true,
      manifest: {
        createdAt: manifestData.createdAt,
        resources: resources.map((r) => ({ identifier: r.identifier, sha256: r.originalSha256 })),
      },
    };
  }

  /**
   * Restores original resource contents from verified backup
   */
  public async readBackupResources(storagePath: string): Promise<BackupResourceItem[]> {
    const raw = await fs.readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw);

    const items: BackupResourceItem[] = [];
    for (const res of parsed.resources) {
      const originalContent = decryptCredential(res.encryptedContent);
      items.push({
        identifier: res.identifier,
        originalContent,
        originalSha256: res.sha256,
      });
    }

    return items;
  }
}
