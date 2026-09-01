"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { InstrumentEditor } from "@/components/onboarding/instrument-editor";
import { SUPPORTED_MARKETS } from "@/lib/config";
import type { Exchange, Instrument } from "@/lib/types";
import { emptyInstrument } from "@/lib/workspace-utils";
import { useWorkspace } from "@/providers/workspace-provider";
import { useToast } from "@/providers/toast-provider";

export default function Page() {
  const workspace = useWorkspace();
  const { reportError } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<Instrument[]>([emptyInstrument("Watching")]);
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || workspace.appLoading;

  async function saveWatchlist() {
    if (busy) return;
    setSubmitting(true);
    try {
      await workspace.saveWatchlistRows(rows);
      router.push("/watchlist");
    } catch (error) {
      reportError(error, "Could not create watchlist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="workspace-shell">
      <section className="onboarding-panel">
        <header className="workflow-header">
          <div>
            <h1>Watchlist Onboarding</h1>
            <p className="muted">Add the instruments you want to research or monitor.</p>
          </div>
          <div className="segmented">
            {SUPPORTED_MARKETS.map((market: Exchange) => (
              <button
                className={workspace.selectedMarkets.includes(market) ? "active" : ""}
                disabled={busy}
                key={market}
                onClick={() => workspace.toggleMarket(market)}
                type="button"
              >
                {market}
              </button>
            ))}
          </div>
        </header>

        <InstrumentEditor rows={rows} setRows={setRows} trading={false} markets={workspace.selectedMarkets} disabled={busy} />

        <div className="inline-actions">
          <button disabled={busy} onClick={() => setRows((current) => [...current, emptyInstrument("Watching")])} type="button">
            Add another stock
          </button>
          <button className="primary" disabled={busy} onClick={saveWatchlist} type="button">
            {busy ? <LoaderCircle className="button-spinner" size={16} /> : null}
            {busy ? "Creating watchlist" : "Create watchlist dashboard"}
          </button>
          <button disabled={busy} onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </main>
  );
}
