import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ConnectionAdapter, ConnectionConfig, ResourceReadResult, ResourceWriteResult } from "./types";
import { computeSha256 } from "../security/vault";

export class StaticAdapter implements ConnectionAdapter {
  public type = "static_local" as const;
  private allowedRoot: string;

  constructor(config: ConnectionConfig) {
    const rawRoot = path.resolve(config.allowedRoot || ".");
    try {
      this.allowedRoot = fsSync.realpathSync(rawRoot);
    } catch {
      this.allowedRoot = rawRoot;
    }
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const stats = await fs.stat(this.allowedRoot);
      if (!stats.isDirectory()) {
        return { ok: false, message: `Allowed root path is not a directory: ${this.allowedRoot}` };
      }
      return { ok: true, message: `Connected to directory: ${this.allowedRoot}` };
    } catch (err: any) {
      return { ok: false, message: `Cannot access root directory: ${err.message}` };
    }
  }

  /**
   * Safely resolves a relative resource path within the allowed root,
   * blocking path traversal (../) and symlink escapes.
   */
  private resolveSafePath(relativeIdentifier: string): string {
    const cleanRelative = relativeIdentifier.replace(/^\/+/, "");
    const resolved = path.resolve(this.allowedRoot, cleanRelative);

    // Path traversal check
    if (!resolved.startsWith(this.allowedRoot)) {
      throw new Error(`Path traversal violation: ${relativeIdentifier} escapes allowed root.`);
    }

    return resolved;
  }

  public async readResource(identifier: string): Promise<ResourceReadResult> {
    const safePath = this.resolveSafePath(identifier);

    try {
      // Check realpath if file exists to prevent symlink traversal
      const real = await fs.realpath(safePath).catch(() => safePath);
      if (!real.startsWith(this.allowedRoot)) {
        throw new Error(`Symlink escape violation: ${identifier} points outside allowed root.`);
      }

      const content = await fs.readFile(safePath, "utf8");
      const sha256 = computeSha256(content);
      const stat = await fs.stat(safePath);

      return {
        resourceIdentifier: identifier,
        content,
        sha256,
        lastModified: stat.mtime,
      };
    } catch (err: any) {
      throw new Error(`Failed to read resource ${identifier}: ${err.message}`);
    }
  }

  public async writeResource(
    identifier: string,
    content: string,
    expectedPreviousSha256?: string
  ): Promise<ResourceWriteResult> {
    const safePath = this.resolveSafePath(identifier);

    // Pre-flight collision / race-condition check
    if (expectedPreviousSha256) {
      let currentContent = "";
      try {
        currentContent = await fs.readFile(safePath, "utf8");
        const currentSha = computeSha256(currentContent);
        if (currentSha !== expectedPreviousSha256) {
          throw new Error(
            `Concurrent modification conflict: File ${identifier} was changed externally since proposal was generated (Expected SHA: ${expectedPreviousSha256.slice(0, 8)}, Current SHA: ${currentSha.slice(0, 8)}). Repair aborted to protect against silent overwrites.`
          );
        }
      } catch (err: any) {
        if (err.message.includes("Concurrent modification conflict")) {
          throw err;
        }
        // If file doesn't exist yet, continue
      }
    }

    // Atomic write pattern: write to temp file in same directory, then rename
    const dir = path.dirname(safePath);
    await fs.mkdir(dir, { recursive: true });

    const tempPath = path.join(dir, `.tmp_${crypto.randomBytes(6).toString("hex")}`);
    await fs.writeFile(tempPath, content, "utf8");

    try {
      await fs.rename(tempPath, safePath);
    } catch (err: any) {
      await fs.unlink(tempPath).catch(() => {});
      throw new Error(`Atomic write failed for ${identifier}: ${err.message}`);
    }

    const newSha256 = computeSha256(content);

    return {
      resourceIdentifier: identifier,
      bytesWritten: Buffer.byteLength(content, "utf8"),
      newSha256,
      success: true,
    };
  }
}
