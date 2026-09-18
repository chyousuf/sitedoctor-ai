import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { db } from "@/lib/db";
import { RollbackEngine } from "@/lib/repairs/rollback-engine";
import { StaticAdapter } from "@/lib/adapters/static-adapter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { executionId } = body;

    if (!executionId) {
      return NextResponse.json({ error: "Missing required executionId" }, { status: 400 });
    }

    const execution = await db.repairExecution.findUnique({
      where: { id: executionId },
      include: {
        backupSnapshot: true,
        repairPlan: true,
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution record not found" }, { status: 404 });
    }

    const targetDir = path.resolve("./storage/site-roots/default");
    const adapter = new StaticAdapter({
      adapterType: "static_local",
      publicUrl: "http://localhost:3000",
      allowedRoot: targetDir,
    });

    const rollbackEngine = new RollbackEngine();
    const result = await rollbackEngine.executeRollback(adapter, {
      executionId: execution.id,
      backupStoragePath: execution.backupSnapshot.storagePath,
    });

    // Save RollbackRecord
    const rollbackRecord = await db.rollbackRecord.create({
      data: {
        repairExecutionId: execution.id,
        backupSnapshotId: execution.backupSnapshotId,
        status: result.status,
        restoredCount: result.restoredCount,
        rollbackLog: result.logs.join("\n"),
      },
    });

    // Update RepairPlan status
    await db.repairPlan.update({
      where: { id: execution.repairPlanId },
      data: { status: "rolled_back" },
    });

    return NextResponse.json({
      success: true,
      rollbackId: rollbackRecord.id,
      restoredCount: result.restoredCount,
      logs: result.logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
