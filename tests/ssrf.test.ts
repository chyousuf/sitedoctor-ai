import { describe, it, expect } from "vitest";
import { isIpBlocked, validateTargetUrl } from "../src/lib/security/ssrf";

describe("SSRF Protection Guard", () => {
  it("blocks IPv4 loopback (127.0.0.1)", () => {
    expect(isIpBlocked("127.0.0.1")).toBe(true);
    expect(isIpBlocked("127.0.1.5")).toBe(true);
  });

  it("blocks RFC 1918 private subnets (10.x, 172.16-31.x, 192.168.x)", () => {
    expect(isIpBlocked("10.0.0.1")).toBe(true);
    expect(isIpBlocked("10.254.254.254")).toBe(true);
    expect(isIpBlocked("172.16.0.1")).toBe(true);
    expect(isIpBlocked("172.31.255.255")).toBe(true);
    expect(isIpBlocked("192.168.1.1")).toBe(true);
  });

  it("blocks cloud metadata service (169.254.169.254) and link-local", () => {
    expect(isIpBlocked("169.254.169.254")).toBe(true);
    expect(isIpBlocked("169.254.1.1")).toBe(true);
  });

  it("blocks IPv6 loopback (::1) and unique local (fc00::)", () => {
    expect(isIpBlocked("::1")).toBe(true);
    expect(isIpBlocked("fc00::1")).toBe(true);
    expect(isIpBlocked("fe80::1")).toBe(true);
  });

  it("allows valid public IP addresses", () => {
    expect(isIpBlocked("8.8.8.8")).toBe(false);
    expect(isIpBlocked("1.1.1.1")).toBe(false);
    expect(isIpBlocked("93.184.216.34")).toBe(false);
  });

  it("rejects non-http/https protocols", async () => {
    await expect(validateTargetUrl("ftp://example.com/file")).rejects.toThrow(
      /Forbidden protocol/
    );
    await expect(validateTargetUrl("file:///etc/passwd")).rejects.toThrow(
      /Forbidden protocol/
    );
  });

  it("blocks localhost domain aliases", async () => {
    await expect(validateTargetUrl("http://localhost:8080/")).rejects.toThrow(
      /Forbidden local or internal hostname/
    );
    await expect(validateTargetUrl("http://sub.localhost/")).rejects.toThrow(
      /Forbidden local or internal hostname/
    );
  });
});
