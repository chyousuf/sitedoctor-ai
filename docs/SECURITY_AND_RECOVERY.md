# SiteDoctor AI - Security & Disaster Recovery Guide

## 1. Security Architecture & Threat Model

### A. SSRF (Server-Side Request Forgery) Prevention
SiteDoctor AI executes crawls against user-supplied URLs. To protect internal networks, cloud metadata, and container networks, the crawler strictly implements:
1. **Pre-flight DNS Resolution**: Resolves hostnames via `dns.promises.lookup({ all: true })` before issuing any HTTP request.
2. **Blocked CIDRs**:
   - `127.0.0.0/8` (IPv4 Loopback)
   - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918 Private LANs)
   - `169.254.0.0/16` (Link-Local & Cloud Metadata: AWS, GCP, Azure, Oracle at `169.254.169.254`)
   - `100.64.0.0/10` (Carrier-Grade NAT)
   - `::1`, `fe80::/10`, `fc00::/7` (IPv6 loopback, link-local, and unique local addresses)
3. **Redirect Hop Inspection**: Redirects are followed manually hop-by-hop with SSRF checks re-executed on every destination URL to prevent DNS rebinding or redirect-based SSRF.
4. **Protocol Restrictions**: Exclusively permits `http:` and `https:`. Blocks `file:`, `ftp:`, `gopher:`, `dict:`.

### B. Zero-Credential AI Architecture
1. Connection secrets (SFTP passwords, SSH private keys, CMS API tokens, Git tokens) are stored in an AES-256-GCM encrypted vault.
2. The AI recommendation service operates strictly on isolated code snippets and audit evidence.
3. Raw connection secrets are never provided in AI prompts, telemetry, error traces, or client responses.
4. Prompt injection defense: Crawled website text and HTML are encapsulated in rigid delimiter boundaries (`<<<WEBSITE_CONTENT>>>`) with explicit system instructions to treat the enclosed text as untrusted data.

### C. Atomic Write & Conflict Prevention
1. Automatic repairs utilize atomic write semantics: writing to a temporary file (`.tmp_[random]`) and performing an atomic rename.
2. Pre-flight SHA-256 baseline checks ensure that if a resource was changed externally after the proposal was generated, the write is aborted with an explicit conflict error rather than silently overwriting changes.

---

## 2. Disaster Recovery & Rollback

### A. Pre-Flight Backup Snapshots
Before applying any approved repair plan:
1. An encrypted snapshot of the target resource is created in `./storage/backups/`.
2. An immediate readback checksum check is performed. If the checksum does not match, the repair is aborted immediately.

### B. Scoped Rollback Procedure
1. A rollback can be triggered via the UI or the `POST /api/repairs/rollback` endpoint with the `executionId`.
2. The `RollbackEngine` decrypts the original resource snapshot from the verified backup and restores the resource to its exact prior state.
3. Live verification re-evaluates the URL to ensure restoration was successful.
