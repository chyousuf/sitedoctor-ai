import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audit = await db.auditJob.findUnique({
      where: { id },
      include: {
        pages: {
          take: 50,
          orderBy: { depth: "asc" },
        },
        findings: {
          orderBy: [{ severity: "asc" }, { detectedAt: "desc" }],
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    let categoryScores = null;
    try {
      if (audit.categoryScoresJson) categoryScores = JSON.parse(audit.categoryScoresJson);
    } catch {
      categoryScores = null;
    }

    let summary = null;
    try {
      if (audit.summaryJson) summary = JSON.parse(audit.summaryJson);
    } catch {
      summary = null;
    }

    return NextResponse.json({
      audit: {
        ...audit,
        categoryScores,
        summary,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
