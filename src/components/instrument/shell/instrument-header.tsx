"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { useInstrument } from "@/providers/instrument-provider";

export function InstrumentHeader() {
  const instrument = useInstrument();
  const basePath = `/${instrument.context}/${encodeURIComponent(instrument.symbol)}`;
  const workspaceLabel = instrument.context === "portfolio" ? "Portfolio" : "Watchlist";
  return (
    <header className="ss-instrument-header">
      <p className="ss-breadcrumb">
        <Link href={`/${instrument.context}`}>{workspaceLabel}</Link>
        <span>/</span>
        {instrument.symbol}
      </p>
      <div className="ss-instrument-title-row">
        <div>
          <h1 className="ss-instrument-title">{instrument.symbol}</h1>
          <p className="ss-instrument-subtitle">
            {instrument.analysis?.summary?.subtitle || "Company description unavailable from the current Yahoo snapshot."}
          </p>
        </div>
        <div className="ss-instrument-actions">
          <button className="ss-btn" type="button" onClick={() => void instrument.loadAnalysis()}>
            <RefreshCw size={14} /> Sync Instrument
          </button>
          <Link className="ss-btn ss-btn-primary" href={`${basePath}/alerts`}>
            <Plus size={14} /> Alert
          </Link>
        </div>
      </div>
    </header>
  );
}
