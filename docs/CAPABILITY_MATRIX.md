# SiteDoctor AI - Platform Capability Matrix

SiteDoctor AI explicitly separates two distinct capabilities:
1. **Audit Compatibility**: Any publicly accessible website can be audited regardless of its CMS or framework, subject to crawler rate limits and robots.txt directives.
2. **Automatic Repair Compatibility**: Automatic changes require a tested adapter and sufficient verified permissions. Unsupported systems receive copyable patches, reviewable diffs, and manual instructions.

---

## Capability Matrix

| Platform / Technology | Supported Connections | Read Capabilities | Supported Repair Types | Validation Methods | Backup & Rollback | Unsupported Operations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Static HTML Websites** | • SFTP<br>• Local Directory<br>• FTPS | • HTML files<br>• CSS/JS<br>• robots.txt<br>• sitemaps<br>• llms.txt | • Title & Meta Description<br>• Canonical tags<br>• Schema JSON-LD<br>• Mobile viewport<br>• Image alt attributes<br>• Heading structure<br>• llms.txt generation | • Syntax parsing<br>• Post-repair HTTP 200 re-audit<br>• DOM assertion check | Pre-repair atomic file snapshot with SHA-256 verification and 1-click rollback | Modifying server configs outside root; arbitrary shell execution; editing binary files |
| **WordPress** | • REST API (App Passwords)<br>• Companion Plugin | • Posts & Pages<br>• Yoast / RankMath SEO meta<br>• Taxonomies<br>• Header hooks | • Post/Page SEO titles<br>• Meta descriptions<br>• Featured image alt text<br>• Schema graph injection<br>• Canonical URLs | • REST API readback<br>• Live page re-crawl & selector check | Database record and postmeta snapshot with REST rollback | Direct SQL string replacement; modifying WP core; modifying 3rd party plugins |
| **Git-Managed Websites** (Next.js, Astro, Hugo, Gatsby) | • GitHub App / PAT<br>• GitLab Deploy Token | • Source repo files<br>• Component templates<br>• Configs | • Dedicated repair branch creation<br>• Targeted atomic commit with diff<br>• Pull Request / Merge Request creation | • CI/CD preview build status<br>• Automated test suite pass | Git commit history and branch reversion | Force-pushing to protected main branch; editing build output directly |
| **Shopify** *(Planned Roadmap)* | • Admin REST / GraphQL API | • Products<br>• Collections<br>• Articles | • Product SEO titles<br>• Meta descriptions<br>• Structured data | • Storefront live check<br>• GraphQL verification | Metafield snapshot restoration | Core Liquid theme modification without preview duplicate |
| **Webflow** *(Planned Roadmap)* | • Webflow REST API v2 | • CMS Collections<br>• Site Head | • CMS item SEO fields<br>• Site Head custom schema | • Published site verification | Collection item JSON backup | Designer-level visual layout restructuring |
| **Custom PHP & Unsupported CMS** (Drupal, Joomla, Wix, Squarespace) | • Manual Export / CLI Patch | • Public crawler analysis | • Generated copy-paste code patches<br>• Step-by-step remediation instructions | • Manual re-audit trigger | User-managed manual backups | Automatic writes without tested adapter |

---

## Rules of Engagement for Automatic Repairs
1. **Never edit build output**: When source files and a build pipeline exist, modify the source files via a Git Pull Request rather than writing directly to `.next/` or `dist/`.
2. **Never execute arbitrary shell commands**: Adapters execute only vetted, constrained operations.
3. **Never apply unapproved plans**: Plans must be approved by an authorized user and bound cryptographically to the immutable proposal hash.
4. **Halt on conflict**: If a file changed after the proposal was generated, the repair engine halts with an explicit conflict rather than overwriting legitimate external work.
