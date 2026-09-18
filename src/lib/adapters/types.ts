export type AdapterType =
  | "static_sftp"
  | "static_local"
  | "wordpress_rest"
  | "git_pr"
  | "unsupported_manual";

export interface ConnectionConfig {
  adapterType: AdapterType;
  publicUrl: string;
  allowedRoot: string;
  // Connection secrets are supplied decrypted in isolated worker only
  credentials?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    privateKey?: string;
    apiEndpoint?: string;
    apiToken?: string;
    gitRepoUrl?: string;
    gitBranch?: string;
  };
}

export interface ResourceReadResult {
  resourceIdentifier: string;
  content: string;
  sha256: string;
  lastModified?: Date;
}

export interface ResourceWriteResult {
  resourceIdentifier: string;
  bytesWritten: number;
  newSha256: string;
  success: boolean;
}

export interface ConnectionAdapter {
  type: AdapterType;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  readResource(identifier: string): Promise<ResourceReadResult>;
  writeResource(identifier: string, content: string, expectedPreviousSha256?: string): Promise<ResourceWriteResult>;
}
