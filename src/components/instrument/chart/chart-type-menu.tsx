"use client";

import { useState } from "react";

const OPTIONS = [
  { label: "Line", value: "Line", icon: "⌁" },
  { label: "Candle", value: "Candlestick", icon: "▥" },
  { label: "Baseline", value: "Baseline", icon: "↕" },
  { label: "Mountain", value: "Mountain", icon: "▰" },
  { label: "Bar", value: "Bar", icon: "▮" },
];

export function ChartTypeMenu({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = OPTIONS.find((item) => item.value === value) || OPTIONS[0];
  return (
    <div className="chart-type-menu">
      <button className="chart-type-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{selected.icon}</span><span>{selected.label}</span><span aria-hidden="true">⌃</span>
      </button>
      {open && <div className="chart-type-options" role="menu">{OPTIONS.map((item) => (
        <button className={item.value === value ? "active" : ""} key={item.value} role="menuitem" onClick={() => { onChange(item.value); setOpen(false); }}>
          <span>{item.icon}</span><span>{item.label}</span>{item.value === value && <strong>✓</strong>}
        </button>
      ))}</div>}
    </div>
  );
}
