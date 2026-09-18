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
  Copy,
  Check,
  Download,
  Server,
  Globe,
  FileCode,
  ArrowRight,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<"manual" | "ftp" | "local">("manual");
  const [proposalData, setProposalData] = useState<any>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planHash, setPlanHash] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Live verification state
  const [isVerifyingLive, setIsVerifyingLive] = useState(false);
  const [liveVerificationResult, setLiveVerificationResult] = useState<any>(null);

  // FTP credentials state
  const [ftpHost, setFtpHost] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpUser, setFtpUser] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpRemoteDir, setFtpRemoteDir] = useState("/htdocs");

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

  // Extract snippet for easy 1-click copy
  const patchSnippet = proposalData?.proposal?.patches?.[0]?.afterSnippet || "";
  const cleanSnippet = patchSnippet.replace(/<head>\n?\s*/i, "").trim() || patchSnippet;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(cleanSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleDownloadPatchedFile = () => {
    if (!proposalData?.plan?.patches?.[0]?.afterContent) return;
    const content = proposalData.plan.patches[0].afterContent;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Live Verification check
  const handleVerifyLive = async () => {
    try {
      setIsVerifyingLive(true);
      setLiveVerificationResult(null);
      const res = await fetch("/api/audits/verify-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: finding.id }),
      });
      const data = await res.json();
      setLiveVerificationResult(data);
      if (data.verified && onRepairCompleted) {
        onRepairCompleted();
      }
    } catch (err: any) {
      setLiveVerificationResult({ verified: false, message: err.message });
    } finally {
      setIsVerifyingLive(false);
    }
  };

  // Automated Apply (FTP or Local Sandbox)
  const handleApproveAndApply = async (useFtp = false) => {
    if (!planId || !planHash) return;

    try {
      setStage("approving");
      setErrorMessage(null);

      // 1. Approve Plan
      const approveRes = await fetch("/api/repairs/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          boundPlanHash: planHash,
          comment: useFtp ? "Approved for live FTP deployment" : "Approved for local staging",
        }),
      });

      if (!approveRes.ok) {
        const err = await approveRes.json();
        throw new Error(err.error || "Approval failed");
      }

      // 2. Apply Repair
      setStage("applying");
      const applyPayload: any = { planId };
      if (useFtp) {
        applyPayload.ftpConfig = {
          host: ftpHost,
          port: ftpPort,
          username: ftpUser,
          password: ftpPassword,
          remoteDir: ftpRemoteDir,
        };
      }

      const applyRes = await fetch("/api/repairs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applyPayload),
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand-600/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Repair Resolution: {finding.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Target: {finding.affectedUrl}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Generating Stage */}
          {stage === "generating" && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin mx-auto" />
              <h4 className="font-bold text-sm text-white">
                Synthesizing Verifiable Code Patch...
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Running constrained AI generator to construct an atomic, reversible code change based on authoritative standards.
              </p>
            </div>
          )}

          {/* Error Stage */}
          {stage === "error" && (
            <div className="py-8 space-y-4">
              <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-4 text-rose-300 text-xs flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Repair Action Encountered an Issue</span>
                  <p>{errorMessage || "An unexpected error occurred."}</p>
                </div>
              </div>
              <button
                onClick={() => setStage("review")}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Return to Review
              </button>
            </div>
          )}

          {/* Review Stage */}
          {stage === "review" && proposalData && (
            <div className="space-y-6">
              {/* Proposal Meta & Risk Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-mono">CONFIDENCE</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {(proposalData.proposal.confidence * 100).toFixed(0)}% High Certainty
                  </span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-mono">ESTIMATED RISK</span>
                  <span className="font-bold text-emerald-400 text-sm capitalize">
                    {proposalData.proposal.riskLevel} Risk (Reversible)
                  </span>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block font-mono">BLAST RADIUS</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {proposalData.proposal.blastRadiusPages} Page Scope
                  </span>
                </div>
              </div>

              {/* Diff Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 font-mono">
                    PROPOSED CODE PATCH (DIFF)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Target: index.html
                  </span>
                </div>
                <DiffViewer
                  unifiedDiff={proposalData.unifiedDiff}
                  filename="index.html"
                />
              </div>

              {/* Deployment Tabs */}
              <div className="border-t border-slate-800 pt-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setActiveTab("manual")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "manual"
                        ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                        : "text-slate-400 hover:text-white bg-slate-950/50"
                    }`}
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>Copy Code / Download File (Free & Instant)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("ftp")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "ftp"
                        ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                        : "text-slate-400 hover:text-white bg-slate-950/50"
                    }`}
                  >
                    <Server className="h-3.5 w-3.5" />
                    <span>Push to Server (FTP / SFTP)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("local")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "local"
                        ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                        : "text-slate-400 hover:text-white bg-slate-950/50"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Local Staging Sandbox</span>
                  </button>
                </div>

                {/* Tab 1: Manual Copy & Download */}
                {activeTab === "manual" && (
                  <div className="space-y-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Direct Code Implementation for Live Website</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Insert this exact tag into your website's <code className="text-brand-300">&lt;head&gt;</code> element, or download the repaired file and upload it to your web hosting.
                      </p>
                    </div>

                    {/* Snippet Card */}
                    <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <code>{cleanSnippet}</code>
                      <button
                        onClick={handleCopySnippet}
                        className="absolute top-2 right-2 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded transition-colors"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy Snippet
                          </>
                        )}
                      </button>
                    </div>

                    {/* Implementation Guide */}
                    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 space-y-2">
                      <span className="font-semibold text-slate-200 block">How to apply to your live website:</span>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                        <li>Log into your hosting control panel (cPanel, InfinityFree, Plesk) or CMS (WordPress).</li>
                        <li>Open <strong className="text-slate-200">File Manager</strong> &rarr; navigate to <code className="text-slate-200">htdocs</code> or <code className="text-slate-200">public_html</code>.</li>
                        <li>Edit <code className="text-slate-200">index.html</code> (or <code className="text-slate-200">header.php</code>) and paste the snippet above anywhere between <code className="text-brand-400">&lt;head&gt;</code> and <code className="text-brand-400">&lt;/head&gt;</code>.</li>
                        <li>Save the file, clear any hosting cache, and click <strong>Verify Live Website</strong> below!</li>
                      </ol>
                    </div>

                    {/* Actions: Download file or Verify Live */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <button
                        onClick={handleDownloadPatchedFile}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
                      >
                        <Download className="h-4 w-4 text-brand-400" />
                        <span>Download Repaired File (index.html)</span>
                      </button>

                      <button
                        onClick={handleVerifyLive}
                        disabled={isVerifyingLive}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all"
                      >
                        {isVerifyingLive ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Pinging Live Website...</span>
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4" />
                            <span>Verify Live Website Now</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Live Verification Result Alert */}
                    {liveVerificationResult && (
                      <div
                        className={`rounded-xl p-4 text-xs border ${
                          liveVerificationResult.verified
                            ? "bg-emerald-950/50 border-emerald-800 text-emerald-200"
                            : "bg-amber-950/40 border-amber-800 text-amber-200"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {liveVerificationResult.verified ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div className="space-y-1 flex-1">
                            <span className="font-bold block text-sm">
                              {liveVerificationResult.verified
                                ? "Live Verification Succeeded!"
                                : "Not Detected on Live Server Yet"}
                            </span>
                            <p>{liveVerificationResult.message}</p>
                            {liveVerificationResult.observedValue && (
                              <p className="font-mono text-[11px] text-slate-300 mt-1">
                                Observed: {liveVerificationResult.observedValue}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: FTP / SFTP Push */}
                {activeTab === "ftp" && (
                  <div className="space-y-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <Server className="h-4 w-4 text-brand-400" />
                        <span>Push Directly to Web Server via FTP / FTPS</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        SiteDoctor AI will automatically connect, download an encrypted pre-repair backup snapshot, and upload the repaired file directly to your server.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1">FTP Host</label>
                        <input
                          type="text"
                          placeholder="ftpupload.net or ftp.mysite.com"
                          value={ftpHost}
                          onChange={(e) => setFtpHost(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Port</label>
                        <input
                          type="number"
                          placeholder="21"
                          value={ftpPort}
                          onChange={(e) => setFtpPort(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">FTP Username</label>
                        <input
                          type="text"
                          placeholder="epiz_34241944"
                          value={ftpUser}
                          onChange={(e) => setFtpUser(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">FTP Password</label>
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={ftpPassword}
                          onChange={(e) => setFtpPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-slate-400 block mb-1">Remote Web Directory</label>
                        <input
                          type="text"
                          placeholder="/htdocs or /public_html"
                          value={ftpRemoteDir}
                          onChange={(e) => setFtpRemoteDir(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleApproveAndApply(true)}
                        disabled={!ftpHost || !ftpUser}
                        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-lg shadow-brand-950/40 transition-all"
                      >
                        <Server className="h-4 w-4" />
                        <span>Deploy Directly to Remote Host (With Automated Backup)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Local Sandbox Staging */}
                {activeTab === "local" && (
                  <div className="space-y-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 text-xs">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                        <span>Local Sandbox Staging</span>
                      </h4>
                      <p className="text-slate-400 mt-1">
                        Saves the patched file into your local SiteDoctor AI sandbox (<code className="text-slate-200">./storage/site-roots/default</code>).
                      </p>
                    </div>
                    <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-3 text-amber-300">
                      <strong>Important Notice:</strong> Applying to local staging tests the cryptographic repair engine on your machine. It does <em>not</em> modify your live website (<code className="text-white">{finding.affectedUrl}</code>).
                    </div>
                    <button
                      onClick={() => handleApproveAndApply(false)}
                      className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
                    >
                      <ShieldCheck className="h-4 w-4 text-brand-400" />
                      <span>Stage in Local Sandbox</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approving / Applying Stage */}
          {(stage === "approving" || stage === "applying") && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-brand-400 animate-spin mx-auto" />
              <h4 className="font-bold text-sm text-white">
                {stage === "approving"
                  ? "Binding Immutable Cryptographic Approval..."
                  : "Creating Verified Backup & Applying Patch..."}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Validating SHA-256 pre-flight baseline, creating pre-flight snapshot, and executing atomic replacement.
              </p>
            </div>
          )}

          {/* Completed Stage */}
          {stage === "completed" && executionResult && (
            <div className="space-y-6 py-4">
              <div
                className={`rounded-2xl p-6 border text-center space-y-2 ${
                  executionResult.isLiveFtp
                    ? "bg-emerald-950/50 border-emerald-800 text-emerald-200"
                    : "bg-slate-950/70 border-slate-800 text-slate-200"
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto border ${
                    executionResult.isLiveFtp
                      ? "bg-emerald-900/60 text-emerald-400 border-emerald-700"
                      : "bg-brand-900/60 text-brand-400 border-brand-700"
                  }`}
                >
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white">
                  {executionResult.isLiveFtp
                    ? "Live Host Deployment Succeeded!"
                    : "Patched File Staged Successfully"}
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {executionResult.message}
                </p>
              </div>

              {/* Execution Audit Log */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 font-mono">
                  EXECUTION & VERIFICATION AUDIT LOG
                </span>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                  {executionResult.logs?.map((log: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up live check */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleVerifyLive}
                  disabled={isVerifyingLive}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  {isVerifyingLive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <span>Re-Check Live Website</span>
                </button>
                <button
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-5 py-2 rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
