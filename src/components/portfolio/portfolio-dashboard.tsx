"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Archive, Edit3, Plus, RefreshCw, Pencil, ArrowUpRight, ArrowDownRight, ChevronDown,
  ChevronRight, Eye, ArrowLeftRight, Trash2, AlertTriangle, TrendingUp,
  AlertCircle, ArrowUpDown, Info, Wallet } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Instrument, PortfolioActivity } from "@/lib/types";
import { currencyForSymbol, emptyInstrument, formatCell, money, percent, today } from "@/lib/workspace-utils";
import { Metric, TablePanel } from "@/components/ui/data";

export type HoldingAction = "add" | "transfer" | "liquidate" | null;

function PortfolioMetrics() {
  const { portfolio } = useWorkspace();
  if (!portfolio) return null;
  const m = portfolio.metrics;
  const currency = m.currency === "MIXED" ? "USD" : m.currency || "USD";
  return (
    <div className="metric-grid">
      <Metric label="Total invested" value={money(m.totalInvested, currency)} />
      <Metric label="Market value" value={money(m.marketValue, currency)} />
      <Metric label="Total return" value={money(m.sincePurchase, currency)} detail={percent(m.sincePurchasePct)} />
      <Metric label="Today P/L" value={money(m.todayPl, currency)} />
      <Metric label="Week P/L" value={money(m.weekPl, currency)} />
    </div>
  );
}

function AllocationChart({ rows }: { rows: Record<string, unknown>[] }) {
  const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row["Portfolio %"]) || 0), 0) || 1;
  let cursor = 0;
  const colors = ["#2f7ed8", "#ef6c35", "#22b686", "#f2ac00", "#8b5cf6", "#0f5f7a"];
  const parts = rows.map((row, index) => {
    const value = (Math.max(0, Number(row["Portfolio %"]) || 0) / total) * 100;
    const start = cursor;
    cursor += value;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });
  return (
    <section className="surface-section">
      <h2>Allocation by instrument</h2>
      <div className="allocation-layout">
        <div className="allocation-donut" style={{ background: `conic-gradient(${parts.join(",")})` }} />
        <div className="allocation-legend">
          {rows.map((row) => <div key={String(row.Symbol)}><strong>{String(row.Symbol)}</strong><span>{percent(Number(row["Portfolio %"]))}</span></div>)}
        </div>
      </div>
    </section>
  );
}

function ReturnChart({ rows }: { rows: Record<string, unknown>[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(Number(row["Since Purchase $"]) || 0)));
  return (
    <section className="surface-section">
      <h2>Returns since purchase</h2>
      <div className="return-bars">
        {rows.map((row) => {
          const symbol = String(row.Symbol || "");
          const value = Number(row["Since Purchase $"]) || 0;
          return (
            <div className="return-row" key={symbol}>
              <span>{symbol}</span>
              <div className="return-track"><i className={value >= 0 ? "gain" : "loss"} style={{ width: `${Math.max(4, Math.abs(value) / max * 100)}%` }} /></div>
              <strong className={value >= 0 ? "gain-text" : "loss-text"}>{money(value, currencyForSymbol(symbol))}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PortfolioSparkline({ values, tone }: { values: unknown; tone: "gain" | "loss" }) {
  const parsed = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (parsed.length < 2) return <span className="muted">Sync pending</span>;
  const min = Math.min(...parsed);
  const max = Math.max(...parsed);
  const span = max - min || 1;
  const points = parsed.map((value, index) => {
    const x = (index / (parsed.length - 1)) * 128;
    const y = 36 - ((value - min) / span) * 30;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <svg className={`portfolio-sparkline ${tone}`} viewBox="0 0 128 40" aria-hidden="true"><polyline points={points} /></svg>;
}

export function HoldingActionModal({ action, row, onClose }: { action: HoldingAction; row: Record<string, unknown> | null; onClose: () => void }) {
  const workspace = useWorkspace();
  const [date, setDate] = useState(today());
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  if (!action || !row) return null;
  const symbol = String(row.Symbol || "");
  const currentShares = Number(row.Shares) || 0;
  const currency = currencyForSymbol(symbol);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action === "add") {
      const lot: Instrument = {
        ...emptyInstrument("Trading"),
        symbol,
        purchase_date: date,
        shares: Number(shares),
        average_cost: Number(price),
        notes: note,
      };
      await workspace.addPortfolioLot(lot);
    } else {
      await workspace.closePortfolioHolding(symbol, {
        action: action === "transfer" ? "TRANSFER" : "LIQUIDATE",
        trade_date: date,
        shares: shares ? Number(shares) : currentShares,
        selling_price: action === "liquidate" ? Number(price) : undefined,
        note,
      });
    }
    onClose();
  }

  const title = action === "add" ? `Add more ${symbol}` : action === "transfer" ? `Transfer ${symbol}` : `Liquidate ${symbol}`;
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card holding-action-modal" onSubmit={submit}>
        <header><h2>{title}</h2><button type="button" onClick={onClose}>x</button></header>
        <p className="muted">Current position: {formatCell(currentShares)} shares, average cost {money(Number(row["Avg Cost"]), currency)}.</p>
        <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        <label>Shares<input type="number" min="0" step="0.0001" value={shares} placeholder={action === "add" ? "Shares bought" : `${currentShares}`} onChange={(event) => setShares(event.target.value)} /></label>
        {action !== "transfer" ? <label>{action === "add" ? "Purchase price" : "Selling price"}<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label> : null}
        <label>Note<textarea value={note} onChange={(event) => setNote(event.target.value)} required={action === "transfer"} placeholder={action === "transfer" ? "Transfer destination or reason" : "Optional note"} /></label>
        <div className="inline-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit">{action === "add" ? "Save purchase" : "Save activity"}</button>
        </div>
      </form>
    </div>
  );
}

function ActivityList({ activities }: { activities: PortfolioActivity[] }) {
  const rows = activities.slice(0, 12);
  return (
    <section className="surface-section">
      <div className="section-heading"><div><p className="eyebrow">Activity</p><h2>Purchase and portfolio history</h2></div></div>
      {!rows.length ? <p className="muted">No activity has been recorded yet.</p> : (
        <div className="activity-list">
          {rows.map((item) => (
            <article key={item.id}>
              <div><strong>{item.activityType.replace("_", " ")}</strong><span>{item.symbol} · {item.tradeDate}</span></div>
              <div><strong>{money(item.amount, currencyForSymbol(item.symbol))}</strong><span>{formatCell(item.shares)} shares at {money(item.price, currencyForSymbol(item.symbol))}</span></div>
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function PortfolioDashboard() {
  const workspace = useWorkspace();
  const session = useSession();
  const rows = workspace.portfolio?.portfolio || [];
  const activities = workspace.portfolio?.activities || [];
  const account = workspace.portfolio?.account;
  const [editingName, setEditingName] = useState(false);
  const [portfolioName, setPortfolioName] = useState(account?.name || "My portfolio");
  const [action, setAction] = useState<HoldingAction>(null);
  const [activeRow, setActiveRow] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (account?.name) setPortfolioName(account.name);
  }, [account?.name]);

  if (!session.user) {
    return (
      <main className="dashboard-shell">
        <div className="dashboard-content"><section className="dashboard-main"><section className="dashboard-header hero-panel"><div><p className="eyebrow">Portfolio</p><h1>Sign in to monitor trading holdings.</h1><p className="muted">Guest mode is limited to browser-local watchlists and instrument analysis.</p></div></section></section></div>
      </main>
    );
  }

  function openAction(nextAction: HoldingAction, row: Record<string, unknown>) {
    setActiveRow(row);
    setAction(nextAction);
  }

  return (
    <main className="dashboard-shell">
      <div className="dashboard-content"><section className="dashboard-main"><div className="workspace-dashboard">
        <section className="portfolio-hero">
          <div>
            <p className="eyebrow">Portfolio dashboard</p>
            {editingName ? (
              <form className="portfolio-name-form" onSubmit={async (event) => { event.preventDefault(); await workspace.renamePortfolioAccount(portfolioName); setEditingName(false); }}>
                <input value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} />
                <button className="primary" type="submit">Save</button>
                <button type="button" onClick={() => setEditingName(false)}>Cancel</button>
              </form>
            ) : (
              <h1>{account?.name || "My portfolio"} <button className="icon-inline" type="button" onClick={() => setEditingName(true)} aria-label="Rename portfolio"><Edit3 size={18} /></button></h1>
            )}
            <p className="muted">Synced {workspace.lastSyncedAt ? new Date(workspace.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "pending"} · {rows.length} {rows.length === 1 ? "holding" : "holdings"}</p>
          </div>
          <div className="header-actions"><button onClick={() => void workspace.refreshWorkspace()}>Sync Workspace</button><Link className="button-link primary" href="/portfolio/setup"><Plus size={18} /> Add holding</Link></div>
        </section>
        <PortfolioMetrics />
        {!rows.length ? <section className="empty-state"><h2>No holdings yet</h2><p className="muted">Create a named portfolio and add the first purchase lot to see cost basis, market value, allocation, P/L, sector exposure, and execution plans.</p><Link className="button-link primary" href="/portfolio/setup">Create first holding</Link></section> : (
          <>
            <section className="portfolio-visual-grid"><AllocationChart rows={rows} /><ReturnChart rows={rows} /></section>
            <section className="surface-section">
              <div className="section-heading"><div><p className="eyebrow">Holdings</p><h2>Open positions</h2></div></div>
              <div className="portfolio-holding-list">
                {rows.map((row) => {
                  const symbol = String(row.Symbol || "");
                  const currency = currencyForSymbol(symbol);
                  const since = Number(row["Since Purchase $"]);
                  return (
                    <article key={symbol} className="portfolio-holding-row">
                      <Link href={`/portfolio/${encodeURIComponent(symbol)}/summary`}><strong>{symbol}</strong><span>{String(row.Category || "Unassigned")}</span></Link>
                      <div><span>Shares</span><strong>{formatCell(row.Shares)}</strong></div>
                      <div><span>Book cost</span><strong>{money(Number(row["Book Cost"]), currency)}</strong></div>
                      <div><span>Avg price</span><strong>{money(Number(row["Avg Cost"]), currency)}</strong></div>
                      <div><span>Market value</span><strong>{money(Number(row["Market Value"]), currency)}</strong></div>
                      <div><span>Total return</span><strong className={since >= 0 ? "gain-text" : "loss-text"}>{money(since, currency)} {percent(Number(row["Since Purchase %"]))}</strong></div>
                      <div><span>Position trend</span><PortfolioSparkline values={row.Trend} tone={since >= 0 ? "gain" : "loss"} /></div>
                      <div className="holding-row-actions">
                        <button type="button" onClick={() => openAction("add", row)}><Plus size={16} /> Add more</button>
                        <button type="button" onClick={() => openAction("transfer", row)}><Archive size={16} /> Transfer</button>
                        <button type="button" onClick={() => openAction("liquidate", row)}><Trash2 size={16} /> Liquidate</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            <section className="portfolio-visual-grid"><div className="surface-section"><h2>Category / sector exposure</h2><TablePanel rows={workspace.portfolio?.categoryExposure || []} /></div><div className="inference-card"><h2>Portfolio inference notes</h2><ul>{(workspace.portfolio?.notes || []).map((note) => <li key={note}>{note}</li>)}</ul></div></section>
            <section className="surface-section"><div className="section-heading"><div><p className="eyebrow">Execution</p><h2>Plans across holdings</h2></div></div><div className="execution-plan-list">{(workspace.portfolio?.executionPlans || []).map((plan, index) => { const symbol = String(plan.Symbol || plan.symbol || ""); return <article key={`${symbol}-${index}`}><strong>{symbol}</strong><span>{formatCell(plan.Action || plan.action)}</span><span>{formatCell(plan.Confidence || plan.score)}</span>{symbol && <Link href={`/portfolio/${encodeURIComponent(symbol)}/signal`}>View</Link>}</article>; })}</div></section>
            <ActivityList activities={activities} />
          </>
        )}
      </div></section></div>
      <HoldingActionModal action={action} row={activeRow} onClose={() => { setAction(null); setActiveRow(null); }} />
    </main>
  );
}
