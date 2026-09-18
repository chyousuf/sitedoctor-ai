import { AiModelMetadata } from "./types";

export interface LlmCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json";
}

export interface LlmCompletionResult {
  text: string;
  metadata: AiModelMetadata;
}

export class AiProviderService {
  private provider: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || "mock";
  }

  public async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const startTime = Date.now();

    // Check if OpenAI key is configured
    if (this.provider === "openai" && process.env.OPENAI_API_KEY) {
      return this.callOpenAi(request, startTime);
    }

    // Default to high-fidelity Mock provider for testing and offline environments
    return this.callMockProvider(request, startTime);
  }

  private async callOpenAi(
    request: LlmCompletionRequest,
    startTime: number
  ): Promise<LlmCompletionResult> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        response_format: request.responseFormat ? { type: "json_object" } : undefined,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API request failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;

    return {
      text,
      metadata: {
        provider: "openai",
        model: "gpt-4o-mini",
        promptVersion: "2.1",
        latencyMs: Date.now() - startTime,
        promptTokens,
        completionTokens,
        estimatedCostUsd: promptTokens * 0.00000015 + completionTokens * 0.0000006,
      },
    };
  }

  private async callMockProvider(
    request: LlmCompletionRequest,
    startTime: number
  ): Promise<LlmCompletionResult> {
    // Generate intelligent mock response based on prompt contents
    const prompt = request.userPrompt;
    let mockResponse: any;

    if (prompt.includes("ONPAGE_TITLE_PRESENT")) {
      mockResponse = {
        title: "Add Descriptive Page Title Tag",
        explanation: "Adds an optimized, keyword-relevant <title> element inside the <head> tag.",
        auditEvidenceCited: "Finding ONPAGE_TITLE_PRESENT: No <title> tag found on target page.",
        riskLevel: "low",
        confidence: 0.98,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "update_title",
            beforeSnippet: "<head>",
            afterSnippet: "<head>\n  <title>SiteDoctor AI - Production SEO & AEO Platform</title>",
            explanation: "Injects missing <title> tag as the first child of <head>.",
          },
        ],
        precautions: ["Check that title accurately reflects page business scope."],
      };
    } else if (prompt.includes("ONPAGE_META_DESC_PRESENT")) {
      mockResponse = {
        title: "Add Compelling Meta Description",
        explanation: "Injects a 150-character meta description tag to improve search click-through rate.",
        auditEvidenceCited: "Finding ONPAGE_META_DESC_PRESENT: Missing meta description attribute.",
        riskLevel: "low",
        confidence: 0.95,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "update_meta_description",
            beforeSnippet: "<head>",
            afterSnippet: '<head>\n  <meta name="description" content="SiteDoctor AI provides automated website SEO, AEO, and GEO audits with safe, verified AI-assisted repairs and one-click rollbacks.">',
            explanation: "Adds descriptive <meta name='description'> tag into <head>.",
          },
        ],
        precautions: ["Preserve natural language and avoid mechanical keyword stuffing."],
      };
    } else if (prompt.includes("PERF_VIEWPORT_PRESENT")) {
      mockResponse = {
        title: "Add Mobile Viewport Declaration",
        explanation: "Injects responsive mobile viewport tag into <head> to enable fluid scaling.",
        auditEvidenceCited: "Finding PERF_VIEWPORT_PRESENT: No viewport meta tag found.",
        riskLevel: "low",
        confidence: 1.0,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "add_viewport",
            beforeSnippet: "<head>",
            afterSnippet: '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
            explanation: "Adds mobile viewport meta tag.",
          },
        ],
        precautions: ["Verify CSS styles respond well on mobile viewports."],
      };
    } else if (prompt.includes("CRAWL_CANONICAL_PRESENT")) {
      mockResponse = {
        title: "Add Authoritative Canonical Link",
        explanation: "Configures self-referential canonical URL to prevent parameter duplicate indexing.",
        auditEvidenceCited: "Finding CRAWL_CANONICAL_PRESENT: Missing canonical tag.",
        riskLevel: "low",
        confidence: 0.99,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "add_canonical",
            beforeSnippet: "<head>",
            afterSnippet: '<head>\n  <link rel="canonical" href="https://example.com/">',
            explanation: "Injects canonical link tag in <head>.",
          },
        ],
        precautions: ["Ensure canonical URL points to the authoritative HTTPS version."],
      };
    } else if (prompt.includes("IMG_ALT_PRESENT")) {
      mockResponse = {
        title: "Add Alt Text Attributes to Images",
        explanation: "Adds descriptive alt attributes to content images without modifying surrounding markup.",
        auditEvidenceCited: "Finding IMG_ALT_PRESENT: Images detected without alt text.",
        riskLevel: "low",
        confidence: 0.95,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "update_img_alt",
            beforeSnippet: '<img src="logo.png">',
            afterSnippet: '<img src="logo.png" alt="Company Logo">',
            explanation: "Provides descriptive alt text for logo image.",
          },
        ],
        precautions: ["Ensure alt text describes the visual content accurately."],
      };
    } else {
      mockResponse = {
        title: "Remediate Technical SEO Finding",
        explanation: "Generates recommended metadata and structure improvements based on audit evidence.",
        auditEvidenceCited: "Rule finding identified during crawl.",
        riskLevel: "low",
        confidence: 0.9,
        blastRadiusPages: 1,
        patches: [
          {
            targetResource: "index.html",
            operation: "custom_patch",
            beforeSnippet: "<!-- SEO Anchor -->",
            afterSnippet: '<!-- SEO Anchor -->\n<meta name="robots" content="index, follow">',
            explanation: "Ensures search bot crawlability.",
          },
        ],
        precautions: ["Verify before deployment."],
      };
    }

    return {
      text: JSON.stringify(mockResponse),
      metadata: {
        provider: "mock-neutral",
        model: "sitedoctor-deterministic-v1",
        promptVersion: "2.1",
        latencyMs: Date.now() - startTime,
        promptTokens: 420,
        completionTokens: 180,
        estimatedCostUsd: 0.0,
      },
    };
  }
}
