"use client";

import Link from "next/link";
import { useInstrument } from "@/providers/instrument-provider";

export function InstrumentHeader() {
  const instrument = useInstrument();
  const basePath = `/${instrument.context}/${encodeURIComponent(instrument.symbol)}`;
  return (
    <header className="instrument-hero">
      <div>
        <div className="breadcrumb"><Link href={`/${instrument.context}`}>{instrument.context === "portfolio" ? "Portfolio" : "Watchlist"}</Link><span>/</span><span>{instrument.symbol}</span></div>
        <h1>{instrument.symbol}</h1>
        <p className="muted">{instrument.analysis?.summary?.subtitle || "Summary, signals, charts, alerts, ML, news, backtest, and data sources for the selected instrument."}</p>
      </div>
      <div className="header-actions"><button onClick={() => void instrument.loadAnalysis()}>Sync Instrument</button><Link className="button-link primary" href={`${basePath}/alerts`}>+ Alert</Link></div>
    </header>
  );
}
