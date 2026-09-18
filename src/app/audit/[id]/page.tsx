"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ScoreGauge } from "@/components/ScoreGauge";
import { IssueExplorer } from "@/components/IssueExplorer";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const auditId = resolvedParams.id;

  const [auditData, setAuditData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"issues" | "pages">("issues");
  const [pageSearch, setPageSearch] = useState("");

  const fetchAudit = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audits/${auditId}`);
      if (!res.ok) {
        throw new Error("Audit report not found");
      }
      const data = await res.json();
      setAuditData(data.audit);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [auditId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center space-y-4">
        <Loader2 className="h-10 w-10 text-brand-400 animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-white">Loading Audit Report...</h2>
        <p className="text-xs text-slate-400">
          Gathering crawled pages, computing transparent scores, and cataloging findings.
        </p>
      </div>
    );
  }

  if (errorMsg || !auditData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-12 w-12 bg-rose-950/60 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-800">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Audit Report Error</h2>
        <p className="text-xs text-slate-400">{errorMsg || "Unable to load audit."}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Audits
        </Link>
      </div>
    );
  }

  const filteredPages = (auditData.pages || []).filter((p: any) =>
    p.url.toLowerCase().includes(pageSearch.toLowerCase())
  );

  const downloadReportJson = () => {
    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitedoctor-audit-${auditData.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Audits
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight break-all">
              {auditData.targetUrl}
            </h1>
            <a
              href={auditData.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(auditData.createdAt).toLocaleDateString()} at{" "}
              {new Date(auditData.createdAt).toLocaleTimeString()}
            </span>
            <span>•</span>
            <span className="capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {auditData.status}
            </span>
            <span>•</span>
            <span>{auditData.pagesCrawled} Pages Crawled</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAudit}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={downloadReportJson}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Report (JSON)</span>
          </button>
        </div>
      </div>

      {/* Score Overview */}
      <ScoreGauge
        overallScore={auditData.healthScore}
        aeoGeoScore={auditData.summary?.aeoGeoReadiness || 75}
        coveragePct={auditData.coveragePct}
        categories={auditData.categoryScores || {}}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setSelectedTab("issues")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            selectedTab === "issues"
              ? "border-brand-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Issues & Opportunities ({auditData.findings?.length || 0})</span>
        </button>

        <button
          onClick={() => setSelectedTab("pages")}
          className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors ${
            selectedTab === "pages"
              ? "border-brand-500 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Crawled Page Inventory ({auditData.pages?.length || 0})</span>
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === "issues" && (
        <IssueExplorer
          findings={auditData.findings || []}
          onRefresh={fetchAudit}
        />
      )}

      {selectedTab === "pages" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Crawled Pages</h3>
              <p className="text-xs text-slate-400">
                All URLs reached during this crawl session with HTTP status and response times.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search crawled URLs..."
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-64 font-mono"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">URL</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Depth</th>
                  <th className="py-2.5 px-3">TTFB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredPages.map((page: any) => (
                  <tr key={page.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          page.httpStatus === 200
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-rose-950 text-rose-300 border border-rose-800"
                        }`}
                      >
                        {page.httpStatus || "ERR"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium max-w-sm truncate">
                      {page.url}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-sans max-w-xs truncate">
                      {page.title || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{page.depth}</td>
                    <td className="py-2.5 px-3 text-slate-400">{page.responseTimeMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
