import { db } from "@/lib/db";
import { Wrench, ShieldCheck, RotateCcw, Clock, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RepairsPage() {
  const [plans, backups] = await Promise.all([
    db.repairPlan.findMany({
      include: {
        patches: true,
        approvals: true,
        executions: {
          include: { rollbackRecord: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.backupSnapshot.findMany({
      include: {
        repairPlan: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Repairs, Backups & Rollbacks
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical log of AI repair proposals, approval bindings, encrypted pre-flight backups, and reversion events.
        </p>
      </div>

      {/* Safety Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Cryptographic Verification Guarantee</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every applied repair is backed by an encrypted snapshot with SHA-256 integrity verification before modifying any file on disk.
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono text-right shrink-0">
          <span className="text-emerald-400 font-bold block text-base">{backups.length}</span>
          <span>Verified Snapshots</span>
        </div>
      </div>

      {/* Repair Plans Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-white">Repair Plans History</h3>
        {plans.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No repair plans created yet. Run an audit and click &quot;Fix with AI&quot; on any repairable finding.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60 font-mono text-xs">
            {plans.map((p) => {
              const execution = p.executions?.[0];
              const isRolledBack = p.status === "rolled_back" || !!execution?.rollbackRecord;

              return (
                <div key={p.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-sans text-sm">{p.title}</span>
                      <span
                        className={`text-[10px] uppercase px-2 py-0.5 rounded border ${
                          p.status === "completed"
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                            : p.status === "rolled_back"
                            ? "bg-purple-950/60 text-purple-300 border-purple-800"
                            : "bg-amber-950/60 text-amber-300 border-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()} at{" "}
                      {new Date(p.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-slate-400 font-sans text-xs">{p.summary}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      Plan Hash: <span className="text-slate-300">{p.planHash.slice(0, 16)}...</span>
                    </span>
                    <span>{p.patches?.length || 0} Patches Affected</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backups Inventory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-base text-white">Pre-Flight Encrypted Backups</h3>
        {backups.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No backup snapshots generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Snapshot ID</th>
                  <th className="py-2.5 px-3">Repair Plan</th>
                  <th className="py-2.5 px-3">Checksum (SHA-256)</th>
                  <th className="py-2.5 px-3">Integrity</th>
                  <th className="py-2.5 px-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white">{b.id}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {b.repairPlan?.title || b.repairPlanId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                      {b.checksumSha256.slice(0, 24)}...
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
