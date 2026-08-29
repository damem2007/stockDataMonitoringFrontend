"use client";

import { useState } from "react";
import { Archive, Plus, Trash2 } from "lucide-react";
import { HoldingActionModal, type HoldingAction } from "@/components/portfolio/portfolio-dashboard";
import { INTENTS, STRATEGIES } from "@/lib/constants";
import { currencyForSymbol, formatCell, money, percent } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { InstrumentHeader } from "./instrument-header";
import { InstrumentTabs } from "./instrument-tabs";

export function InstrumentShell({ children }: { children: React.ReactNode }) {
  const instrument = useInstrument();
  const workspace = useWorkspace();
  const [holdingAction, setHoldingAction] = useState<HoldingAction>(null);
  const currency = currencyForSymbol(instrument.symbol);
  const unrealized = Number(instrument.portfolioRow?.["Since Purchase $"]);
  const basePath = `/${instrument.context}/${encodeURIComponent(instrument.symbol)}`;
  return <main className="dashboard-shell"><div className="dashboard-content"><section className="dashboard-main">
    <InstrumentHeader />
    {instrument.context === "portfolio" && instrument.portfolioRow && <>
      <section className="ss-instrument-stats" aria-label="Position metrics">
        <div className="ss-stat-tile"><span className="ss-stat-label">Quantity</span><span className="ss-stat-value">{formatCell(instrument.portfolioRow.Shares)} shares</span></div>
        <div className="ss-stat-tile"><span className="ss-stat-label">Avg cost</span><span className="ss-stat-value">{money(Number(instrument.portfolioRow["Avg Cost"]), currency)}</span></div>
        <div className="ss-stat-tile"><span className="ss-stat-label">Book cost</span><span className="ss-stat-value">{money(Number(instrument.portfolioRow["Book Cost"]), currency)}</span></div>
        <div className="ss-stat-tile"><span className="ss-stat-label">Market value</span><span className="ss-stat-value">{money(Number(instrument.portfolioRow["Market Value"]), currency)}</span></div>
        <div className="ss-stat-tile"><span className="ss-stat-label">Unrealized P/L</span><span className={`ss-stat-value ${unrealized >= 0 ? "ss-tone-emerald" : "ss-tone-coral"}`}>{money(unrealized, currency)}</span><span className={`ss-stat-sub ${unrealized >= 0 ? "ss-tone-emerald" : "ss-tone-coral"}`}>{percent(Number(instrument.portfolioRow["Since Purchase %"]))}</span></div>
      </section>
      <section className="ss-instrument-action-row">
        <button className="ss-btn ss-btn-primary" type="button" onClick={() => setHoldingAction("add")}><Plus size={14} /> Add more stock</button>
        <button className="ss-btn" type="button" onClick={() => setHoldingAction("transfer")}><Archive size={14} /> Transfer</button>
        <button className="ss-btn" type="button" onClick={() => setHoldingAction("liquidate")}><Trash2 size={14} /> Liquidate</button>
      </section>
    </>}
    <section className="ss-instrument-controls">
      <div className="ss-control-field"><label>Risk profile</label><select value={workspace.riskProfile} onChange={(e) => workspace.setRiskProfile(e.target.value)}>{Object.keys(workspace.markets?.riskProfiles || { Balanced: {} }).map((profile) => <option key={profile}>{profile}</option>)}</select></div>
      <div className="ss-control-field"><label>History</label><select value={instrument.period} onChange={(e) => instrument.setPeriod(e.target.value)}>{["6mo", "1y", "2y", "5y", "10y"].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="ss-control-field"><label>Interval</label><select value={instrument.interval} onChange={(e) => instrument.setInterval(e.target.value)}>{["5m", "15m", "1h", "1d", "1wk"].map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="ss-control-field"><label>Intent</label><select value={instrument.selectedInstrument?.intent || "Hold / Watch"} onChange={(e) => void instrument.updatePreferences({ intent: e.target.value })}>{INTENTS.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="ss-control-field"><label>Strategy</label><select value={instrument.selectedInstrument?.strategy || "Buy-dip"} onChange={(e) => void instrument.updatePreferences({ strategy: e.target.value })}>{STRATEGIES.map((value) => <option key={value}>{value}</option>)}</select></div>
    </section>
    <div className="instrument-analysis"><InstrumentTabs basePath={basePath}/><section className="tab-panel">{instrument.analysisLoading && <div className="notice">Loading analysis...</div>}{children}</section></div>
  </section></div><HoldingActionModal action={holdingAction} row={instrument.portfolioRow || null} onClose={() => setHoldingAction(null)} /></main>;
}
