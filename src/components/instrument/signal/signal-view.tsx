"use client";

import { TablePanel } from "@/components/ui/data";
import { useInstrument } from "@/providers/instrument-provider";

export function SignalView() {
  const { analysis } = useInstrument();
  const signal = analysis?.signal || {};
  const rows = analysis?.strategyRows || [];
  return (
    <div className="split-grid">
      <section className="execution-card">
        <p className="eyebrow">Execution Plan</p>
        <h2>{String(signal.action || "No signal")}</h2>
        <dl>
          <div><dt>Setup</dt><dd>{String(signal.setup || "n/a")}</dd></div>
          <div><dt>Entry zone</dt><dd>{String(signal.entry_zone || "n/a")}</dd></div>
          <div><dt>Exit zone</dt><dd>{String(signal.exit_zone || "n/a")}</dd></div>
          <div><dt>Risk</dt><dd>{String(signal.risk_note || "n/a")}</dd></div>
        </dl>
      </section>
      <section><TablePanel rows={rows} /></section>
    </div>
  );
}
