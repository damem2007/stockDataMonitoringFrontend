"use client";

import { formatCell } from "@/lib/workspace-utils";

export type ChartHoverPoint = { x: number; y: number; row: Record<string, unknown> };

export function ChartTooltip({ point, width, height, dateRange }: { point: ChartHoverPoint; width: number; height: number; dateRange: string }) {
  return <>
    <div className={`chart-tooltip ${point.x > width * 0.66 ? "shift-left" : ""}`} style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}>
      <dl>{tooltipRows(point.row, dateRange).map((item) => <div key={item.label}><dt>{item.label}:</dt><dd>{item.value}</dd></div>)}</dl>
    </div>
    <div className="chart-time-pill" style={{ left: `${(point.x / width) * 100}%` }}>{chartTimePill(point.row, dateRange)}</div>
  </>;
}

export function tooltipText(row: Record<string, unknown>, range: string) {
  return tooltipRows(row, range).map((item) => `${item.label}: ${item.value}`).join("\n");
}

function tooltipRows(row: Record<string, unknown>, range: string) {
  return [
    { label: "Date", value: chartTimePill(row, range) },
    { label: "Close", value: formatPrice(row.Close) },
    { label: "Open", value: formatPrice(row.Open) },
    { label: "High", value: formatPrice(row.High) },
    { label: "Low", value: formatPrice(row.Low) },
    { label: "Volume", value: formatCell(row.Volume) },
  ];
}

function chartTimePill(row: Record<string, unknown>, range: string) {
  const date = new Date(String(row.Date));
  if (!Number.isFinite(date.getTime())) return "n/a";
  if (range === "1D") return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }).replace(",", "");
  return date.toLocaleDateString([], { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatPrice(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "n/a";
}
