"use client";

import { useMemo } from "react";

interface DiffViewerProps {
  unifiedDiff: string;
  filename?: string;
}

export function DiffViewer({ unifiedDiff, filename }: DiffViewerProps) {
  const lines = useMemo(() => {
    return unifiedDiff.split("\n");
  }, [unifiedDiff]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs overflow-hidden shadow-xl">
      {filename && (
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-slate-300">
          <span className="font-semibold text-slate-200">{filename}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
            Unified Diff
          </span>
        </div>
      )}
      <div className="overflow-x-auto p-3 max-h-96">
        <pre className="space-y-0.5">
          {lines.map((line, idx) => {
            let lineClass = "text-slate-300";
            let bgClass = "";

            if (line.startsWith("+") && !line.startsWith("+++")) {
              lineClass = "text-emerald-300";
              bgClass = "bg-emerald-950/40";
            } else if (line.startsWith("-") && !line.startsWith("---")) {
              lineClass = "text-rose-300";
              bgClass = "bg-rose-950/40";
            } else if (line.startsWith("@@")) {
              lineClass = "text-cyan-400";
              bgClass = "bg-cyan-950/20";
            }

            return (
              <div
                key={idx}
                className={`flex items-start px-2 py-0.5 rounded ${bgClass}`}
              >
                <span className="w-8 select-none text-right pr-3 text-slate-600 font-mono">
                  {idx + 1}
                </span>
                <span className={`flex-1 whitespace-pre-wrap break-all ${lineClass}`}>
                  {line || " "}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
