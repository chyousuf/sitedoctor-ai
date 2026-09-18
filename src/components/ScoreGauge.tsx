"use client";

import { useState } from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";

interface CategorySummary {
  score: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  totalTested: number;
}

interface ScoreGaugeProps {
  overallScore: number;
  aeoGeoScore: number;
  coveragePct: number;
  categories: Record<string, CategorySummary>;
}

export function ScoreGauge({
  overallScore,
  aeoGeoScore,
  coveragePct,
  categories,
}: ScoreGaugeProps) {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500 bg-emerald-950/30";
    if (score >= 65) return "text-amber-400 border-amber-500 bg-amber-950/30";
    return "text-rose-400 border-rose-500 bg-rose-950/30";
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 65) return "bg-amber-500";
    return "bg-rose-500";
  };

  const categoryLabels: Record<string, { label: string; weight: string }> = {
    crawlability: { label: "Crawlability & Indexing", weight: "25%" },
    onpage: { label: "On-Page SEO", weight: "25%" },
    performance: { label: "Performance & Mobile", weight: "15%" },
    structured_data: { label: "Structured Data (Schema)", weight: "15%" },
    quality: { label: "Quality & Security", weight: "10%" },
    images: { label: "Images & Media", weight: "10%" },
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8 pb-6 border-b border-slate-800">
        {/* Overall Technical Health Gauge */}
        <div className="flex items-center gap-6">
          <div
            className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-bold shadow-inner ${getScoreColor(
              overallScore
            )}`}
          >
            <span className="text-3xl tracking-tight">{overallScore}%</span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Health</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Technical Site Health</h2>
              <button
                onClick={() => setShowFormulaModal(true)}
                className="text-slate-400 hover:text-white transition-colors"
                title="View Scoring Formula & Weights"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Deterministic health index across 6 core technical pillars. Excludes unknown checks from the denominator.
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="font-semibold text-white">{coveragePct}%</span>
                <span className="text-slate-500">Test Coverage</span>
              </div>
              <span className="text-slate-700">•</span>
              <button
                onClick={() => setShowFormulaModal(true)}
                className="text-brand-400 hover:text-brand-300 underline underline-offset-4"
              >
                Scoring Formula
              </button>
            </div>
          </div>
        </div>

        {/* Heuristic AEO & GEO Readiness Card */}
        <div className="w-full lg:w-72 bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 uppercase tracking-wider font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AEO & GEO Readiness</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              Heuristic advisory score for Answer Engines (Perplexity, Google SGE) & LLM extraction.
            </p>
          </div>
          <div
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg ${getScoreColor(
              aeoGeoScore
            )}`}
          >
            {aeoGeoScore}%
          </div>
        </div>
      </div>

      {/* Category Breakdown Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {Object.entries(categoryLabels).map(([catKey, info]) => {
          const summary = categories[catKey] || {
            score: 100,
            passedCount: 0,
            warningCount: 0,
            failedCount: 0,
            totalTested: 0,
          };

          return (
            <div
              key={catKey}
              className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-200">{info.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{summary.score}%</span>
                  <span className="text-[10px] text-slate-500 font-mono">({info.weight})</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full ${getBarColor(summary.score)} transition-all duration-500`}
                  style={{ width: `${summary.score}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {summary.passedCount} pass
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> {summary.warningCount} warn
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <XCircle className="h-3 w-3" /> {summary.failedCount} fail
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formula Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Transparent Scoring Formula</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              SiteDoctor AI computes health deterministically without artificial penalties.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 my-4 font-mono text-xs text-slate-200 leading-relaxed">
              Category Score = Σ(RuleWeight × Multiplier) / Σ(ApplicableWeights) × 100
              <br />
              • Passed: 1.0 multiplier
              <br />
              • Warning: 0.5 multiplier
              <br />
              • Failed: 0.0 multiplier
              <br />
              • Inapplicable / Blocked: Excluded from denominator!
            </div>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Crawlability & Indexing</span>
                <span className="font-semibold text-white">25%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>On-Page SEO Content</span>
                <span className="font-semibold text-white">25%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Performance & Mobile Viewport</span>
                <span className="font-semibold text-white">15%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Structured Data (Schema.org)</span>
                <span className="font-semibold text-white">15%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Quality & Security (HTTPS/Mixed)</span>
                <span className="font-semibold text-white">10%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Images & Media Accessibility</span>
                <span className="font-semibold text-white">10%</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
