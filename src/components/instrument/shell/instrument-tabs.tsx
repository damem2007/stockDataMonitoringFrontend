"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "summary", label: "Summary" },
  { slug: "signal", label: "Signal" },
  { slug: "chart", label: "Chart" },
  { slug: "ml-model", label: "ML model" },
  { slug: "backtest", label: "Backtest" },
  { slug: "fit", label: "Fit with portfolio" },
  { slug: "news", label: "News" },
  { slug: "correlation", label: "Correlation" },
  { slug: "alerts", label: "Alerts" },
  { slug: "data-sources", label: "Data sources" },
];

export function InstrumentTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  return <nav className="ss-instrument-tabs" aria-label="Instrument analysis">{TABS.map(({ slug, label }) => <Link key={slug} href={`${basePath}/${slug}`} className={pathname.endsWith(`/${slug}`) ? "active" : ""}>{label}</Link>)}</nav>;
}
