# SiteDoctor AI - Versioned Audit Rule Catalog

SiteDoctor AI maintains a versioned rule registry. Every rule has a documented purpose, scope, evidence requirements, severity policy, and authoritative source.

---

## 1. Crawlability & Indexability (25% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CRAWL_HTTP_STATUS` | 1.0 | Critical | 20 | Confirms server responds with HTTP 200 OK. 4xx/5xx errors halt indexing. | RFC 9110 / Google Search Central |
| `CRAWL_REDIRECT_CHAIN` | 1.0 | Medium | 10 | Flags redirect hops > 2, which waste crawl budget and increase latency. | Google Webmaster Guidelines |
| `CRAWL_CANONICAL_PRESENT` | 1.0 | Medium | 15 | Verifies presence of `<link rel="canonical">` to prevent duplicate indexing. | RFC 6596 |
| `CRAWL_CANONICAL_VALID` | 1.0 | High | 15 | Ensures canonical tag uses an absolute HTTPS URL rather than relative paths. | Google Canonicalization Guide |
| `CRAWL_ROBOTS_NOINDEX` | 1.0 | High | 15 | Detects meta robots or X-Robots-Tag `noindex` directives on public landing pages. | Google Search Central |
| `CRAWL_SOFT_404_HEURISTIC` | 1.0 | Medium | 10 | Heuristic identifying 200 OK responses that display missing page content. | Google Search Central |

---

## 2. On-Page SEO (25% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ONPAGE_TITLE_PRESENT` | 1.0 | Critical | 20 | Ensures `<title>` element exists and contains substantive text. | W3C HTML5 / Google Search Central |
| `ONPAGE_TITLE_LENGTH` | 1.0 | Low | 5 | Guidance recommending 30 to 60 characters to avoid SERP truncation. Not an absolute penalty. | Search Engine SERP Limits |
| `ONPAGE_META_DESC_PRESENT` | 1.0 | High | 15 | Checks presence of `<meta name="description">` for SERP snippet display. | Google Snippet Guidelines |
| `ONPAGE_META_DESC_LENGTH` | 1.0 | Low | 5 | Guidance on length between 120 and 160 characters. | Desktop/Mobile SERP Display |
| `ONPAGE_H1_PRESENT` | 1.0 | High | 15 | Verifies primary heading exists. Multiple H1s are permitted; absence is flagged. | HTML5 Semantics |
| `ONPAGE_OPEN_GRAPH` | 1.0 | Low | 10 | Verifies `og:title`, `og:description`, `og:image` for rich social previews. | Open Graph Protocol |
| `ONPAGE_HTML_LANG` | 1.0 | Low | 5 | Ensures `lang` attribute is present on `<html>` tag for screen readers and search classifiers. | WCAG 2.1 (3.1.1) |

---

## 3. Images & Media (10% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `IMG_ALT_PRESENT` | 1.0 | Medium | 20 | Flags `<img>` tags missing `alt` attributes. Decorative images should use `alt=""`. | WCAG 2.1 (1.1.1) |
| `IMG_DIMENSIONS_PRESENT`| 1.0 | Low | 10 | Checks for explicit `width` and `height` to prevent Cumulative Layout Shift (CLS). | web.dev / Core Web Vitals |
| `IMG_LAZY_ABOVE_FOLD` | 1.0 | Medium | 10 | Warns if the primary above-the-fold hero image specifies `loading="lazy"`, harming LCP. | Google Web Vitals Guide |

---

## 4. Structured Data (15% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SCHEMA_JSONLD_PRESENT` | 1.0 | Medium | 25 | Verifies presence of Schema.org JSON-LD scripts (`Organization`, `Article`, `Product`, etc.). | Schema.org |
| `SCHEMA_SYNTAX_VALID` | 1.0 | High | 25 | Validates JSON-LD script blocks are well-formed JSON without parse errors. | RFC 8259 |

---

## 5. Performance & Mobile Experience (15% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PERF_VIEWPORT_PRESENT` | 1.0 | Critical | 30 | Checks for `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. | Google Mobile-Friendly Guide |
| `PERF_RESPONSE_TIME` | 1.0 | Medium | 20 | Evaluates initial server response time (TTFB < 800ms recommended). | Core Web Vitals / TTFB |
| `PERF_RENDER_BLOCKING_SCRIPTS` | 1.0 | Medium | 15 | Identifies synchronous external scripts in `<head>` lacking `defer` or `async`. | web.dev Fast Load Times |

---

## 6. Website Quality & Security (10% Weight in Technical Health)

| Rule ID | Version | Severity | Weight | Purpose & Policy | Authoritative Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `QUALITY_HTTPS_ENFORCED` | 1.0 | Critical | 35 | Verifies website is served over secure HTTPS. | Google HTTPS Ranking Signal |
| `QUALITY_MIXED_CONTENT` | 1.0 | High | 25 | Detects insecure `http://` resources (scripts, stylesheets, images) on HTTPS pages. | W3C Mixed Content Spec |
| `QUALITY_CHARSET_DECLARED`| 1.0 | Low | 10 | Verifies `<meta charset="utf-8">` is declared in `<head>`. | HTML5 Recommendation |

---

## 7. Answer Engine Optimization (AEO) & Generative Engine Optimization (GEO) *(Advisory Signal)*

| Rule ID | Version | Severity | Weight | Purpose & Policy | Advisory Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AEO_DIRECT_ANSWER_STRUCTURE` | 1.0 | Info | 15 | Evaluates presence of question-formatted subheadings paired with direct answer blocks. | Perplexity / Google SGE extraction |
| `AEO_STRUCTURED_LISTS` | 1.0 | Info | 15 | Evaluates HTML lists (`<ul>`, `<ol>`) and `<table>` for LLM factual synthesis. | Generative Engine Synthesis |
| `GEO_AI_BOT_ACCESS` | 1.0 | Info | 10 | Inspects robots.txt policies for AI search crawlers (PerplexityBot, GPTBot, ClaudeBot). | AI Search & Discovery Indexing |
