"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Plus,
  Activity,
  Globe2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDomain, setProjectDomain] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, auditRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/audits"),
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }

      if (auditRes.ok) {
        const aData = await auditRes.json();
        setRecentAudits(aData.audits || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !projectDomain) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, domain: projectDomain }),
      });

      if (res.ok) {
        setShowNewProjectModal(false);
        setProjectName("");
        setProjectDomain("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organization Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your monitored domains, connections, and automated audit schedules.
          </p>
        </div>

        <button
          onClick={() => setShowNewProjectModal(true)}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading projects & recent scans...</p>
        </div>
      ) : (
        <>
          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <FolderKanban className="h-10 w-10 text-slate-500 mx-auto" />
                <h3 className="font-bold text-base text-white">No Monitored Projects Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create a project to attach website connections (SFTP/WordPress/Git) and schedule automated weekly scans.
                </p>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Project
                </button>
              </div>
            ) : (
              projects.map((p) => {
                const latestAudit = p.audits?.[0];
                return (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-white">{p.name}</h3>
                        <span className="text-xs text-brand-400 font-mono flex items-center gap-1">
                          <Globe2 className="h-3.5 w-3.5" /> {p.domain}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {p.connections?.length || 0} Connections
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">
                          Latest Health
                        </span>
                        <span className="font-bold text-white text-base">
                          {latestAudit ? `${latestAudit.healthScore}%` : "Not Audited"}
                        </span>
                      </div>

                      {latestAudit ? (
                        <Link
                          href={`/audit/${latestAudit.id}`}
                          className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
                        >
                          View Report <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/?url=https://${p.domain}`}
                          className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-semibold"
                        >
                          Audit Now
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent Audits Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">Recent Crawl Audits</h3>
            {recentAudits.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audits recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Target Domain</th>
                      <th className="py-2.5 px-3">Health Score</th>
                      <th className="py-2.5 px-3">Issues</th>
                      <th className="py-2.5 px-3">Pages Crawled</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {recentAudits.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-white truncate max-w-xs">
                          {a.targetUrl}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          {a.healthScore}%
                        </td>
                        <td className="py-2.5 px-3 text-amber-400">{a.issuesCount}</td>
                        <td className="py-2.5 px-3 text-slate-400">{a.pagesCrawled}</td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/audit/${a.id}`}
                            className="text-brand-400 hover:text-brand-300 underline underline-offset-2"
                          >
                            Open Report
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Create New Monitored Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Blog"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Website Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="example.com"
                  value={projectDomain}
                  onChange={(e) => setProjectDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
