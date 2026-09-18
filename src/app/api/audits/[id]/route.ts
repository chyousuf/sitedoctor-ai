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

    const categoryScores = audit.categoryScoresJson
      ? JSON.parse(audit.categoryScoresJson)
      : null;
    const summary = audit.summaryJson ? JSON.parse(audit.summaryJson) : null;

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
