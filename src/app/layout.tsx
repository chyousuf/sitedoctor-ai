import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SiteDoctor AI | SEO, Technical Health, AEO & GEO Audit Platform",
  description:
    "Enterprise-grade SEO, Technical Health, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO) audit platform with safe, verifiable AI-assisted repairs and one-click rollback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800/80 bg-slate-900/60 py-8 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">SiteDoctor AI</span>
              <span>— Safe, Verifiable SEO & AI Repair Platform</span>
            </div>
            <div className="text-slate-400">
              Deterministic audits • Zero-credential AI prompts • Automated backup & rollback
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
