import dns from "node:dns/promises";
import net from "node:net";

export class SsrfSecurityError extends Error {
  constructor(message: string) {
    super(`SSRF Security Violation: ${message}`);
    this.name = "SsrfSecurityError";
  }
}

/**
 * IP Blocklist ranges to prevent SSRF against localhost, private LANs,
 * cloud metadata endpoints (169.254.169.254), and reserved networks.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local, AWS/GCP/Azure metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Test-Net documentation)
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // ::1 (Loopback)
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  // :: (Unspecified)
  if (normalized === "::" || normalized === "0:0:0:0:0:0:0:0") return true;

  // IPv4 mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:")) {
    const v4Part = normalized.replace("::ffff:", "");
    if (net.isIPv4(v4Part)) {
      return isPrivateOrReservedIpv4(v4Part);
    }
  }

  // fe80::/10 (Link-local)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || 
      normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true;
  }

  // fc00::/7 (Unique local / private address)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  return false;
}

export function isIpBlocked(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateOrReservedIpv4(ip);
  } else if (version === 6) {
    return isPrivateOrReservedIpv6(ip);
  }
  return true; // Unknown/invalid IP format is blocked by default
}

/**
 * Validate a target URL before fetching:
 * 1. Protocol must be http: or https:
 * 2. Hostname must be present
 * 3. Resolves all DNS records and asserts none are private/loopback/cloud metadata
 */
export async function validateTargetUrl(rawUrl: string): Promise<{ url: URL; resolvedIps: string[] }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfSecurityError(`Malformed URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfSecurityError(`Forbidden protocol: ${parsed.protocol}. Only http and https are allowed.`);
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname.trim() === "") {
    throw new SsrfSecurityError("Missing hostname");
  }

  // If the hostname itself is an IP literal
  if (net.isIP(hostname)) {
    if (isIpBlocked(hostname)) {
      throw new SsrfSecurityError(`Direct access to private or reserved IP address (${hostname}) is blocked.`);
    }
    return { url: parsed, resolvedIps: [hostname] };
  }

  // Block localhost aliases explicitly
  if (
    hostname.toLowerCase() === "localhost" ||
    hostname.toLowerCase().endsWith(".localhost") ||
    hostname.toLowerCase().endsWith(".local") ||
    hostname.toLowerCase().endsWith(".internal")
  ) {
    throw new SsrfSecurityError(`Forbidden local or internal hostname: ${hostname}`);
  }

  // Resolve DNS records
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new SsrfSecurityError(`DNS resolution failed for ${hostname}: ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new SsrfSecurityError(`DNS resolution returned zero records for ${hostname}`);
  }

  const resolvedIps = addresses.map((a) => a.address);
  for (const record of addresses) {
    if (isIpBlocked(record.address)) {
      throw new SsrfSecurityError(
        `DNS for ${hostname} resolved to protected IP (${record.address}). Request blocked.`
      );
    }
  }

  return { url: parsed, resolvedIps };
}

export interface SafeFetchOptions extends RequestInit {
  maxRedirects?: number;
  timeoutMs?: number;
  maxResponseSizeBytes?: number;
}

import crypto from "node:crypto";

function trySolveByetHostCookie(html: string): string | null {
  const match = html.match(
    /toNumbers\("([0-9a-fA-F]+)"\)[^"]*toNumbers\("([0-9a-fA-F]+)"\)[^"]*toNumbers\("([0-9a-fA-F]+)"\)/
  );
  if (!match) return null;

  const toBuffer = (hex: string) => {
    const bytes: number[] = [];
    hex.replace(/(..)/g, (byte) => {
      bytes.push(parseInt(byte, 16));
      return "";
    });
    return Buffer.from(bytes);
  };

  const a = toBuffer(match[1]);
  const b = toBuffer(match[2]);
  const c = toBuffer(match[3]);

  try {
    const decipher = crypto.createDecipheriv("aes-128-cbc", a, b);
    decipher.setAutoPadding(false);
    let decrypted = decipher.update(c);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("hex");
  } catch {
    return null;
  }
}

/**
 * SSRF-Safe HTTP fetch that follows redirects safely, re-validating each hop against SSRF rules.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ response: Response; finalUrl: string; hops: string[] }> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxResponseSizeBytes = options.maxResponseSizeBytes ?? 10 * 1024 * 1024; // 10 MB

  let currentUrl = targetUrl;
  const hops: string[] = [];

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    hops.push(currentUrl);
    // Validate target URL and DNS before fetching
    await validateTargetUrl(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        ...options,
        redirect: "manual", // Handle redirects manually to inspect each hop!
        signal: controller.signal,
        headers: {
          "User-Agent": "SiteDoctorAI-Bot/1.0 (+https://sitedoctor.ai/bot)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...options.headers,
        },
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms for ${currentUrl}`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // Check redirect status codes (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error(`Redirect status ${res.status} returned without Location header.`);
      }

      // Resolve relative redirects safely against current URL
      const nextUrl = new URL(location, currentUrl).toString();

      if (redirectCount === maxRedirects) {
        throw new Error(`Exceeded maximum redirect limit (${maxRedirects})`);
      }

      currentUrl = nextUrl;
      continue;
    }

    // Check response size if Content-Length header is present
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxResponseSizeBytes) {
      throw new Error(
        `Response size ${contentLength} bytes exceeds limit of ${maxResponseSizeBytes} bytes.`
      );
    }

    // Check if response is a free-host bot protection challenge (e.g. ByetHost / InfinityFree aes.js)
    const contentType = res.headers.get("content-type") || "";
    if (res.status === 200 && contentType.includes("text/html")) {
      const bodyClone = res.clone();
      const bodyText = await bodyClone.text();
      if (bodyText.includes("/aes.js") && bodyText.includes("slowAES.decrypt")) {
        const testCookie = trySolveByetHostCookie(bodyText);
        if (testCookie) {
          // Re-fetch with the computed __test cookie
          const cookieHeader = options.headers
            ? { ...options.headers, Cookie: `__test=${testCookie}` }
            : { Cookie: `__test=${testCookie}` };

          return safeFetch(currentUrl, {
            ...options,
            headers: cookieHeader,
          });
        }
      }
    }

    return { response: res, finalUrl: currentUrl, hops };
  }

  throw new Error("Unexpected loop termination in safeFetch");
}
