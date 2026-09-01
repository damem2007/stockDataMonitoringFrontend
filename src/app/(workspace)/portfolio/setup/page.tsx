"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { InstrumentEditor } from "@/components/onboarding/instrument-editor";
import { SUPPORTED_MARKETS } from "@/lib/config";
import type { Exchange, Instrument } from "@/lib/types";
import { cleanSymbol, emptyInstrument } from "@/lib/workspace-utils";
import { useWorkspace } from "@/providers/workspace-provider";
import { useToast } from "@/providers/toast-provider";

export default function Page() {
  const workspace = useWorkspace();
  const { reportError, showToast } = useToast();
  const router = useRouter();
  const search = useSearchParams();
  const initial = search.get("symbol") || "";
  const [rows, setRows] = useState<Instrument[]>([{ ...emptyInstrument("Trading"), symbol: initial }]);
  const [portfolioName, setPortfolioName] = useState(workspace.portfolio?.account?.name || "");
  const [submitting, setSubmitting] = useState(false);

  async function saveHolding() {
    if (submitting || workspace.appLoading) return;
    setSubmitting(true);
    try {
      const savedPortfolio = await workspace.savePortfolioRows(rows);
      const finalName = portfolioName.trim();
      if (finalName) await workspace.renamePortfolioAccount(finalName, { silent: true });
      const accountName = finalName || savedPortfolio.account?.name || workspace.portfolio?.account?.name || "your portfolio";
      const symbols = rows.map((row) => cleanSymbol(row.symbol)).filter(Boolean);
      const subject = symbols.length === 1 ? `Instrument ${symbols[0]}` : `Instruments ${symbols.join(", ")}`;
      showToast(`${subject} ${symbols.length === 1 ? "has" : "have"} been added to ${accountName}.`, "success");
      router.push("/portfolio");
    } catch (error) {
      reportError(error, "Could not save holding.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || workspace.appLoading;

  return (
    <main className="workspace-shell">
      <section className="onboarding-panel">
        <header className="workflow-header">
          <div>
            <h1>Add holding</h1>
            <p className="muted">
              Add purchase lots to your portfolio. Book cost is computed from average price x shares, and later purchases are kept in activity history.
            </p>
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

        <label className="portfolio-name-field">
          Portfolio name
          <input
            disabled={busy}
            value={portfolioName}
            placeholder="e.g. Dami's portfolio"
            onChange={(event) => setPortfolioName(event.target.value)}
          />
        </label>

        <InstrumentEditor rows={rows} setRows={setRows} trading markets={workspace.selectedMarkets} disabled={busy} />

        <div className="inline-actions">
          <button disabled={busy} onClick={() => setRows((current) => [...current, emptyInstrument("Trading")])} type="button">
            Add another stock
          </button>
          <button className="primary" disabled={busy} onClick={saveHolding} type="button">
            {busy ? <LoaderCircle className="button-spinner" size={16} /> : null}
            {busy ? "Saving holding" : "Save holding"}
          </button>
          <button disabled={busy} onClick={() => router.back()} type="button">
            Cancel
          </button>
        </div>
      </section>
    </main>
  );
}
