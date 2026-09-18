import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AiRepairGenerator } from "@/lib/ai/repair-generator";
import { computeSha256 } from "@/lib/security/vault";
import { computeImmutablePlanHash } from "@/lib/repairs/state-machine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { findingId, resourceIdentifier, rawSnippet } = body;

    if (!findingId) {
      return NextResponse.json({ error: "Missing required findingId" }, { status: 400 });
    }

    const finding = await db.ruleFinding.findUnique({
      where: { id: findingId },
      include: {
        auditJob: true,
        pageCrawl: true,
      },
    });

    if (!finding) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    const targetResource = resourceIdentifier || "index.html";
    const sampleContent =
      rawSnippet ||
      `<!DOCTYPE html>
<html>
<head>
  <!-- Missing metadata here -->
</head>
<body>
  <h1>Welcome to Website</h1>
  <p>Content without description or schema.</p>
</body>
</html>`;

    const generator = new AiRepairGenerator();
    const { proposal, metadata, fullUnifiedDiff } = await generator.generateProposal({
      finding,
      resourceContent: sampleContent,
      resourceIdentifier: targetResource,
    });

    const originalSha256 = computeSha256(sampleContent);

    const patchPayloads = proposal.patches.map((p) => ({
      targetResource: p.targetResource,
      operation: p.operation,
      beforeContent: p.beforeSnippet,
      afterContent: p.afterSnippet,
      originalSha256,
      explanation: p.explanation,
    }));

    const planHash = computeImmutablePlanHash(patchPayloads);

    // Get or create dummy project if needed
    let project = await db.project.findFirst();
    if (!project) {
      let org = await db.organization.findFirst();
      if (!org) {
        org = await db.organization.create({
          data: { name: "Default Org", slug: "default-org" },
        });
      }
      project = await db.project.create({
        data: {
          name: "Default Project",
          domain: new URL(finding.affectedUrl).hostname,
          organizationId: org.id,
        },
      });
    }

    // Persist repair plan in DB
    const repairPlan = await db.repairPlan.create({
      data: {
        projectId: project.id,
        auditJobId: finding.auditJobId,
        title: proposal.title,
        summary: proposal.explanation,
        status: "awaiting_approval",
        planHash,
        estimatedRisk: proposal.riskLevel,
        blastRadiusPages: proposal.blastRadiusPages,
        patches: {
          create: patchPayloads.map((p) => ({
            findingId: finding.id,
            targetResource: p.targetResource,
            operation: p.operation,
            beforeContent: p.beforeContent,
            afterContent: p.afterContent,
            unifiedDiff: fullUnifiedDiff,
            originalSha256: p.originalSha256,
            explanation: p.explanation,
          })),
        },
      },
      include: {
        patches: true,
      },
    });

    return NextResponse.json({
      success: true,
      plan: repairPlan,
      proposal,
      unifiedDiff: fullUnifiedDiff,
      metadata,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
