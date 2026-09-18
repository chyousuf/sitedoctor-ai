# SiteDoctor AI - Architecture & Data Flow

## 1. System Overview
SiteDoctor AI is designed as a modular SaaS platform with strict process and credential isolation:
- **Next.js 15 App Router Frontend**: High-performance dashboard, audit wizards, real-time status visualizers, interactive issue explorer, reviewable code diff viewer, and rollback manager.
- **API Core & Security Guard**: Route handlers enforcing tenant isolation, cryptographic plan hash bindings, and SSRF prevention.
- **SSRF-Shielded Crawler**: Validates hostnames via DNS, strictly blocking private networks, link-local, loopback, and cloud metadata destinations. Follows robots.txt directives, discovers XML sitemaps (including gzip compressed indexes), and normalizes URLs.
- **Versioned Rule Registry & Scoring Engine**: Evaluates 40+ deterministic rules across 6 core technical categories (Crawlability, On-Page SEO, Images, Structured Data, Performance, Quality) and 1 advisory category (AEO & GEO readiness).
- **Provider-Neutral AI Engine**: Generates schema-validated repair proposals without receiving raw credentials, shielded from web prompt injection attacks.
- **Repair Engine & Adapters**: Constrained adapters for Static HTML, WordPress REST API, and Git branches with pre-flight content hash checks, encrypted atomic backups, atomic file replacement, live verification, and scoped rollback.

## 2. Architecture & Data Flow Diagram

```mermaid
flowchart TD
    User([User / SEO Specialist]) -->|1. Submit URL| WebApp[Next.js App UI]
    WebApp -->|2. POST /api/audits| AuditAPI[Audit Router]
    
    subgraph SecurityGuard [Security & Isolation Layer]
        DNSCheck[SSRF DNS Guard & IP Filter]
        Vault[(AES-256-GCM Vault)]
    end

    AuditAPI --> DNSCheck
    DNSCheck -->|3. Valid Target| Crawler[Bounded Web Crawler]
    
    subgraph CrawlEngine [Crawl & Extraction Pipeline]
        Robots[Robots.txt & AI Bot Analyzer]
        Sitemaps[XML & Gzip Sitemap Parser]
        Fetcher[Safe HTTP Fetcher]
        Parser[Cheerio DOM Extractor]
    end

    Crawler --> Robots
    Crawler --> Sitemaps
    Crawler --> Fetcher
    Fetcher --> Parser

    Parser -->|4. Extracted Page Data| RuleEngine[Versioned Rule Registry]
    
    subgraph Rules [Evaluation & Scoring Engine]
        CrawlRules[Crawlability Rules]
        OnPageRules[On-Page SEO Rules]
        ImageRules[Image & Media Rules]
        SchemaRules[Structured Data Rules]
        PerfRules[Performance Rules]
        AeoGeoRules[AEO & GEO Readiness Rules]
        QualityRules[Quality & Security Rules]
        Scoring[Transparent Scoring Formula]
    end

    RuleEngine --> CrawlRules & OnPageRules & ImageRules & SchemaRules & PerfRules & AeoGeoRules & QualityRules
    CrawlRules & OnPageRules & ImageRules & SchemaRules & PerfRules & AeoGeoRules & QualityRules --> Scoring

    Scoring -->|5. Persist Results| DB[(Prisma Database)]

    subgraph RepairLifecycle [Controlled AI Repair Engine]
        AIEngine[Provider-Neutral AI Generator]
        PlanHash[Immutable SHA-256 Plan Binding]
        BackupMgr[Encrypted Backup Manager]
        Adapter[Static / WordPress / Git Adapter]
        Verifier[Live Post-Repair Verifier]
        Rollback[One-Click Rollback Engine]
    end

    WebApp -->|6. Fix with AI| AIEngine
    AIEngine --> PlanHash
    PlanHash -->|7. User Approves| BackupMgr
    BackupMgr -->|8. Pre-Repair Snapshot| PrivateStorage[(Encrypted Backup Storage)]
    BackupMgr -->|9. Atomic Write| Adapter
    Adapter -->|10. Target Website| LiveSite[(Target Website)]
    Adapter --> Verifier
    Verifier -->|11. Post-Repair Verification| WebApp
    Rollback -.->|Revert Changes| Adapter
```

## 3. Key Guarantees
1. **SSRF Hardening**: DNS resolution is performed pre-fetch. Resolving to `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, or IPv6 equivalents immediately aborts the request.
2. **Zero Credential Exposure**: Connection secrets are encrypted with AES-256-GCM. AI prompts only receive isolated snippets and audit evidence.
3. **Atomic File Writes**: Writes are completed to a temporary file on the target filesystem and atomically renamed, avoiding partially written files.
4. **Pre-Flight Conflict Checks**: Target resource SHA-256 is checked against the proposal baseline. External edits result in a Conflict exception rather than a silent overwrite.
