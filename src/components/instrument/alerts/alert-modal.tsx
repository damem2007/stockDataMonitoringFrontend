"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AlertRule } from "@/lib/types";

export function AlertModal({ alert, setAlert, onSubmit, onClose, symbol }: {
  alert: AlertRule;
  setAlert: (value: AlertRule) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  symbol: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch (error) {
      console.error("Error creating alert:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="alert-modal ss-instrument-panel">
        <div className="ss-section-heading">
          <div><p className="ss-eyebrow">Create alert</p><h2>{alert.symbol || symbol}</h2></div>
          <button className="ss-btn" disabled={isSubmitting} onClick={onClose}>Close</button>
        </div>
        <div className="form-grid">
          <input disabled={isSubmitting} value={alert.symbol || symbol} onChange={(event) => setAlert({ ...alert, symbol: event.target.value.toUpperCase() })} placeholder="Symbol or __PORTFOLIO__" />
          <select disabled={isSubmitting} value={alert.metric} onChange={(event) => setAlert({ ...alert, metric: event.target.value })}>{["Price", "Volume", "SMA 200", "RSI 14", "Portfolio Value", "Portfolio Today P/L", "Portfolio Since Purchase P/L"].map((item) => <option key={item}>{item}</option>)}</select>
          <select disabled={isSubmitting} value={alert.operator} onChange={(event) => setAlert({ ...alert, operator: event.target.value })}>{["Crossing", "Crossing Up", "Crossing Down", "Above", "Below"].map((item) => <option key={item}>{item}</option>)}</select>
          <input disabled={isSubmitting} type="number" value={alert.threshold} onChange={(event) => setAlert({ ...alert, threshold: Number(event.target.value) })} />
        </div>
        <div className="inline-actions"><button className="ss-btn ss-btn-primary" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? <Loader2 size={16} className="ss-spin" /> : "Create alert"}</button><button className="ss-btn" onClick={onClose} disabled={isSubmitting}>Cancel</button></div>
      </section>
    </div>
  );
}
