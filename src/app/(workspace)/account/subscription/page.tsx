"use client";

import { useEffect, useState } from "react";
import { getInvoices, getSubscription } from "@/lib/api";
import { formatCell } from "@/lib/workspace-utils";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/providers/toast-provider";

export default function Page() {
  const session = useSession();
  const { reportError } = useToast();
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!session.token) return;
    getSubscription(session.token).then((payload) => setSubscription(payload.subscription)).catch((error) => reportError(error, "Could not load subscription."));
    getInvoices(session.token).then((payload) => setInvoices(payload.invoices)).catch((error) => reportError(error, "Could not load invoices."));
  }, [reportError, session.token]);

  return (
    <main className="dashboard-shell"><div className="dashboard-content"><section className="dashboard-main">
      <section className="surface-section account-panel"><p className="eyebrow">Account</p><h1>Subscription</h1><p className="muted">Subscription access controls premium portfolio dashboards, real-time analysis, and buy/sell chart indicators.</p>
        <div className="account-summary-grid">
          <div><span>Plan</span><strong>{formatCell(subscription?.plan || "premium")}</strong></div>
          <div><span>Status</span><strong>{formatCell(subscription?.status || "active")}</strong></div>
        </div>
        <h2>Features</h2>
        <ul>{Array.isArray(subscription?.features) ? subscription.features.map((item) => <li key={String(item)}>{String(item).replaceAll("_", " ")}</li>) : null}</ul>
        <h2>Invoices</h2>
        {invoices.length ? <div className="data-table"><table><tbody>{invoices.map((invoice, index) => <tr key={index}>{Object.entries(invoice).map(([key, value]) => <td key={key}>{formatCell(value)}</td>)}</tr>)}</tbody></table></div> : <p className="muted">No invoices are available yet.</p>}
      </section>
    </section></div></main>
  );
}
