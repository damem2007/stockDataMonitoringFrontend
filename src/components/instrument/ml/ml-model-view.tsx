"use client";

import { TablePanel } from "@/components/ui/data";
import { formatCell, percent } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function MlModelView() {
  const { analysis } = useInstrument();
  const ml = analysis?.ml || {};
  const validation = analysis?.mlValidation || {};
  const latest = latestHistoryRow(analysis?.history || []);
  const probability = Number(ml.probability_up ?? ml.probabilityUp ?? ml.p_up);
  const accuracy = Number(validation.out_of_sample_accuracy ?? ml.out_of_sample_accuracy);
  const baseline = Number(validation.baseline_accuracy);
  const rsi = Number(latest?.RSI14);
  const adx = Number(latest?.ADX14);
  const plusDi = Number(latest?.PlusDI);
  const minusDi = Number(latest?.MinusDI);
  const macdHist = Number(latest?.MACDHist);
  const edge = Number.isFinite(accuracy) && Number.isFinite(baseline) ? accuracy - baseline : NaN;

  return (
    <section className="info-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ML Model</p>
          <h2>Validated signal context</h2>
        </div>
      </div>
      <div className="analysis-card-grid">
        <InsightCard label="Model direction" value={Number.isFinite(probability) ? percent(probability) : "n/a"} detail={modelProbabilityText(probability, accuracy, baseline)} />
        <InsightCard label="RSI read" value={Number.isFinite(rsi) ? rsi.toFixed(1) : "n/a"} detail={rsiText(rsi)} />
        <InsightCard label="ADX trend strength" value={Number.isFinite(adx) ? adx.toFixed(1) : "n/a"} detail={adxText(adx, plusDi, minusDi)} />
      </div>
      <p className="muted">{String(ml.note || validation.note || "The model is scored against walk-forward validation before the live probability is shown.")}</p>
      <TablePanel rows={[{
        model: String(ml.model_name || ml.model || "logistic"),
        probabilityUp: Number.isFinite(probability) ? percent(probability) : "n/a",
        validationAccuracy: Number.isFinite(accuracy) ? percent(accuracy) : "n/a",
        baselineAccuracy: Number.isFinite(baseline) ? percent(baseline) : "n/a",
        edgeVsBaseline: Number.isFinite(edge) ? percent(edge) : "n/a",
        trainedSamples: formatCell(ml.trained_samples),
        macdHistogram: Number.isFinite(macdHist) ? macdHist.toFixed(3) : "n/a",
      }]} />
      {Array.isArray(validation.foldScores) && validation.foldScores.length > 0 ? (
        <>
          <h3>Walk-forward folds</h3>
          <TablePanel rows={validation.foldScores as Record<string, unknown>[]} />
        </>
      ) : null}
    </section>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="insight-card"><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}

function latestHistoryRow(rows: Record<string, unknown>[]) {
  return rows.length ? rows[rows.length - 1] : undefined;
}

function modelProbabilityText(probability: number, accuracy: number, baseline: number) {
  if (!Number.isFinite(probability)) return "No live probability is available for this symbol and horizon.";
  const direction = probability >= 0.55 ? "bullish" : probability <= 0.45 ? "bearish" : "mixed";
  if (!Number.isFinite(accuracy) || !Number.isFinite(baseline)) return `The live model leans ${direction}, but validation is not available.`;
  return `The live model leans ${direction}; validation is ${percent(accuracy)} versus a ${percent(baseline)} naive baseline.`;
}

function rsiText(rsi: number) {
  if (!Number.isFinite(rsi)) return "RSI is not available for the current history window.";
  if (rsi < 30) return "Oversold conditions can support a reversal setup, but confirmation still matters.";
  if (rsi > 70) return "Overbought conditions raise pullback risk, especially if trend strength is fading.";
  return "RSI is in a neutral zone, so confirmation should come from trend and momentum.";
}

function adxText(adx: number, plusDi: number, minusDi: number) {
  if (!Number.isFinite(adx)) return "ADX is not available for the current history window.";
  const direction = Number.isFinite(plusDi) && Number.isFinite(minusDi) ? (plusDi >= minusDi ? "+DI leads" : "-DI leads") : "direction unavailable";
  if (adx >= 25) return `Trend strength is meaningful and ${direction}.`;
  if (adx >= 18) return `Trend strength is developing but not decisive; ${direction}.`;
  return `Trend strength is weak/choppy, so model signals deserve extra caution; ${direction}.`;
}
