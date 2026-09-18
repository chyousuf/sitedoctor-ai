# SiteDoctor AI - Scope & Assumptions

## 1. Product Objective
SiteDoctor AI is a production-oriented SaaS platform that audits websites for SEO, technical health, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO), and enables users to safely repair supported issues using AI with cryptographic approval bindings, pre-flight backups, live verification, and one-click rollbacks.

## 2. Reasonable Architectural Assumptions
1. **Separation of Concerns**:
   - Audits operate deterministically on publicly accessible HTML, robots.txt, and sitemaps.
   - Repairs require explicit, tested adapters (Static SFTP/local, WordPress REST API, or Git Pull Requests) with configured permissions.
   - For unsupported systems (Drupal, Webflow, custom frameworks without configured adapters), the system provides findings, reviewable unified diffs, and manual instructions without implying changes were applied.
2. **Deterministic Health vs. Heuristic AEO/GEO**:
   - Technical health is evaluated through 6 core categories with published formulas and weights.
   - AEO & GEO readiness is an independent advisory signal (0-100) assessing direct answers, question headings, structured lists, and AI crawler access policies. We do not promise guaranteed rankings, traffic increases, or universal AI citations.
3. **Zero-Credential AI Policy**:
   - Connection credentials (SFTP passwords, SSH private keys, API tokens) are strictly stored in an AES-256-GCM encrypted vault.
   - Raw credentials never touch AI prompts, logs, browser storage, or API responses.
   - Prompt injection defense: All crawled content is strictly contained in untrusted boundary tags (`<<<WEBSITE_CONTENT>>>`) with rigid system instructions preventing prompt overriding.
4. **Approval & Write Immutability**:
   - No repair can be applied without explicit user approval bound to an immutable SHA-256 hash of the proposed patch.
   - If a file or CMS record was modified externally after the proposal was generated, the pre-flight SHA-256 check detects a conflict and aborts write.
   - Pre-repair atomic backups are integrity-verified (readback checksum check) before any disk write.

## 3. Supported vs. Unsupported Scopes
| Capability | Supported in Current Release | Planned Roadmap | Explicitly Unsupported |
| :--- | :--- | :--- | :--- |
| **Audit Engine** | Any public HTTP/HTTPS site, sitemaps, robots.txt, SSRF-filtered | JS rendering via Playwright worker | Private intranets without authorized customer agent tunnel |
| **Static Sites** | Local directory, SFTP, HTML files | FTPS | Server daemon configs (nginx/apache outside root) |
| **WordPress** | REST API, Yoast/RankMath metadata, post headers | Custom theme hooks | Direct blind SQL string replacement, core file edits |
| **Git Sites** | Dedicated branch creation, atomic commits, PR workflows | Automated preview deployment check | Force-pushing to protected main branch |
| **AI Citations** | Informational crawler access audit (GPTBot, Perplexity) | Live monitored citation tracking queries | Claiming universal AI citation scores |
