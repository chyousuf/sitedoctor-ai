# SiteDoctor AI - API Contracts & Endpoint Reference

All endpoints return JSON responses. Errors use standard HTTP status codes (`400`, `403`, `404`, `409`, `500`) with `{ "error": "description" }`.

---

## 1. Audits & Crawl Jobs

### `POST /api/audits`
Initiates a new crawl and audit pipeline.

**Request Body**:
```json
{
  "targetUrl": "https://example.com",
  "maxPages": 10,
  "projectId": "optional-project-id"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "auditId": "cly1234567890",
  "message": "Audit completed successfully."
}
```

**Error Response (403 Forbidden - SSRF Violation)**:
```json
{
  "error": "SSRF Security Violation: Direct access to private or reserved IP address (127.0.0.1) is blocked."
}
```

---

### `GET /api/audits`
Returns recent audits across the organization.

**Success Response (200 OK)**:
```json
{
  "audits": [
    {
      "id": "cly1234567890",
      "targetUrl": "https://example.com",
      "status": "completed",
      "healthScore": 88,
      "issuesCount": 4,
      "pagesCrawled": 10,
      "coveragePct": 92,
      "createdAt": "2026-09-18T16:50:00.000Z"
    }
  ]
}
```

---

### `GET /api/audits/:id`
Fetches comprehensive audit details, category score breakdown, crawled pages, and rule findings.

**Success Response (200 OK)**:
```json
{
  "audit": {
    "id": "cly1234567890",
    "targetUrl": "https://example.com",
    "status": "completed",
    "healthScore": 88,
    "coveragePct": 92,
    "pagesCrawled": 10,
    "categoryScores": {
      "crawlability": { "score": 95, "passedCount": 5, "warningCount": 1, "failedCount": 0, "totalTested": 6 },
      "onpage": { "score": 85, "passedCount": 4, "warningCount": 2, "failedCount": 1, "totalTested": 7 },
      "performance": { "score": 90, "passedCount": 3, "warningCount": 0, "failedCount": 0, "totalTested": 3 },
      "structured_data": { "score": 75, "passedCount": 1, "warningCount": 1, "failedCount": 0, "totalTested": 2 },
      "quality": { "score": 100, "passedCount": 3, "warningCount": 0, "failedCount": 0, "totalTested": 3 },
      "images": { "score": 80, "passedCount": 2, "warningCount": 1, "failedCount": 0, "totalTested": 3 },
      "aeo_geo": { "score": 75, "passedCount": 2, "warningCount": 1, "failedCount": 0, "totalTested": 3 }
    },
    "summary": {
      "aeoGeoReadiness": 75,
      "orphanPagesCount": 0,
      "orphanPages": []
    },
    "findings": [
      {
        "id": "find_123",
        "ruleId": "ONPAGE_TITLE_PRESENT",
        "category": "onpage",
        "severity": "critical",
        "title": "Missing Page Title",
        "explanation": "No <title> tag was found.",
        "observedValue": "No <title> tag found",
        "expectedValue": "A unique, descriptive <title> tag between 30 and 60 characters",
        "repairSupported": true,
        "repairRisk": "low",
        "workflowStatus": "open"
      }
    ],
    "pages": [
      {
        "id": "pg_123",
        "url": "https://example.com/",
        "httpStatus": 200,
        "responseTimeMs": 110,
        "depth": 0,
        "title": "Example Domain"
      }
    ]
  }
}
```

---

## 2. Controlled AI Repair Lifecycle

### `POST /api/repairs/propose`
Generates a schema-validated repair proposal with unified diff without passing secrets to the AI.

**Request Body**:
```json
{
  "findingId": "find_123",
  "resourceIdentifier": "index.html",
  "rawSnippet": "<!DOCTYPE html><html><head></head><body><h1>Welcome</h1></body></html>"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "plan": {
    "id": "plan_abc123",
    "status": "awaiting_approval",
    "planHash": "3f8b7e6d5c4a...",
    "estimatedRisk": "low",
    "blastRadiusPages": 1
  },
  "proposal": {
    "title": "Add Descriptive Page Title Tag",
    "explanation": "Injects an optimized <title> tag into <head>.",
    "auditEvidenceCited": "Finding ONPAGE_TITLE_PRESENT: No <title> tag found on target page.",
    "riskLevel": "low",
    "confidence": 0.98
  },
  "unifiedDiff": "--- original\n+++ proposed repair\n@@ -1,4 +1,5 @@\n <head>\n+  <title>Optimized Page Title</title>\n </head>"
}
```

---

### `POST /api/repairs/approve`
Approves a repair plan and cryptographically binds approval to the immutable plan hash.

**Request Body**:
```json
{
  "planId": "plan_abc123",
  "boundPlanHash": "3f8b7e6d5c4a...",
  "comment": "Approved by Lead SEO"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "approval": {
    "id": "appr_987",
    "repairPlanId": "plan_abc123",
    "boundPlanHash": "3f8b7e6d5c4a...",
    "environment": "production"
  },
  "plan": {
    "id": "plan_abc123",
    "status": "approved"
  }
}
```

**Error Response (409 Conflict - Plan Tampered After Generation)**:
```json
{
  "error": "Hash Mismatch: Submitted bound hash does not match current plan hash. The plan may have been updated."
}
```

---

### `POST /api/repairs/apply`
Applies an approved plan: verifies pre-flight baseline hash, creates encrypted backup, executes atomic write, and re-audits the page.

**Request Body**:
```json
{
  "planId": "plan_abc123"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "executionId": "exec_555",
  "backupId": "bk_1726678000_abcd",
  "verification": {
    "targetUrl": "https://example.com/index.html",
    "testedRuleId": "ONPAGE_TITLE_PRESENT",
    "passed": true,
    "httpStatus": 200,
    "regressionDetected": false,
    "explanation": "Verification SUCCESS: Finding ONPAGE_TITLE_PRESENT is resolved on https://example.com/index.html."
  },
  "logs": [
    "[2026-09-18T16:55:00.000Z] Initiating repair execution for Plan plan_abc123",
    "Immutable plan hash verified against approval.",
    "Pre-flight content hashes verified for 1 resource(s).",
    "Integrity-verified backup snapshot created: bk_1726678000_abcd",
    "Applied patch to index.html (182 bytes written).",
    "Verification SUCCESS: Finding ONPAGE_TITLE_PRESENT is resolved."
  ]
}
```

---

### `POST /api/repairs/rollback`
Restores original file state from the verified encrypted backup snapshot.

**Request Body**:
```json
{
  "executionId": "exec_555"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "rollbackId": "rb_888",
  "restoredCount": 1,
  "logs": [
    "[2026-09-18T16:56:00.000Z] Initiating rollback from backup: ...",
    "Retrieved 1 original resource(s) from encrypted snapshot.",
    "Restored index.html to original version (SHA: 9f8e7d6c...).",
    "Rollback completed successfully."
  ]
}
```

---

## 3. Project Management

### `GET /api/projects`
Lists monitored domains, connections, and latest audit health scores.

### `POST /api/projects`
Registers a new project domain:
```json
{
  "name": "Production Store",
  "domain": "mystore.com"
}
```
