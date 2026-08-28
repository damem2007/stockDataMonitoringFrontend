"use client";

import type { AlertRule } from "@/lib/types";

export function AlertModal({ alert, setAlert, onSubmit, onClose, symbol }: {
  alert: AlertRule;
  setAlert: (value: AlertRule) => void;
  onSubmit: () => void;
  onClose: () => void;
  symbol: string;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="alert-modal">
        <div className="section-heading">
          <div><p className="eyebrow">Create alert</p><h2>{alert.symbol || symbol}</h2></div>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <input value={alert.symbol || symbol} onChange={(event) => setAlert({ ...alert, symbol: event.target.value.toUpperCase() })} placeholder="Symbol or __PORTFOLIO__" />
          <select value={alert.metric} onChange={(event) => setAlert({ ...alert, metric: event.target.value })}>{["Price", "Volume", "SMA 200", "RSI 14", "Portfolio Value", "Portfolio Today P/L", "Portfolio Since Purchase P/L"].map((item) => <option key={item}>{item}</option>)}</select>
          <select value={alert.operator} onChange={(event) => setAlert({ ...alert, operator: event.target.value })}>{["Crossing", "Crossing Up", "Crossing Down", "Above", "Below"].map((item) => <option key={item}>{item}</option>)}</select>
          <input type="number" value={alert.threshold} onChange={(event) => setAlert({ ...alert, threshold: Number(event.target.value) })} />
        </div>
        <div className="inline-actions"><button className="primary" onClick={onSubmit}>Create alert</button><button onClick={onClose}>Cancel</button></div>
      </section>
    </div>
  );
}
