"use client";

import { cleanSymbol, formatCell } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { AlertModal } from "./alert-modal";

export function AlertsView() {
  const instrument = useInstrument();
  const workspace = useWorkspace();
  const alerts = workspace.alerts.filter((alert) => cleanSymbol(alert.symbol) === instrument.symbol);
  return (
    <section className="ss-instrument-panel ss-alerts-board">
      <div className="ss-section-heading">
        <div><p className="ss-eyebrow">Alerts</p><h2>{instrument.symbol} alerts</h2></div>
        <button className="ss-btn ss-btn-primary" onClick={() => { instrument.setNewAlert({ ...instrument.newAlert, symbol: instrument.symbol }); instrument.setAlertModalOpen(true); }}>+ Add alert</button>
      </div>
      {!alerts.length && <p className="ss-muted">No alerts configured for this instrument yet.</p>}
      <div className="ss-alert-list">
        {alerts.map((alert) => (
          <article className="ss-alert-card" key={alert.id || `${alert.symbol}-${alert.metric}-${alert.threshold}`}>
            <button className="ss-alert-main" onClick={() => { instrument.setNewAlert(alert); instrument.setAlertModalOpen(true); }}>
              <strong>{alert.symbol} · {alert.metric}</strong><span>{alert.operator} {formatCell(alert.threshold)}</span><small>{alert.message || "No custom message"}</small>
            </button>
            <button className="ss-btn" onClick={() => workspace.removeAlert(alert.id)}>Delete</button>
          </article>
        ))}
      </div>
      {instrument.alertModalOpen && <AlertModal alert={instrument.newAlert} setAlert={instrument.setNewAlert} onSubmit={() => void instrument.submitAlert()} onClose={() => instrument.setAlertModalOpen(false)} symbol={instrument.symbol} />}
    </section>
  );
}
