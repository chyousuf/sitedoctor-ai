export interface RobotsDirective {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

export interface RobotsAnalysis {
  url: string;
  exists: boolean;
  content: string;
  directives: RobotsDirective[];
  sitemaps: string[];
  aiBotDirectives: Record<string, { status: "allowed" | "disallowed" | "unspecified" }>;
}

const KNOWN_AI_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
];

export function parseRobotsTxt(content: string, robotsUrl: string): RobotsAnalysis {
  const lines = content.split(/\r?\n/);
  const directives: RobotsDirective[] = [];
  const sitemaps: string[] = [];

  let currentAgents: string[] = [];
  let currentAllow: string[] = [];
  let currentDisallow: string[] = [];
  let currentDelay: number | undefined = undefined;

  function commitBlock() {
    if (currentAgents.length > 0) {
      for (const agent of currentAgents) {
        directives.push({
          userAgent: agent.toLowerCase(),
          allow: [...currentAllow],
          disallow: [...currentDisallow],
          crawlDelay: currentDelay,
        });
      }
    }
    currentAgents = [];
    currentAllow = [];
    currentDisallow = [];
    currentDelay = undefined;
  }

  for (const rawLine of lines) {
    // Remove comments
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const val = line.slice(colonIndex + 1).trim();

    if (key === "user-agent") {
      if (currentAllow.length > 0 || currentDisallow.length > 0 || currentDelay !== undefined) {
        commitBlock();
      }
      currentAgents.push(val);
    } else if (key === "allow") {
      if (val) currentAllow.push(val);
    } else if (key === "disallow") {
      if (val) currentDisallow.push(val);
    } else if (key === "crawl-delay") {
      const parsedDelay = parseFloat(val);
      if (!isNaN(parsedDelay)) currentDelay = parsedDelay;
    } else if (key === "sitemap") {
      if (val) sitemaps.push(val);
    }
  }
  commitBlock();

  // Inspect AI bot policies
  const aiBotDirectives: Record<string, { status: "allowed" | "disallowed" | "unspecified" }> = {};
  for (const bot of KNOWN_AI_BOTS) {
    const matching = directives.filter((d) => d.userAgent === bot.toLowerCase());
    if (matching.length === 0) {
      aiBotDirectives[bot] = { status: "unspecified" };
    } else {
      const isBlocked = matching.some((d) => d.disallow.includes("/") || d.disallow.some((p) => p === "/*"));
      aiBotDirectives[bot] = { status: isBlocked ? "disallowed" : "allowed" };
    }
  }

  return {
    url: robotsUrl,
    exists: true,
    content,
    directives,
    sitemaps,
    aiBotDirectives,
  };
}

/**
 * Checks whether a specific pathname is allowed for a user agent.
 */
export function isPathAllowed(
  pathname: string,
  userAgent: string,
  directives: RobotsDirective[]
): boolean {
  const uaLower = userAgent.toLowerCase();

  // Find directives targeting this user agent specifically, or fallback to '*'
  const specificRules = directives.filter((d) => d.userAgent === uaLower);
  const fallbackRules = directives.filter((d) => d.userAgent === "*");

  const activeRules = specificRules.length > 0 ? specificRules : fallbackRules;
  if (activeRules.length === 0) return true;

  // Compare matches
  let longestMatchLen = -1;
  let allowed = true;

  for (const rule of activeRules) {
    for (const allowPattern of rule.allow) {
      if (matchesRobotsPattern(pathname, allowPattern)) {
        if (allowPattern.length > longestMatchLen) {
          longestMatchLen = allowPattern.length;
          allowed = true;
        }
      }
    }
    for (const disallowPattern of rule.disallow) {
      if (matchesRobotsPattern(pathname, disallowPattern)) {
        if (disallowPattern.length > longestMatchLen) {
          longestMatchLen = disallowPattern.length;
          allowed = false;
        }
      }
    }
  }

  return allowed;
}

function matchesRobotsPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  // Convert standard robots.txt pattern (* and $) into regex
  const escaped = pattern
    .replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
    .replace(/\\\*/g, ".*")
    .replace(/\\\$$/, "$");

  const regex = new RegExp(`^${escaped}`);
  return regex.test(path);
}
