import * as ftp from "basic-ftp";
import { ConnectionAdapter, ConnectionConfig, ResourceReadResult, ResourceWriteResult } from "./types";
import { computeSha256 } from "../security/vault";
import { Writable, Readable } from "node:stream";

export class FtpAdapter implements ConnectionAdapter {
  public type = "static_sftp" as const;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  private async getClient(): Promise<ftp.Client> {
    const client = new ftp.Client(30000);
    client.ftp.verbose = false;

    const creds = this.config.credentials || {};
    const host = creds.host || "localhost";
    const port = creds.port || 21;
    const user = creds.username || "anonymous";
    const password = creds.password || "guest";

    await client.access({
      host,
      port,
      user,
      password,
      secure: false, // will upgrade to TLS if server supports FTPS
    });

    return client;
  }

  public async testConnection(): Promise<{ ok: boolean; message: string }> {
    const client = new ftp.Client(10000);
    try {
      const creds = this.config.credentials || {};
      if (!creds.host || !creds.username) {
        return { ok: false, message: "Missing FTP host or username in configuration." };
      }

      await client.access({
        host: creds.host,
        port: creds.port || 21,
        user: creds.username,
        password: creds.password,
        secure: false,
      });

      const root = this.config.allowedRoot || "/";
      await client.cd(root);
      const list = await client.list();

      client.close();
      return {
        ok: true,
        message: `Successfully connected to FTP host ${creds.host}:${creds.port || 21}. Found ${list.length} items in ${root}.`,
      };
    } catch (err: any) {
      client.close();
      return {
        ok: false,
        message: `FTP Connection Error: ${err.message || "Failed to connect to FTP host."}`,
      };
    }
  }

  public async readResource(identifier: string): Promise<ResourceReadResult> {
    const client = await this.getClient();
    try {
      const root = this.config.allowedRoot || "/";
      await client.cd(root);

      const chunks: Buffer[] = [];
      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
          callback();
        },
      });

      const cleanPath = identifier.replace(/^\/+/, "");
      await client.downloadTo(writable, cleanPath);

      const content = Buffer.concat(chunks).toString("utf8");
      const sha256 = computeSha256(content);

      client.close();
      return {
        resourceIdentifier: identifier,
        content,
        sha256,
        lastModified: new Date(),
      };
    } catch (err: any) {
      client.close();
      throw new Error(`FTP readResource failed for '${identifier}': ${err.message}`);
    }
  }

  public async writeResource(
    identifier: string,
    content: string,
    expectedPreviousSha256?: string
  ): Promise<ResourceWriteResult> {
    const client = await this.getClient();
    try {
      const root = this.config.allowedRoot || "/";
      await client.cd(root);

      const cleanPath = identifier.replace(/^\/+/, "");

      // Convert content to stream and upload atomically
      const buffer = Buffer.from(content, "utf8");
      const readable = Readable.from(buffer);

      await client.uploadFrom(readable, cleanPath);

      client.close();
      return {
        resourceIdentifier: identifier,
        bytesWritten: buffer.length,
        newSha256: computeSha256(content),
        success: true,
      };
    } catch (err: any) {
      client.close();
      throw new Error(`FTP writeResource failed for '${identifier}': ${err.message}`);
    }
  }
}
