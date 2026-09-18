import { describe, it, expect } from "vitest";
import { encryptCredential, decryptCredential, computeSha256 } from "../src/lib/security/vault";
import { redactSecrets } from "../src/lib/security/redactor";

describe("Credential Vault & Secret Redactor", () => {
  it("encrypts and decrypts secrets with AES-256-GCM authentication", () => {
    const rawSecret = "super-sensitive-sftp-password-12345!@#$%";
    const encrypted = encryptCredential(rawSecret);

    expect(encrypted).toMatch(/^enc:v1:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    expect(encrypted).not.toContain(rawSecret);

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("fails decryption if auth tag or ciphertext is tampered with", () => {
    const rawSecret = "api-token-test";
    const encrypted = encryptCredential(rawSecret);
    const parts = encrypted.split(":");
    // Tamper with data segment
    parts[4] = parts[4].slice(0, -2) + "00";
    const tampered = parts.join(":");

    expect(() => decryptCredential(tampered)).toThrow();
  });

  it("redacts sensitive passwords, tokens, and vault ciphertexts from strings", () => {
    const rawLog =
      'User connection failed: password="supersecret" and Bearer eyJhbGciOiJIUzI1Ni. With token: "my-secret-token" and enc:v1:1234:5678:abcd';
    const cleaned = redactSecrets(rawLog);

    expect(cleaned).not.toContain("supersecret");
    expect(cleaned).not.toContain("my-secret-token");
    expect(cleaned).not.toContain("enc:v1:1234:5678:abcd");
    expect(cleaned).toContain("[REDACTED]");
    expect(cleaned).toContain("[REDACTED_VAULT_CIPHERTEXT]");
  });

  it("computes deterministic SHA-256 checksums", () => {
    const text = "SiteDoctor AI Integrity Test";
    const hash1 = computeSha256(text);
    const hash2 = computeSha256(text);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
