import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derives a 32-byte master encryption key from environment or master key string.
 */
function getMasterKey(): Buffer {
  const masterKeyHex =
    process.env.VAULT_MASTER_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  if (masterKeyHex.length === 64) {
    return Buffer.from(masterKeyHex, "hex");
  }

  // If a passphrase was provided instead of 64 hex chars, derive via SHA-256
  return crypto.createHash("sha256").update(masterKeyHex).digest();
}

export interface EncryptedPayload {
  version: number;
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypts a sensitive credential (SFTP password, SSH private key, CMS API key, etc.)
 * Returns a serialized secure string representation.
 */
export function encryptCredential(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Invalid plaintext input to encryptCredential");
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    version: 1,
    iv: iv.toString("hex"),
    tag: authTag.toString("hex"),
    data: encrypted,
  };

  return `enc:v1:${payload.iv}:${payload.tag}:${payload.data}`;
}

/**
 * Decrypts a secure credential string.
 * Strictly isolated to privileged background workers.
 */
export function decryptCredential(encryptedString: string): string {
  if (!encryptedString || !encryptedString.startsWith("enc:v1:")) {
    throw new Error("Malformed or unsupported encrypted credential format");
  }

  const parts = encryptedString.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted payload segment count");
  }

  const [, , ivHex, tagHex, dataHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(dataHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Compute HMAC-SHA256 for non-reversible reference lookup or domain verification token
 */
export function computeVerificationToken(seed: string): string {
  const secret = process.env.APP_SECRET || "fallback-secret-sitedoctor";
  return crypto.createHmac("sha256", secret).update(seed).digest("hex").slice(0, 32);
}

/**
 * Compute SHA256 of file or string content for integrity checks and diff bindings
 */
export function computeSha256(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}
