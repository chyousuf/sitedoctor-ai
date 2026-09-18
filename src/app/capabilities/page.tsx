import { PLATFORM_CAPABILITY_MATRIX } from "@/lib/adapters/capability-matrix";
import { RULE_CATALOG } from "@/lib/rules/registry";
import { Layers, ShieldAlert, CheckCircle2, Wrench, BookOpen } from "lucide-react";

export default function CapabilitiesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-950/40 text-brand-300 text-xs font-semibold tracking-wide mb-3">
          <Layers className="h-3.5 w-3.5" />
          <span>Platform Transparency & Rule Documentation</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Platform Capability Matrix & Audit Rule Catalog
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          SiteDoctor AI clearly delineates audit scope from repair scope. Automatic changes are only executed through tested adapters with bounded permissions.
        </p>
      </div>

      {/* Capability Matrix Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="h-5 w-5 text-brand-400" />
          <span>Platform Adapter Capability Matrix</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORM_CAPABILITY_MATRIX.map((item) => (
            <div
              key={item.platform}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-mono text-brand-400 font-semibold">
                    {item.category}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${
                      item.status === "available"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : item.status === "manual_only"
                        ? "bg-slate-800 text-slate-300"
                        : "bg-purple-950 text-purple-300 border border-purple-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{item.platform}</h3>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-mono block text-[10px] uppercase">
                      Supported Connections
                    </span>
                    <p className="text-slate-300">{item.connectionMethods.join(", ")}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 font-mono block text-[10px] uppercase">
                      Supported Automatic Repairs
                    </span>
                    <ul className="text-slate-300 list-disc list-inside space-y-0.5 text-[11px]">
                      {item.supportedRepairs.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-slate-500 font-mono block text-[10px] uppercase">
                      Safety & Rollback
                    </span>
                    <p className="text-slate-300 text-[11px]">{item.backupAndRollback}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <span className="text-rose-400 font-semibold block text-[10px] uppercase font-mono">
                  Explicitly Unsupported
                </span>
                <p>{item.unsupportedOperations.join("; ")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Versioned Audit Rule Catalog */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-brand-400" />
          <span>Versioned Audit Rule Catalog ({RULE_CATALOG.length} Rules)</span>
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-3">Rule ID & Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Weight</th>
                <th className="py-3 px-3">AI Repairable</th>
                <th className="py-3 px-3">Standard Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {RULE_CATALOG.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3">
                    <div className="font-bold text-white font-sans">{rule.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {rule.id} v{rule.version}
                    </div>
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-300 font-sans">
                    {rule.category.replace("_", " ")}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                        rule.severity === "critical"
                          ? "bg-rose-950 text-rose-300"
                          : rule.severity === "high"
                          ? "bg-amber-950 text-amber-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-200">{rule.weight} pts</td>
                  <td className="py-3 px-3">
                    {rule.repairSupported ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-sans">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Yes (Risk: {rule.repairRisk})
                      </span>
                    ) : (
                      <span className="text-slate-500 font-sans">Manual Only</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-sans text-[11px]">
                    {rule.authoritativeSource || "Standard Web Best Practice"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
