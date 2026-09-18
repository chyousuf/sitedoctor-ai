export interface PlatformCapability {
  platform: string;
  category: "Static" | "CMS" | "Git" | "Ecommerce" | "Proprietary";
  status: "available" | "beta" | "planned" | "manual_only";
  connectionMethods: string[];
  readCapabilities: string[];
  supportedRepairs: string[];
  validationMethods: string[];
  backupAndRollback: string;
  unsupportedOperations: string[];
}

export const PLATFORM_CAPABILITY_MATRIX: PlatformCapability[] = [
  {
    platform: "Static HTML Websites",
    category: "Static",
    status: "available",
    connectionMethods: ["SFTP (SSH File Transfer)", "Local Filesystem Directory", "FTPS"],
    readCapabilities: ["HTML files", "CSS stylesheets", "robots.txt", "sitemap.xml", "llms.txt"],
    supportedRepairs: [
      "Meta title and description injection/updates",
      "Canonical tag declaration",
      "JSON-LD Schema.org injection",
      "Mobile viewport tags",
      "Image alt attribute remediation",
      "Heading hierarchy restructuring",
      "llms.txt and robots.txt creation/updates",
    ],
    validationMethods: ["Syntax validation", "Post-repair HTTP 200 re-crawl", "DOM assertion checks"],
    backupAndRollback: "Atomic file snapshot prior to write with SHA-256 verification and instant one-click rollback",
    unsupportedOperations: [
      "Modifying server daemon configurations (nginx.conf, apache .htaccess outside document root)",
      "Modifying files outside approved document root",
      "Executing arbitrary shell commands",
    ],
  },
  {
    platform: "WordPress",
    category: "CMS",
    status: "available",
    connectionMethods: ["WordPress REST API (Application Passwords)", "SiteDoctor AI Companion Plugin"],
    readCapabilities: ["Posts", "Pages", "Yoast / RankMath SEO meta", "Taxonomies", "Header hooks"],
    supportedRepairs: [
      "Post/page SEO title updates",
      "Meta description updates",
      "Featured image alt text",
      "Schema graph injection via wp_head hooks",
      "Canonical URL alignment",
    ],
    validationMethods: ["REST API post-update readback", "Live page HTTP 200 & tag extraction check"],
    backupAndRollback: "Database record and postmeta snapshot with instant rollback via REST API",
    unsupportedOperations: [
      "Direct SQL string replacement",
      "Modifying WordPress core files",
      "Editing third-party plugin source files",
    ],
  },
  {
    platform: "Git-Managed Websites (Next.js, Astro, Hugo, Gatsby)",
    category: "Git",
    status: "available",
    connectionMethods: ["GitHub App / Personal Access Token", "GitLab Deploy Token"],
    readCapabilities: ["Repository source files", "Components", "Configuration files"],
    supportedRepairs: [
      "Creation of dedicated repair branch (e.g. sitedoctor-fix-title)",
      "Targeted commit with unified diff",
      "Automated Pull Request / Merge Request creation with explanation and evidence citations",
    ],
    validationMethods: ["CI/CD preview build status", "Automated test suite verification"],
    backupAndRollback: "Git commit history and branch reversion",
    unsupportedOperations: [
      "Direct forced push to protected main/master branches without Pull Request",
      "Modifying build output artifacts directly instead of source files",
    ],
  },
  {
    platform: "Shopify",
    category: "Ecommerce",
    status: "planned",
    connectionMethods: ["Shopify Admin REST / GraphQL API"],
    readCapabilities: ["Products", "Collections", "Articles", "Theme templates"],
    supportedRepairs: ["Product SEO titles", "Meta descriptions", "Product structured data"],
    validationMethods: ["Storefront live check", "GraphQL verification"],
    backupAndRollback: "Metafield snapshot restoration",
    unsupportedOperations: ["Editing core theme liquid files without theme staging duplicate"],
  },
  {
    platform: "Webflow",
    category: "Proprietary",
    status: "planned",
    connectionMethods: ["Webflow REST API v2"],
    readCapabilities: ["CMS Collections", "Collection Items", "Custom code heads"],
    supportedRepairs: ["CMS item SEO fields", "Custom schema injection via Site Head"],
    validationMethods: ["Published site verification"],
    backupAndRollback: "Collection item JSON backup",
    unsupportedOperations: ["Designer-level visual component refactoring"],
  },
  {
    platform: "Custom / Unsupported CMS (Drupal, Wix, Squarespace, Custom PHP)",
    category: "CMS",
    status: "manual_only",
    connectionMethods: ["Manual export / Copy-paste / CLI patch"],
    readCapabilities: ["Public crawler analysis"],
    supportedRepairs: ["AI-generated copy-paste code patches and step-by-step remediation instructions"],
    validationMethods: ["Manual re-audit trigger"],
    backupAndRollback: "User-managed backup prior to manual application",
    unsupportedOperations: ["Automatic direct write without verified adapter"],
  },
];
