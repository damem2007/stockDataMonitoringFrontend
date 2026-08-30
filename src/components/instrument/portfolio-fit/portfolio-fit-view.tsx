"use client";

import { TablePanel } from "@/components/ui/data";
import { currencyForSymbol, money, percent } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function PortfolioFitView() {
  const { analysis, portfolioRow, context } = useInstrument();
  const signal = analysis?.signal || {};
  const regime = analysis?.marketRegime || {};
  const rows: Record<string, unknown>[] = [
    { context: "Instrument action", read: String(signal.action || "No action"), implication: String(signal.setup || "Open the Signal tab for the current execution plan.") },
    { context: "Market regime", read: String(regime.label || regime.regime || "No regime label available"), implication: "Use this to temper position size and confirmation requirements." },
  ];
  if (context === "portfolio" && portfolioRow) {
    rows.push(
      { context: "Portfolio allocation", read: percent(Number(portfolioRow["Portfolio %"])), implication: "Higher allocation increases concentration risk and should raise the confirmation bar before adding." },
      { context: "Unrealized P/L", read: money(Number(portfolioRow["Since Purchase $"]), currencyForSymbol(String(portfolioRow.Symbol))), implication: "Combine return since purchase with the current signal before adding, trimming, or holding." },
    );
  } else {
    rows.push({ context: "Portfolio status", read: "Watchlist only", implication: "Promote this ticker to portfolio only after entering purchase date, average price, and shares." });
  }
  return (
    <section className="ss-instrument-panel">
      <div className="ss-section-heading">
        <div>
          <p className="ss-eyebrow">Fit</p>
          <h2>Fit with portfolio</h2>
        </div>
      </div>
      <p className="ss-muted">This view explains how the selected instrument fits the user workflow. Portfolio-level P/L and allocation appear only for active holdings.</p>
      <TablePanel rows={rows} />
    </section>
  );
}
