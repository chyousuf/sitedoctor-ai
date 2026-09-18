import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertTransition } from "@/lib/repairs/state-machine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, boundPlanHash, comment } = body;

    if (!planId || !boundPlanHash) {
      return NextResponse.json(
        { error: "planId and boundPlanHash are required." },
        { status: 400 }
      );
    }

    const plan = await db.repairPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: "Repair plan not found" }, { status: 404 });
    }

    // Verify immutable hash binding
    if (plan.planHash !== boundPlanHash) {
      return NextResponse.json(
        {
          error: `Hash Mismatch: Submitted bound hash does not match current plan hash. The plan may have been updated.`,
        },
        { status: 409 }
      );
    }

    assertTransition(plan.status as any, "approved");

    // Get or create system user for approval
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: "admin@sitedoctor.ai",
          name: "Lead SEO Engineer",
        },
      });
    }

    // Persist Approval and update plan status
    const [approval, updatedPlan] = await db.$transaction([
      db.approval.create({
        data: {
          repairPlanId: plan.id,
          userId: user.id,
          boundPlanHash,
          environment: "production",
          comment: comment || "Approved by SEO engineer",
        },
      }),
      db.repairPlan.update({
        where: { id: plan.id },
        data: { status: "approved" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      approval,
      plan: updatedPlan,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
