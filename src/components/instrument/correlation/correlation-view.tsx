"use client";

import { useEffect } from "react";
import { TablePanel } from "@/components/ui/data";
import { useInstrument } from "@/providers/instrument-provider";
import { useWorkspace } from "@/providers/workspace-provider";

function summarizeCorrelation(rows: Record<string, unknown>[]) {
  if (!rows.length) return ["Correlation matrix is loading or unavailable."];
  const pairs: { label: string; value: number }[] = [];
  for (const row of rows) {
    const left = String(row.symbol || "");
    for (const [right, raw] of Object.entries(row)) {
      if (!left || right === "symbol" || right === left) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) pairs.push({ label: `${left} / ${right}`, value });
    }
  }
  const strongest = pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  if (!strongest) return ["No pairwise correlation could be calculated."];
  const direction = strongest.value >= 0 ? "move together" : "move in opposite directions";
  return [`Strongest relationship: ${strongest.label} at ${strongest.value.toFixed(2)}, meaning they currently tend to ${direction}.`];
}

export function CorrelationView() {
  const { correlation, loadCorrelation, dateRange, period, interval } = useInstrument();
  const { activeSymbols } = useWorkspace();
  useEffect(() => { void loadCorrelation(); }, [loadCorrelation, activeSymbols.join("|"), dateRange, period, interval]);
  if (activeSymbols.length < 2) {
    return (
      <section className="ss-instrument-panel ss-empty-panel">
        <p className="ss-eyebrow">Correlation</p>
        <h2>Correlation</h2>
        <p className="ss-muted">Load at least two instruments to calculate correlation.</p>
      </section>
    );
  }
  const rows = correlation?.matrix || [];
  return (
    <section className="ss-instrument-panel">
      <div className="ss-section-heading">
        <div>
          <p className="ss-eyebrow">Correlation</p>
          <h2>Correlation</h2>
        </div>
      </div>
      <ul className="ss-summary-list">{summarizeCorrelation(rows).map((item) => <li key={item}>{item}</li>)}</ul>
      <TablePanel rows={rows} />
    </section>
  );
}
