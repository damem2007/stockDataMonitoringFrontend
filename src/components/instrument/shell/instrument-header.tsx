"use client";

import Link from "next/link";
import { Bell, RefreshCw } from "lucide-react";
import { useInstrument } from "@/providers/instrument-provider";

export function InstrumentHeader() {
  const instrument = useInstrument();
  const basePath = `/${instrument.context}/${encodeURIComponent(instrument.symbol)}`;
  return (
    <header className="ss-instrument-header">
      <div className="ss-instrument-title-row">
        <div>
          <p className="ss-breadcrumb">
            <Link href={`/${instrument.context}`}>{instrument.context === "portfolio" ? "Portfolio" : "Watchlist"}</Link>
            <span>/</span>
            {instrument.symbol}
          </p>
          <h1 className="ss-instrument-title">{instrument.symbol}</h1>
        </div>
        <div className="ss-instrument-actions">
          <button className="ss-btn" type="button" onClick={() => void instrument.loadAnalysis()}>
            <RefreshCw size={14} /> Sync Instrument
          </button>
          <Link className="ss-btn ss-btn-primary" href={`${basePath}/alerts`}>
            <Bell size={14} /> Alert
          </Link>
        </div>
      </div>
      <p className="ss-instrument-subtitle">
        {instrument.analysis?.summary?.subtitle || "Summary, signals, charts, alerts, ML, news, backtest, and data sources for the selected instrument."}
      </p>
    </header>
  );
}
