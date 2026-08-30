"use client";

import { TablePanel } from "@/components/ui/data";
import { formatCell, percent } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function BacktestView() {
  const { analysis } = useInstrument();
  const backtest = (analysis?.backtest || {}) as Record<string, unknown>;
  const stats = backtest.stats as Record<string, unknown> | undefined;
  const summary = backtest.walkForwardSummary as Record<string, unknown> | undefined;
  const windows = Array.isArray(backtest.walkForward) ? backtest.walkForward as Record<string, unknown>[] : [];
  const latest = latestHistoryRow(analysis?.history || []);
  const rsi = Number(latest?.RSI14);
  const adx = Number(latest?.ADX14);
  const trades = Number(stats?.trades ?? stats?.trade_count);
  const winRate = Number(stats?.win_rate);
  const profitFactor = Number(stats?.profit_factor);
  const consistency = Number(summary?.consistency_rate);

  return (
    <section className="ss-instrument-panel">
      <div className="ss-section-heading">
        <div>
          <p className="ss-eyebrow">Backtest</p>
          <h2>RSI pullback rule check</h2>
        </div>
      </div>
      <div className="ss-analysis-card-grid">
        <InsightCard label="Rule sample" value={Number.isFinite(trades) ? `${trades.toFixed(0)} trades` : "n/a"} detail={tradeSampleText(trades)} />
        <InsightCard label="Win rate" value={Number.isFinite(winRate) ? percent(winRate) : "n/a"} detail={winRateText(winRate, profitFactor)} />
        <InsightCard label="Current RSI / ADX" value={`${Number.isFinite(rsi) ? rsi.toFixed(1) : "n/a"} / ${Number.isFinite(adx) ? adx.toFixed(1) : "n/a"}`} detail={regimeText(rsi, adx)} />
      </div>
      <p className="ss-muted">
        This tab tests the existing RSI + EMA20 pullback rule against history and compares walk-forward windows. ADX is used as context because a low-ADX market can make pullback entries noisy.
      </p>
      <TablePanel rows={[{
        trades: stats?.trades || stats?.trade_count,
        winRate: Number.isFinite(winRate) ? percent(winRate) : "n/a",
        profitFactor: Number.isFinite(profitFactor) ? profitFactor.toFixed(2) : "n/a",
        averageReturn: formatPercent(stats?.avg_return),
        strategyTotalReturn: formatPercent(stats?.strategy_total_return),
        buyHoldReturn: formatPercent(stats?.benchmark_total_return),
        maxDrawdown: formatPercent(stats?.max_equity_drawdown),
        windowsWithTrades: summary?.windows_with_trades,
        consistencyRate: Number.isFinite(consistency) ? percent(consistency) : "n/a",
      }]} />
      {windows.length > 0 ? (
        <>
          <h3>Walk-forward windows</h3>
          <TablePanel rows={windows} />
        </>
      ) : null}
    </section>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="ss-insight-card"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function latestHistoryRow(rows: Record<string, unknown>[]) {
  return rows.length ? rows[rows.length - 1] : undefined;
}

function tradeSampleText(trades: number) {
  if (!Number.isFinite(trades) || trades <= 0) return "No qualifying pullback trades were found for this history window.";
  if (trades < 30) return "Small sample: treat the result as directional evidence, not a reliable estimate.";
  return "Sample size is usable for comparison, though still symbol- and regime-dependent.";
}

function winRateText(winRate: number, profitFactor: number) {
  if (!Number.isFinite(winRate)) return "Win rate is unavailable because the rule produced no trades.";
  const pf = Number.isFinite(profitFactor) ? ` Profit factor is ${profitFactor.toFixed(2)}.` : "";
  if (winRate >= 0.55) return `The rule won more often than it lost in this sample.${pf}`;
  if (winRate <= 0.45) return `The rule struggled in this sample.${pf}`;
  return `The win rate is mixed and needs support from payoff quality.${pf}`;
}

function regimeText(rsi: number, adx: number) {
  const rsiText = Number.isFinite(rsi) && rsi < 30 ? "RSI is oversold" : Number.isFinite(rsi) && rsi > 70 ? "RSI is stretched" : "RSI is neutral";
  const adxText = Number.isFinite(adx) && adx >= 25 ? "trend strength is meaningful" : "trend strength is weak to moderate";
  return `${rsiText}; ${adxText}.`;
}

function formatPercent(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? percent(number) : formatCell(value);
}
