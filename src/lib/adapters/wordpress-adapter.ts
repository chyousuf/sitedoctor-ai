import { ConnectionAdapter, ConnectionConfig, ResourceReadResult, ResourceWriteResult } from "./types";
import { computeSha256 } from "../security/vault";

export class WordPressAdapter implements ConnectionAdapter {
  public type = "wordpress_rest" as const;
  private apiEndpoint: string;
  private apiToken?: string;
  private isMockMode: boolean;
  private mockStore = new Map<string, string>();

  constructor(config: ConnectionConfig) {
    this.apiEndpoint = config.credentials?.apiEndpoint || `${config.publicUrl}/wp-json/wp/v2`;
    this.apiToken = config.credentials?.apiToken;
    this.isMockMode = !this.apiToken || config.publicUrl.includes("mock") || config.publicUrl.includes("test");

    // Initialize mock store for testing
    this.mockStore.set(
      "post:1",
      JSON.stringify({
        id: 1,
        title: { rendered: "Sample WordPress Blog Post" },
        content: { rendered: "<p>Original post content without schema or description.</p>" },
        meta: {
          _yoast_wpseo_title: "",
          _yoast_wpseo_metadesc: "",
        },
      })
    );
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (this.isMockMode) {
      return { ok: true, message: "Connected to WordPress REST API (Mock Simulator)" };
    }

    try {
      const res = await fetch(`${this.apiEndpoint}/posts?per_page=1`, {
        headers: { Authorization: `Bearer ${this.apiToken}` },
      });
      if (!res.ok) {
        return { ok: false, message: `WordPress API error: HTTP ${res.status}` };
      }
      return { ok: true, message: "Successfully authenticated with WordPress REST API" };
    } catch (err: any) {
      return { ok: false, message: `WordPress connection failed: ${err.message}` };
    }
  }

  public async readResource(identifier: string): Promise<ResourceReadResult> {
    if (this.isMockMode) {
      const content = this.mockStore.get(identifier) || JSON.stringify({ id: identifier, title: "" });
      return {
        resourceIdentifier: identifier,
        content,
        sha256: computeSha256(content),
      };
    }

    const postId = identifier.replace(/^post:/, "");
    const res = await fetch(`${this.apiEndpoint}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to read WordPress post ${postId}: HTTP ${res.status}`);
    }

    const json = await res.json();
    const content = JSON.stringify(json);
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
      throw new Error(
        `WordPress post ${identifier} has been modified externally since proposal was created. Update aborted.`
      );
    }

    if (this.isMockMode) {
      this.mockStore.set(identifier, content);
      return {
        resourceIdentifier: identifier,
        bytesWritten: Buffer.byteLength(content, "utf8"),
        newSha256: computeSha256(content),
        success: true,
      };
    }

    const postId = identifier.replace(/^post:/, "");
    const parsedData = JSON.parse(content);

    const res = await fetch(`${this.apiEndpoint}/posts/${postId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiToken}`,
      },
      body: JSON.stringify(parsedData),
    });

    if (!res.ok) {
      throw new Error(`Failed to update WordPress post ${postId}: HTTP ${res.status}`);
    }

    return {
      resourceIdentifier: identifier,
      bytesWritten: Buffer.byteLength(content, "utf8"),
      newSha256: computeSha256(content),
      success: true,
    };
  }
}
