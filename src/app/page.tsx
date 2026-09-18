"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Globe2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers,
  FileCheck,
  CheckCircle2,
  Lock,
  Wrench,
  Loader2,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState("");
  const [maxPages, setMaxPages] = useState("10");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl,
          maxPages: parseInt(maxPages, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to run audit");
      }

      router.push(`/audit/${data.auditId}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-950/40 text-brand-300 text-xs font-semibold tracking-wide shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            <span>Next-Gen Technical SEO, AEO & GEO Auditing</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Audit Website Health. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400">
              Safely Repair Issues with AI.
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Uncover crawlability traps, meta omissions, and Answer Engine gaps. Review verified code diffs and apply automated repairs with instant rollback.
          </p>

          {/* Audit Form Card */}
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl shadow-brand-950/40 mt-8">
            <form onSubmit={handleStartAudit} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe2 className="h-5 w-5" />
                  </div>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-mono"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <select
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="1">1 page (Quick)</option>
                    <option value="10">10 pages</option>
                    <option value="25">25 pages</option>
                    <option value="50">50 pages</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Crawling...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Audit</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="text-left text-xs bg-rose-950/40 border border-rose-800 text-rose-300 p-3 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  SSRF-Shielded Crawler
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Deterministic Rules
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Safe Backups & Rollbacks
                </span>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-bold text-white">Full-Stack Technical SEO & AI Readiness</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            Engineered for SEO specialists, developers, and agency teams with zero-hallucination audits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Bounded Crawl Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Respects robots.txt, traverses XML sitemaps, handles redirect chains, detects crawl-traps, and flags orphan pages with verified source evidence.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/60 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">AEO & GEO Readiness</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Audits extractable answer structures, question headings, tables, and AI bot access policies for Perplexity, Google SGE, and Claude citations.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
              <Wrench className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Controlled AI Repairs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bound by immutable approval hashes. Encrypted backups, pre-flight collision checks, atomic file writes, and one-click rollback guarantee safety.
            </p>
          </div>
        </div>
      </section>

      {/* Safety & Isolation Banner */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-brand-950/40 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              <Lock className="h-4 w-4" />
              <span>Enterprise Grade Security</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Zero-Credential AI Policy & Egress Guard
            </h3>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Raw credentials never touch AI prompts or client responses. Egress calls strictly filter RFC1918 subnets, cloud metadata (169.254.169.254), and loopbacks.
            </p>
          </div>
          <a
            href="/capabilities"
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl border border-slate-700 shrink-0 transition-colors"
          >
            View Capability Matrix
          </a>
        </div>
      </section>
    </div>
  );
}
