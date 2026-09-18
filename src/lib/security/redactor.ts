/**
 * Zero-leak Redactor to strip secrets, keys, and tokens from error logs,
 * event traces, and reports.
 */

const SENSITIVE_PATTERNS = [
  // Password / Secret parameters in query strings or JSON
  /(["']?(?:password|passwd|secret|api_?key|token|access_?token|auth|private_?key)["']?\s*[:=]\s*["'])([^"'\s]+)(["'])/gi,
  // Bearer tokens
  /Bearer\s+([A-Za-z0-9\-_=.]+)/gi,
  // RSA/EC Private keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
  // Vault encrypted strings
  /enc:v\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+/gi,
];

export function redactSecrets(input: string): string {
  if (!input || typeof input !== "string") return input;

  let redacted = input;

  // Mask private keys completely
  redacted = redacted.replace(
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi,
    "[REDACTED_PRIVATE_KEY]"
  );

  // Mask vault encrypted strings
  redacted = redacted.replace(
    /enc:v\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+/gi,
    "[REDACTED_VAULT_CIPHERTEXT]"
  );

  // Mask Bearer tokens
  redacted = redacted.replace(/Bearer\s+([A-Za-z0-9\-_=.]+)/gi, "Bearer [REDACTED_TOKEN]");

  // Mask key-value secrets
  redacted = redacted.replace(
    /(["']?(?:password|passwd|secret|api_?key|token|access_?token|auth|private_?key)["']?\s*[:=]\s*["'])([^"'\s]+)(["'])/gi,
    "$1[REDACTED]$3"
  );

  return redacted;
}

export function safeLog(message: string, ...meta: any[]): void {
  const cleanMsg = redactSecrets(message);
  const cleanMeta = meta.map((m) => {
    if (typeof m === "string") return redactSecrets(m);
    if (typeof m === "object" && m !== null) {
      try {
        return JSON.parse(redactSecrets(JSON.stringify(m)));
      } catch {
        return "[Unserializable Object]";
      }
    }
    return m;
  });

  console.log(cleanMsg, ...cleanMeta);
}
