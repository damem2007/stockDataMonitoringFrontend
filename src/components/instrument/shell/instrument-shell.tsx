"use client";

import { useState } from "react";
import { Archive, Plus, Trash2 } from "lucide-react";
import { Metric } from "@/components/ui/data";
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
    {instrument.context === "portfolio" && instrument.portfolioRow && <><section className="instrument-metrics"><Metric label="Quantity" value={`${formatCell(instrument.portfolioRow.Shares)} shares`} /><Metric label="Avg cost" value={money(Number(instrument.portfolioRow["Avg Cost"]), currency)} /><Metric label="Book cost" value={money(Number(instrument.portfolioRow["Book Cost"]), currency)} /><Metric label="Market value" value={money(Number(instrument.portfolioRow["Market Value"]), currency)} /><Metric label="Unrealized P/L" value={money(unrealized, currency)} detail={percent(Number(instrument.portfolioRow["Since Purchase %"]))} /></section><section className="instrument-position-actions"><button type="button" onClick={() => setHoldingAction("add")}><Plus size={16} /> Add more stock</button><button type="button" onClick={() => setHoldingAction("transfer")}><Archive size={16} /> Transfer</button><button type="button" onClick={() => setHoldingAction("liquidate")}><Trash2 size={16} /> Liquidate</button></section></>}
    <section className="instrument-controls">
      <label>Risk profile<select value={workspace.riskProfile} onChange={(e) => workspace.setRiskProfile(e.target.value)}>{Object.keys(workspace.markets?.riskProfiles || { Balanced: {} }).map((profile) => <option key={profile}>{profile}</option>)}</select></label>
      <label>History<select value={instrument.period} onChange={(e) => instrument.setPeriod(e.target.value)}>{["6mo", "1y", "2y", "5y", "10y"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Interval<select value={instrument.interval} onChange={(e) => instrument.setInterval(e.target.value)}>{["5m", "15m", "1h", "1d", "1wk"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Intent<select value={instrument.selectedInstrument?.intent || "Hold / Watch"} onChange={(e) => void instrument.updatePreferences({ intent: e.target.value })}>{INTENTS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Strategy<select value={instrument.selectedInstrument?.strategy || "Buy-dip"} onChange={(e) => void instrument.updatePreferences({ strategy: e.target.value })}>{STRATEGIES.map((value) => <option key={value}>{value}</option>)}</select></label>
    </section>
    <div className="instrument-analysis"><InstrumentTabs basePath={basePath}/><section className="tab-panel">{instrument.analysisLoading && <div className="notice">Loading analysis...</div>}{children}</section></div>
  </section></div><HoldingActionModal action={holdingAction} row={instrument.portfolioRow || null} onClose={() => setHoldingAction(null)} /></main>;
}
