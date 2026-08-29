"use client";

import { useRouter } from "next/navigation";
import { RANGES } from "@/lib/constants";
import { useInstrument } from "@/providers/instrument-provider";
import { ChartTypeMenu } from "./chart-type-menu";
import { PriceChart } from "./price-chart";

function filterHistory(rows: Record<string, unknown>[], range: string) {
  if (!rows.length) return [];
  const now = new Date();
  const upper = now.getTime();
  if (range === "10Y") return rows.filter((row) => {
    const time = new Date(String(row.Date)).getTime();
    return Number.isFinite(time) && time <= upper;
  });
  if (range === "1D") {
    const lower = upper - 24 * 60 * 60 * 1000;
    return rows.filter((row) => {
      const time = new Date(String(row.Date)).getTime();
      return Number.isFinite(time) && time >= lower && time <= upper;
    });
  }
  const lower = range === "YTD"
    ? new Date(now.getFullYear(), 0, 1).getTime()
    : upper - (daysForRange(range) || 366) * 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const time = new Date(String(row.Date)).getTime();
    return Number.isFinite(time) && time >= lower && time <= upper;
  });
}

function daysForRange(range: string) {
  const days: Record<string, number> = { "5D": 5, "1W": 7, "1M": 31, "3M": 93, "6M": 186, "1Y": 366 };
  return days[range];
}

export function ChartView() {
  const instrument = useInstrument();
  const router = useRouter();
  const primary = filterHistory(instrument.analysis?.history || [], instrument.dateRange);
  const comparisonAnalysis = instrument.temporaryAnalysis || instrument.compareAnalysis;
  const comparison = comparisonAnalysis?.history ? filterHistory(comparisonAnalysis.history, instrument.dateRange) : [];
  return <div className="ss-chart-view">
    <div className="ss-chart-controls">
      <div className="ss-segmented">{RANGES.map((range) => <button className={instrument.dateRange === range ? "active" : ""} key={range} onClick={() => instrument.setDateRange(range)}>{range}</button>)}</div>
      <ChartTypeMenu value={instrument.chartType} onChange={instrument.setChartType} />
      <select className="ss-select" value={instrument.compareSymbol} onChange={(event) => instrument.setCompareSymbol(event.target.value)}><option value="">Compare loaded instrument</option>{instrument.compareOptions.map((symbol) => <option key={symbol}>{symbol}</option>)}</select>
    </div>
    <div className="ss-chart-card">
      <PriceChart primary={primary} comparison={comparison} primaryLabel={instrument.analysis?.symbol || ""} comparisonLabel={comparisonAnalysis?.symbol || ""} chartType={instrument.chartType} dateRange={instrument.dateRange} />
    </div>
    <div className="ss-temporary-row">
      <input value={instrument.temporarySymbol} onChange={(event) => instrument.setTemporarySymbol(event.target.value)} placeholder="Temporary comparison ticker" />
      <button className="ss-btn" onClick={() => void instrument.loadTemporaryComparison()}>Load temporary</button>
      <button className="ss-btn" disabled={!instrument.temporaryAnalysis?.symbol} onClick={() => void instrument.promoteTemporary("Watching")}>Add to watchlist</button>
      <button className="ss-btn ss-btn-primary" disabled={!instrument.temporaryAnalysis?.symbol} onClick={async () => { const promoted = await instrument.promoteTemporary("Trading"); if (promoted) router.push(`/portfolio/setup?symbol=${encodeURIComponent(promoted.symbol)}`); }}>Add to portfolio</button>
    </div>
  </div>;
}
