"use client";

import { MouseEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { ChartTooltip, type ChartHoverPoint, tooltipText } from "./chart-tooltip";

export function PriceChart({ primary, comparison, primaryLabel, comparisonLabel, chartType, dateRange }: {
  primary: Record<string, unknown>[];
  comparison: Record<string, unknown>[];
  primaryLabel: string;
  comparisonLabel: string;
  chartType: string;
  dateRange: string;
}) {
  const [hoverPoint, setHoverPoint] = useState<ChartHoverPoint | null>(null);
  const [zoomDomain, setZoomDomain] = useState<TimeDomain | null>(null);
  const dragRef = useRef<{ x: number; domain: TimeDomain } | null>(null);
  const width = 1180;
  const height = 520;
  const plot = { left: 28, right: width - 92, top: 36, bottom: height - 64 };
  const baseDomain = useMemo(() => timeDomain(primary, comparison, dateRange), [primary, comparison, dateRange]);
  const domain = constrainDomain(zoomDomain || baseDomain, baseDomain, 0.08);
  const visiblePrimary = rowsInDomain(primary, domain);
  const visibleComparison = rowsInDomain(comparison, domain);
  const all = [...visiblePrimary, ...visibleComparison];
  const values = all.map((row) => Number(row.Close)).filter(Number.isFinite);
  useEffect(() => {
    setZoomDomain(null);
  }, [dateRange, primaryLabel, comparisonLabel]);
  if (!values.length) return <div className="chart-frame empty-chart"><p className="muted">No chart data available for this range.</p></div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yDomain = valueDomain(min, max);
  const yTicks = yAxisTicks(yDomain.min, yDomain.max, 5);
  const resolvedChartType = chartType === "Mountain" ? "Area" : chartType;
  const primaryPath = pathFor(visiblePrimary, plot, yDomain.min, yDomain.max, domain);
  const comparisonPath = pathFor(visibleComparison, plot, yDomain.min, yDomain.max, domain);
  const xLabels = xAxisLabels(dateRange, domain, plot);
  const xGrid = xGridLines(dateRange, domain, plot);
  const baseline = visiblePrimary.length ? Number(visiblePrimary[0].Close) : min;
  const latest = latestFiniteRow(visiblePrimary);
  const latestClose = latest ? Number(latest.Close) : Number.NaN;
  const latestY = Number.isFinite(latestClose) ? yFor(latestClose, plot, yDomain.min, yDomain.max) : null;
  const clipId = `chart-clip-${primaryLabel.replace(/[^a-z0-9_-]/gi, "-") || "instrument"}`;
  const isZoomed = zoomDomain !== null;

  function updateZoom(event: WheelEvent<SVGRectElement>) {
    event.preventDefault();
    const pointerRatio = pointerRatioForEvent(event, event.currentTarget);
    setZoomDomain(zoomDomainForWheel(domain, baseDomain, pointerRatio, event.deltaY));
  }

  function startPan(event: MouseEvent<SVGRectElement>) {
    event.preventDefault();
    dragRef.current = { x: event.clientX, domain };
  }

  function movePan(event: MouseEvent<SVGRectElement>) {
    const widthPx = event.currentTarget.getBoundingClientRect().width || 1;
    if (!dragRef.current) {
      const pointerRatio = pointerRatioForEvent(event, event.currentTarget);
      const x = plot.left + pointerRatio * (plot.right - plot.left);
      const row = nearestRowForX(visiblePrimary, x, plot, domain);
      if (!row) return;
      setHoverPoint({ x, y: yFor(Number(row.Close), plot, yDomain.min, yDomain.max), row });
      return;
    }
    const deltaRatio = (event.clientX - dragRef.current.x) / widthPx;
    const span = dragRef.current.domain.end - dragRef.current.domain.start;
    setZoomDomain(constrainDomain({
      start: dragRef.current.domain.start - deltaRatio * span,
      end: dragRef.current.domain.end - deltaRatio * span,
    }, baseDomain, 0.08));
  }

  function endPan() {
    dragRef.current = null;
  }
  return (
    <div className="chart-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price comparison chart">
        <defs><clipPath id={clipId}><rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} /></clipPath></defs>
        <rect className="chart-bg" x="0" y="0" width={width} height={height} rx="8" />
        <rect className="plot-bg" x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} />
        {xGrid.map((x) => <line className="grid-line vertical-grid" key={`x-${x}`} x1={x} x2={x} y1={plot.top} y2={plot.bottom} />)}
        {yTicks.map((tick) => {
          const y = yFor(tick, plot, yDomain.min, yDomain.max);
          return <g key={tick}><line className="grid-line" x1={plot.left} x2={plot.right} y1={y} y2={y} /><text className="axis-label y-axis-label" x={plot.right + 10} y={y + 4} textAnchor="start">{formatAxisPrice(tick)}</text></g>;
        })}
        <line className="right-axis-line" x1={plot.right} x2={plot.right} y1={plot.top} y2={plot.bottom} />
        <line className="bottom-axis-line" x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} />
        <g clipPath={`url(#${clipId})`}>
          {renderVolume(visiblePrimary, plot, domain)}
          {resolvedChartType === "Baseline" && Number.isFinite(baseline) && <line className="baseline-rule" x1={plot.left} x2={plot.right} y1={yFor(baseline, plot, yDomain.min, yDomain.max)} y2={yFor(baseline, plot, yDomain.min, yDomain.max)} />}
          {resolvedChartType === "Baseline" && <path d={areaPathFor(visiblePrimary, plot, yDomain.min, yDomain.max, domain)} className="baseline-area" />}
          {resolvedChartType === "Area" && <path d={areaPathFor(visiblePrimary, plot, yDomain.min, yDomain.max, domain)} className="area-primary" />}
          {resolvedChartType === "Bar" && renderBars(visiblePrimary, plot, yDomain.min, yDomain.max, domain)}
          {resolvedChartType === "Candlestick" && renderCandles(visiblePrimary, plot, yDomain.min, yDomain.max, domain)}
          {(resolvedChartType === "Line" || resolvedChartType === "Area" || resolvedChartType === "Baseline") && <path d={primaryPath} className="line-primary" />}
          {comparisonPath && <path d={comparisonPath} className="line-compare" />}
        </g>
        {hoverPoint && <g className="chart-crosshair"><line x1={hoverPoint.x} x2={hoverPoint.x} y1={plot.top} y2={plot.bottom} /><line x1={plot.left} x2={plot.right} y1={hoverPoint.y} y2={hoverPoint.y} /></g>}
        {latestY !== null && <g><line className="current-price-line" x1={plot.left} x2={plot.right} y1={latestY} y2={latestY} /><text className="current-price-label" x={plot.right + 8} y={latestY + 4}>{formatAxisPrice(latestClose)}</text></g>}
        {visiblePrimary.map((row, index) => {
          const close = Number(row.Close);
          if (!Number.isFinite(close)) return null;
          const x = xForDate(row.Date, plot, domain);
          const y = yFor(close, plot, yDomain.min, yDomain.max);
          return <circle className="chart-hover-target" key={`${String(row.Date)}-${index}`} cx={x} cy={y} r="8" onMouseEnter={() => setHoverPoint({ x, y, row })} onMouseLeave={() => setHoverPoint(null)}><title>{tooltipText(row, dateRange)}</title></circle>;
        })}
        <rect
          className="chart-interaction-layer"
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          onWheel={updateZoom}
          onMouseDown={startPan}
          onMouseMove={movePan}
          onMouseUp={endPan}
          onMouseLeave={() => { endPan(); setHoverPoint(null); }}
        />
        {xLabels.map((label) => <text className="axis-label x-axis-label" key={`${label.x}-${label.text}`} x={label.x} y={height - 16} textAnchor={label.anchor}>{label.text}</text>)}
        {latest && <text className="ohlc-strip" x={plot.left} y="22">{ohlcStrip(latest)}</text>}
      </svg>
      <div className="chart-zoom-controls">
        <span>{rangeDescription(dateRange, domain)}</span>
        <button type="button" onClick={() => setZoomDomain(zoomByButton(domain, baseDomain, 0.75))}>+</button>
        <button type="button" onClick={() => setZoomDomain(zoomByButton(domain, baseDomain, 1.35))}>-</button>
        <button type="button" disabled={!isZoomed} onClick={() => setZoomDomain(null)}>Reset</button>
      </div>
      {hoverPoint && <ChartTooltip point={hoverPoint} width={width} height={height} dateRange={dateRange} />}
      <div className="legend"><span>{primaryLabel}</span>{comparisonLabel && <span>{comparisonLabel}</span>}</div>
    </div>
  );
}

type PlotArea = { left: number; right: number; top: number; bottom: number };
type TimeDomain = { start: number; end: number };
type TextAnchor = "start" | "middle" | "end";

function pathFor(rows: Record<string, unknown>[], plot: PlotArea, min: number, max: number, domain: TimeDomain) {
  if (!rows.length || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return "";
  return rows.map((row, index) => `${index === 0 ? "M" : "L"}${xForDate(row.Date, plot, domain).toFixed(1)},${yFor(Number(row.Close), plot, min, max).toFixed(1)}`).join(" ");
}
function areaPathFor(rows: Record<string, unknown>[], plot: PlotArea, min: number, max: number, domain: TimeDomain) {
  const line = pathFor(rows, plot, min, max, domain); if (!line) return "";
  const firstX = xForDate(rows[0].Date, plot, domain); const lastX = xForDate(rows[rows.length - 1].Date, plot, domain); const baseY = plot.bottom;
  return `${line} L${lastX.toFixed(1)},${baseY} L${firstX.toFixed(1)},${baseY} Z`;
}
function renderBars(rows: Record<string, unknown>[], plot: PlotArea, min: number, max: number, domain: TimeDomain) {
  if (!rows.length || min === max) return null;
  const barWidth = Math.max(2, Math.min(10, (plot.right - plot.left) / Math.max(rows.length, 1) * 0.55)); const baseY = yFor(min, plot, min, max);
  return rows.map((row, index) => { const close = Number(row.Close); if (!Number.isFinite(close)) return null; const x = xForDate(row.Date, plot, domain) - barWidth / 2; const y = yFor(close, plot, min, max); return <rect className="bar-primary" key={index} x={x} y={Math.min(y, baseY)} width={barWidth} height={Math.max(1, Math.abs(baseY - y))} rx="1" />; });
}
function renderCandles(rows: Record<string, unknown>[], plot: PlotArea, min: number, max: number, domain: TimeDomain) {
  if (!rows.length || min === max) return null;
  const candleWidth = Math.max(4, Math.min(18, (plot.right - plot.left) / Math.max(rows.length, 1) * 0.72));
  return rows.map((row, index) => { const open = Number(row.Open), high = Number(row.High), low = Number(row.Low), close = Number(row.Close); if (![open, high, low, close].every(Number.isFinite)) return null; const x = xForDate(row.Date, plot, domain); const openY = yFor(open, plot, min, max), closeY = yFor(close, plot, min, max), highY = yFor(high, plot, min, max), lowY = yFor(low, plot, min, max); return <g key={index} className={close >= open ? "candle-up" : "candle-down"}><line x1={x} x2={x} y1={highY} y2={lowY} /><rect x={x - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(2, Math.abs(openY - closeY))} rx="1" /></g>; });
}
function renderVolume(rows: Record<string, unknown>[], plot: PlotArea, domain: TimeDomain) {
  const volumes = rows.map((row) => Number(row.Volume)).filter((value) => Number.isFinite(value) && value > 0);
  if (!volumes.length) return null;
  const maxVolume = Math.max(...volumes);
  const volumeTop = plot.bottom - Math.max(42, (plot.bottom - plot.top) * 0.24);
  const barWidth = Math.max(1.5, Math.min(7, (plot.right - plot.left) / Math.max(rows.length, 1) * 0.45));
  return <g className="volume-underlay">{rows.map((row, index) => {
    const volume = Number(row.Volume);
    if (!Number.isFinite(volume) || volume <= 0) return null;
    const open = Number(row.Open);
    const close = Number(row.Close);
    const x = xForDate(row.Date, plot, domain) - barWidth / 2;
    const height = Math.max(1, (volume / maxVolume) * (plot.bottom - volumeTop));
    return <rect key={`v-${index}`} className={Number.isFinite(open) && Number.isFinite(close) && close < open ? "volume-down" : "volume-up"} x={x} y={plot.bottom - height} width={barWidth} height={height} />;
  })}</g>;
}
function xForDate(value: unknown, plot: PlotArea, domain: TimeDomain) {
  const date = new Date(String(value));
  const time = Number.isFinite(date.getTime()) ? date.getTime() : domain.start;
  const ratio = domain.end === domain.start ? 0 : (time - domain.start) / (domain.end - domain.start);
  return plot.left + Math.max(0, Math.min(1, ratio)) * (plot.right - plot.left);
}
function yFor(value: number, plot: PlotArea, min: number, max: number) { return min === max ? (plot.top + plot.bottom) / 2 : plot.bottom - ((value - min) / (max - min)) * (plot.bottom - plot.top); }
function xAxisLabels(range: string, domain: TimeDomain, plot: PlotArea) {
  const formatter = range === "1D"
    ? (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : (date: Date) => date.toLocaleDateString([], { month: "short", day: "numeric" });
  const count = range === "1D" ? 7 : range === "5D" || range === "1W" ? 6 : 5;
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / Math.max(count - 1, 1);
    const date = new Date(domain.start + ratio * (domain.end - domain.start));
    const anchor: TextAnchor = index === 0 ? "start" : index === count - 1 ? "end" : "middle";
    return {
      x: plot.left + ratio * (plot.right - plot.left),
      text: formatter(date),
      anchor,
    };
  });
}
function rowsInDomain(rows: Record<string, unknown>[], domain: TimeDomain) {
  const span = Math.max(1, domain.end - domain.start);
  const buffer = Math.max(60_000, span * 0.01);
  return rows.filter((row) => {
    const time = new Date(String(row.Date)).getTime();
    return Number.isFinite(time) && time >= domain.start - buffer && time <= domain.end + buffer;
  });
}
function constrainDomain(domain: TimeDomain, base: TimeDomain, minFraction = 0.06): TimeDomain {
  const baseSpan = Math.max(1, base.end - base.start);
  const minSpan = baseSpan * minFraction;
  let start = Math.max(base.start, domain.start);
  let end = Math.min(base.end, domain.end);
  if (end - start < minSpan) {
    const center = (start + end) / 2;
    start = center - minSpan / 2;
    end = center + minSpan / 2;
  }
  if (start < base.start) {
    end += base.start - start;
    start = base.start;
  }
  if (end > base.end) {
    start -= end - base.end;
    end = base.end;
  }
  return {
    start: Math.max(base.start, start),
    end: Math.min(base.end, end),
  };
}
function pointerRatioForEvent(event: MouseEvent<SVGRectElement> | WheelEvent<SVGRectElement>, target: SVGRectElement) {
  const box = target.getBoundingClientRect();
  const ratio = (event.clientX - box.left) / Math.max(1, box.width);
  return Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0.5));
}
function zoomDomainForWheel(domain: TimeDomain, base: TimeDomain, pointerRatio: number, deltaY: number) {
  const span = Math.max(1, domain.end - domain.start);
  const factor = deltaY > 0 ? 1.22 : 0.78;
  const nextSpan = span * factor;
  const anchor = domain.start + span * pointerRatio;
  return constrainDomain({
    start: anchor - nextSpan * pointerRatio,
    end: anchor + nextSpan * (1 - pointerRatio),
  }, base, 0.08);
}
function zoomByButton(domain: TimeDomain, base: TimeDomain, factor: number) {
  const center = (domain.start + domain.end) / 2;
  const span = Math.max(1, domain.end - domain.start) * factor;
  return constrainDomain({ start: center - span / 2, end: center + span / 2 }, base, 0.08);
}
function nearestRowForX(rows: Record<string, unknown>[], x: number, plot: PlotArea, domain: TimeDomain) {
  let best: Record<string, unknown> | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    const rowX = xForDate(row.Date, plot, domain);
    const distance = Math.abs(rowX - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = row;
    }
  }
  return best;
}
function rangeDescription(range: string, domain: TimeDomain) {
  const start = new Date(domain.start);
  const end = new Date(domain.end);
  const formatter = range === "1D"
    ? (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : (date: Date) => date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${formatter(start)} - ${formatter(end)}`;
}
function xGridLines(range: string, domain: TimeDomain, plot: PlotArea) {
  const count = range === "1D" ? 14 : 9;
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / Math.max(count - 1, 1);
    return plot.left + ratio * (plot.right - plot.left);
  });
}
function valueDomain(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) {
    const padding = Math.max(1, Math.abs(min) * 0.02);
    return { min: min - padding, max: max + padding };
  }
  const padding = (max - min) * 0.08;
  return { min: min - padding, max: max + padding };
}
function yAxisTicks(min: number, max: number, count: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  return Array.from({ length: count }, (_, index) => max - (index / Math.max(count - 1, 1)) * (max - min));
}
function formatAxisPrice(value: number) {
  if (Math.abs(value) >= 1000) return value.toLocaleString([], { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 100) return value.toFixed(2);
  return value.toFixed(2);
}
function latestFiniteRow(rows: Record<string, unknown>[]) {
  return [...rows].reverse().find((row) => Number.isFinite(Number(row.Close))) || null;
}
function ohlcStrip(row: Record<string, unknown>) {
  const open = formatAxisPrice(Number(row.Open));
  const high = formatAxisPrice(Number(row.High));
  const low = formatAxisPrice(Number(row.Low));
  const close = formatAxisPrice(Number(row.Close));
  const volume = Number(row.Volume);
  const formattedVolume = Number.isFinite(volume) ? volume.toLocaleString([], { maximumFractionDigits: 0 }) : "n/a";
  return `O:${open}  H:${high}  L:${low}  C:${close}  V:${formattedVolume}`;
}
function timeDomain(primary: Record<string, unknown>[], comparison: Record<string, unknown>[], range: string): TimeDomain {
  const now = new Date();
  const end = now.getTime();
  if (range === "YTD") return { start: new Date(now.getFullYear(), 0, 1).getTime(), end };
  const days: Record<string, number> = { "1D": 1, "5D": 5, "1W": 7, "1M": 31, "3M": 93, "6M": 186, "1Y": 366, "10Y": 3652 };
  const fallbackStart = end - (days[range] || 366) * 24 * 60 * 60 * 1000;
  if (range === "10Y") {
    const dates = [...primary, ...comparison].map((row) => new Date(String(row.Date)).getTime()).filter(Number.isFinite);
    return { start: dates.length ? Math.min(...dates) : fallbackStart, end };
  }
  return { start: fallbackStart, end };
}
