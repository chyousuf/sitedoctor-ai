"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldCheck, Wrench, Layers, FolderKanban } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "New Audit", href: "/", icon: Activity },
    { label: "Dashboard", href: "/dashboard", icon: FolderKanban },
    { label: "Repairs & Rollbacks", href: "/repairs", icon: Wrench },
    { label: "Capability Matrix", href: "/capabilities", icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
              SiteDoctor <span className="text-brand-400">AI</span>
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">
              Audit & Repair SaaS
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white border border-slate-700"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4 text-slate-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-full text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>KMS Vault Active</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 text-sm font-semibold transition-all shadow-md shadow-brand-600/20"
          >
            Run Audit
          </Link>
        </div>
      </div>
    </header>
  );
}
