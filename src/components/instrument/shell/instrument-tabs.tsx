"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, BrainCircuit, ChartPie, Database, FileText, GitCompareArrows, History, LucideChartCandlestick, Newspaper } from "lucide-react";

const TABS = [
  { slug: "summary", label: "Summary", icon: FileText },
  { slug: "signal", label: "Signal", icon: Activity },
  { slug: "chart", label: "Chart", icon: LucideChartCandlestick },
  { slug: "ml-model", label: "ML model", icon: BrainCircuit },
  { slug: "backtest", label: "Backtest", icon: History },
  { slug: "fit", label: "Fit with portfolio", icon: ChartPie },
  { slug: "news", label: "News", icon: Newspaper },
  { slug: "correlation", label: "Correlation", icon: GitCompareArrows },
  { slug: "alerts", label: "Alerts", icon: Bell },
  { slug: "data-sources", label: "Data sources", icon: Database },
];

export function InstrumentTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  return <nav className="instrument-tabs" aria-label="Instrument analysis">{TABS.map(({ slug, label, icon: Icon }) => <Link key={slug} href={`${basePath}/${slug}`} className={pathname.endsWith(`/${slug}`) ? "active" : ""}><Icon size={16} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span></Link>)}</nav>;
}
