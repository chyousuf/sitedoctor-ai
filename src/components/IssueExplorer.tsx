"use client";

import { useState, useMemo } from "react";
import { RepairModal } from "./RepairModal";
import {
  Wrench,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
} from "lucide-react";

interface IssueExplorerProps {
  findings: any[];
  onRefresh?: () => void;
}

export function IssueExplorer({ findings, onRefresh }: IssueExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [onlyRepairable, setOnlyRepairable] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeRepairFinding, setActiveRepairFinding] = useState<any | null>(null);

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "crawlability", label: "Crawlability" },
    { id: "onpage", label: "On-Page SEO" },
    { id: "images", label: "Images" },
    { id: "structured_data", label: "Schema" },
    { id: "performance", label: "Performance" },
    { id: "aeo_geo", label: "AEO / GEO" },
    { id: "quality", label: "Quality" },
  ];

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedCategory !== "all" && f.category !== selectedCategory) return false;
      if (selectedSeverity !== "all" && f.severity !== selectedSeverity) return false;
      if (onlyRepairable && !f.repairSupported) return false;
      return true;
    });
  }, [findings, selectedCategory, selectedSeverity, onlyRepairable]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-rose-950/60 text-rose-300 border-rose-800";
      case "high":
        return "bg-amber-950/60 text-amber-300 border-amber-800";
      case "medium":
        return "bg-yellow-950/40 text-yellow-300 border-yellow-800/80";
      case "low":
        return "bg-blue-950/40 text-blue-300 border-blue-800/80";
      default:
        return "bg-purple-950/40 text-purple-300 border-purple-800/80";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Discovered Issues & Opportunities</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Prioritized by severity, affected scope, and safe AI repair support.
          </p>
        </div>

        {/* Repairable toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700">
            <input
              type="checkbox"
              checked={onlyRepairable}
              onChange={(e) => setOnlyRepairable(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-0"
            />
            <span className="flex items-center gap-1.5 text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              Repairable with AI Only
            </span>
          </label>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                : "bg-slate-950/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Issues List Table */}
      {filteredFindings.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          No issues found matching the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedId === finding.id;
            return (
              <div
                key={finding.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      {finding.severity === "critical" ? (
                        <AlertCircle className="h-4 w-4 text-rose-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">
                          {finding.title}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${getSeverityBadge(
                            finding.severity
                          )}`}
                        >
                          {finding.severity}
                        </span>
                        {finding.workflowStatus === "fixed" && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Fixed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {finding.explanation}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {finding.repairSupported && finding.workflowStatus !== "fixed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveRepairFinding(finding);
                        }}
                        className="flex items-center gap-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>Fix with AI</span>
                      </button>
                    )}
                    <button className="text-slate-500 hover:text-white">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-900/40 p-4 text-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 font-mono block text-[10px] uppercase">
                          Observed Condition
                        </span>
                        <span className="text-slate-300 font-mono text-[11px] block mt-0.5">
                          {finding.observedValue || "None observed"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-mono block text-[10px] uppercase">
                          Expected Standard
                        </span>
                        <span className="text-slate-300 font-mono text-[11px] block mt-0.5">
                          {finding.expectedValue || "Standard compliance"}
                        </span>
                      </div>
                    </div>

                    {finding.evidenceSnippet && (
                      <div>
                        <span className="text-slate-500 font-mono block text-[10px] uppercase">
                          Evidence Snippet
                        </span>
                        <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 font-mono text-[11px] mt-1 overflow-x-auto">
                          {finding.evidenceSnippet}
                        </pre>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-500 font-mono block text-[10px] uppercase">
                        Recommended Remediation
                      </span>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        {finding.remediation}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                      <span>Affected URL: {finding.affectedUrl}</span>
                      <span>Rule ID: {finding.ruleId} v{finding.ruleVersion}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Repair Modal */}
      {activeRepairFinding && (
        <RepairModal
          finding={activeRepairFinding}
          onClose={() => setActiveRepairFinding(null)}
          onRepairCompleted={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
