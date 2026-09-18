import { ConnectionAdapter, ConnectionConfig, ResourceReadResult, ResourceWriteResult } from "./types";
import { computeSha256 } from "../security/vault";

export class GitAdapter implements ConnectionAdapter {
  public type = "git_pr" as const;
  private repoUrl: string;
  private baseBranch: string;
  private mockFiles = new Map<string, string>();
  private createdBranches: string[] = [];

  constructor(config: ConnectionConfig) {
    this.repoUrl = config.credentials?.gitRepoUrl || "git@github.com:example/repo.git";
    this.baseBranch = config.credentials?.gitBranch || "main";

    this.mockFiles.set(
      "src/pages/index.tsx",
      `import Head from 'next/head';\nexport default function Home() {\n  return <div>Welcome to our website</div>;\n}`
    );
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    return { ok: true, message: `Connected to Git repository: ${this.repoUrl} (branch: ${this.baseBranch})` };
  }

  public async readResource(identifier: string): Promise<ResourceReadResult> {
    const content = this.mockFiles.get(identifier) || "// empty file\n";
    return {
      resourceIdentifier: identifier,
      content,
      sha256: computeSha256(content),
    };
  }

  public async writeResource(
    identifier: string,
    content: string,
    expectedPreviousSha256?: string
  ): Promise<ResourceWriteResult> {
    const existing = await this.readResource(identifier);
    if (expectedPreviousSha256 && existing.sha256 !== expectedPreviousSha256) {
      throw new Error(`Git source file ${identifier} conflict: branch head has moved.`);
    }

    // Git workflow creates a repair branch and commit rather than force-pushing to main
    const repairBranch = `sitedoctor/repair-${Date.now()}`;
    this.createdBranches.push(repairBranch);
    this.mockFiles.set(identifier, content);

    return {
      resourceIdentifier: `${identifier} [Branch: ${repairBranch}]`,
      bytesWritten: Buffer.byteLength(content, "utf8"),
      newSha256: computeSha256(content),
      success: true,
    };
  }

  public getCreatedBranches(): string[] {
    return [...this.createdBranches];
  }
}
