"use client";

import { useState, useEffect } from "react";
import { DiffViewer } from "./DiffViewer";
import {
  X,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Loader2,
} from "lucide-react";

interface RepairModalProps {
  finding: any;
  onClose: () => void;
  onRepairCompleted?: () => void;
}

export function RepairModal({ finding, onClose, onRepairCompleted }: RepairModalProps) {
  const [stage, setStage] = useState<
    "generating" | "review" | "approving" | "applying" | "completed" | "error"
  >("generating");
  const [proposalData, setProposalData] = useState<any>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planHash, setPlanHash] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [rollbackResult, setRollbackResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Generate proposal on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProposal() {
      try {
        setStage("generating");
        setErrorMessage(null);
        const res = await fetch("/api/repairs/propose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId: finding.id,
            resourceIdentifier: "index.html",
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to generate proposal");
        }

        const data = await res.json();
        if (!isMounted) return;
        setProposalData(data);
        setPlanId(data.plan.id);
        setPlanHash(data.plan.planHash);
        setStage("review");
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(err.message);
        setStage("error");
      }
    }

    loadProposal();
    return () => {
      isMounted = false;
    };
  }, [finding.id]);

  const handleApproveAndApply = async () => {
    if (!planId || !planHash) return;

    try {
      setStage("approving");
      // 1. Approve Plan
      const approveRes = await fetch("/api/repairs/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          boundPlanHash: planHash,
          comment: "Approved by SEO engineer",
        }),
      });

      if (!approveRes.ok) {
        const err = await approveRes.json();
        throw new Error(err.error || "Approval failed");
      }

      // 2. Apply Repair
      setStage("applying");
      const applyRes = await fetch("/api/repairs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!applyRes.ok) {
        const err = await applyRes.json();
        throw new Error(err.error || "Application failed");
      }

      const applyData = await applyRes.json();
      setExecutionResult(applyData);
      setStage("completed");
      if (onRepairCompleted) onRepairCompleted();
    } catch (err: any) {
      setErrorMessage(err.message);
      setStage("error");
    }
  };

  const handleRollback = async () => {
    if (!executionResult?.executionId) return;

    try {
      setIsRollingBack(true);
      const res = await fetch("/api/repairs/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId: executionResult.executionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Rollback failed");
      }

      const rbData = await res.json();
      setRollbackResult(rbData);
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600/20 text-brand-400 flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                AI Repair Workbench: {finding.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Rule ID: {finding.ruleId} • Affected URL: {finding.affectedUrl}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {stage === "generating" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-white">
                Generating constrained, schema-validated AI repair proposal...
              </p>
              <p className="text-xs text-slate-400">
                Evaluating audit evidence, checking adapter constraints, and drafting unified diff.
              </p>
            </div>
          )}

          {stage === "error" && (
            <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-4 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-200">
                <AlertTriangle className="h-4 w-4" />
                <span>Repair Generation Error</span>
              </div>
              <p>{errorMessage}</p>
            </div>
          )}

          {(stage === "review" || stage === "approving" || stage === "applying") &&
            proposalData && (
              <>
                {/* Proposal Overview */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-brand-400 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      {proposalData.proposal.title}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Risk: {proposalData.proposal.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {proposalData.proposal.explanation}
                  </p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Audit Evidence Cited:</span>
                    <span>{proposalData.proposal.auditEvidenceCited}</span>
                  </div>
                </div>

                {/* Diff Viewer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">Reviewable Code Diff</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Target: index.html
                    </span>
                  </div>
                  <DiffViewer
                    unifiedDiff={proposalData.unifiedDiff}
                    filename="index.html"
                  />
                </div>

                {/* Pre-Repair Guarantees */}
                <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-3 flex items-start gap-3 text-xs text-emerald-300">
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-200">
                      Pre-Repair Safety Guarantees:
                    </p>
                    <p className="text-emerald-300/80 leading-snug">
                      1. Encrypted atomic backup snapshot created before disk writes.
                      <br />
                      2. Pre-flight SHA-256 conflict check prevents silent race conditions.
                      <br />
                      3. Live post-repair verification tests that the finding is resolved.
                    </p>
                  </div>
                </div>
              </>
            )}

          {stage === "completed" && executionResult && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-5 text-center space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h4 className="text-base font-bold text-white">Repair Applied & Verified!</h4>
                <p className="text-xs text-emerald-300">
                  {executionResult.verification.explanation}
                </p>
                <div className="text-[11px] text-slate-400 pt-2 font-mono">
                  Backup Snapshot: {executionResult.backupId} • Execution: {executionResult.executionId}
                </div>
              </div>

              {rollbackResult ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 text-center space-y-1">
                  <span className="font-bold text-cyan-400">Rollback Status: Completed</span>
                  <p className="text-slate-400">
                    Restored {rollbackResult.restoredCount} resource(s) to exact original state.
                  </p>
                </div>
              ) : (
                <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      Need to undo this change?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Restore original version from verified backup snapshot instantly.
                    </span>
                  </div>
                  <button
                    onClick={handleRollback}
                    disabled={isRollingBack}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{isRollingBack ? "Rolling back..." : "Rollback Repair"}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 px-6 py-4 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-2"
          >
            {stage === "completed" ? "Close" : "Cancel"}
          </button>

          {(stage === "review" || stage === "approving" || stage === "applying") && (
            <button
              onClick={handleApproveAndApply}
              disabled={stage === "approving" || stage === "applying"}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-lg shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {(stage === "approving" || stage === "applying") && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span>
                {stage === "approving"
                  ? "Binding Approval..."
                  : stage === "applying"
                  ? "Applying with Backup..."
                  : "Approve & Apply Repair"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
