"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, Plus, RefreshCw } from "lucide-react";
import { SUPPORTED_MARKETS } from "@/lib/config";
import type { Exchange } from "@/lib/types";
import { cleanSymbol, currencyForSymbol, money, percent } from "@/lib/workspace-utils";
import { generateAvatarColor } from "@/components/navigation/top-nav";
import { useSession } from "@/providers/session-provider";
import { useWorkspace } from "@/providers/workspace-provider";

function signalLabelFromMove(value: number) {
  if (!Number.isFinite(value)) return "Neutral";
  if (value > 0.004) return "Bullish";
  if (value < -0.004) return "Bearish";
  return "Neutral";
}

function MiniSparkline({ values, tone }: { values: unknown; tone: "gain" | "loss" }) {
  const parsed = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  const min = Math.min(...parsed);
  const max = Math.max(...parsed);
  const points = parsed.length > 1 && Number.isFinite(min) && Number.isFinite(max) && min !== max
    ? parsed.map((value, index) => `${(index / (parsed.length - 1)) * 108},${30 - ((value - min) / (max - min)) * 26}`).join(" ")
    : "0,18 36,18 72,18 108,18";
  return (
    <svg className={`ss-sparkline ss-watchlist-sparkline ${tone}`} viewBox="0 0 108 32" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

export function WatchlistDashboard() {
  const router = useRouter();
  const w = useWorkspace();
  const session = useSession();
  const isGuest = !session.user || session.user.isGuest;
  const rows = w.instruments.filter(
    (item) => item.role !== "Trading" && item.active !== false && w.visibleSymbols.includes(cleanSymbol(item.symbol)),
  );
  const details = (w.portfolio?.watchlist || []) as Record<string, unknown>[];
  const detailBySymbol = new Map(details.map((item) => [cleanSymbol(item.Symbol), item]));

  return (
    <main className="dashboard-shell">
      <div className="dashboard-content with-sidebar">
        <aside className="filter-sidebar">
          <div className="sidebar-group">
            <span>Exchange</span>
            <div className="market-toggle-row">
              {SUPPORTED_MARKETS.map((market: Exchange) => (
                <button className={w.selectedMarkets.includes(market) ? "active" : ""} key={market} onClick={() => w.toggleMarket(market)}>
                  {market}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-group">
            <span>Add ticker or company</span>
            <div className="sidebar-add">
              <div className="ticker-input-wrap">
                <input
                  autoComplete="off"
                  value={w.newTicker}
                  placeholder="e.g. RY.TO or Royal Bank"
                  onChange={(event) => w.setNewTicker(event.target.value)}
                />
                {w.newTicker.trim() && w.tickerSearchResults.length > 0 ? (
                  <div className="ticker-suggestions">
                    {w.tickerSearchResults.slice(0, 6).map((item) => (
                      <button
                        key={`${item.symbol}-${item.market}`}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          w.setNewTicker(item.symbol);
                        }}
                      >
                        <strong>{item.symbol}</strong>
                        <span>{item.name || item.label}</span>
                        <em>{item.market} · {item.currency}</em>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button className="primary" onClick={w.addTickerToWorkspace}>Add</button>
            </div>
          </div>

          <p className="sidebar-note">
            {!isGuest
              ? "History, interval, risk profile, intent, and strategy live on each ticker's analysis pages."
              : "Guest watchlists are local to this browser. Sign in to save them to an account and unlock portfolio dashboards."}
          </p>

          <div className="sidebar-group">
            <span>Current watchlist</span>
            <div className="watch-chip-list">
              {w.visibleSymbols.map((symbol) => (
                <span className="watch-chip" key={symbol}>
                  {symbol}
                  <button aria-label={`Remove ${symbol}`} onClick={() => w.removeTickerFromWorkspace(symbol)}>x</button>
                </span>
              ))}
            </div>
            {!isGuest ? (
              <button onClick={() => w.persistInstruments(w.instruments, "Instrument changes saved.")}>Save watchlist</button>
            ) : (
              <button onClick={() => router.push("/?next=/watchlist")}>Sign in to save</button>
            )}
          </div>
        </aside>

        <section className="dashboard-main">
          <div className="workspace-dashboard">
            <section className="dashboard-header hero-panel">
              <div>
                <p className="eyebrow">Watchlist Dashboard</p>
                <h1>Research watchlist</h1>
                <p className="muted">
                  Watchlist instruments stay separate from trading holdings. Open a ticker for signal, chart, ML, news, backtest, and alert context.
                </p>
                {w.lastSyncedAt ? (
                  <p className="sync-stamp">
                    Synced {new Date(w.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                ) : null}
              </div>
              <div className="header-actions">
                <button type="button" onClick={() => void w.syncWorkspace(false)}>
                  <RefreshCw size={14} /> Sync Workspace
                </button>
              </div>
            </section>

            {!rows.length ? (
              <section className="surface-section">
                <div className="empty-state">
                  <h2>No watchlist instruments yet</h2>
                  <Link className="button-link primary" href="/watchlist/setup">Create watchlist</Link>
                </div>
              </section>
            ) : (
              <section className="ss-card ss-card-table ss-watchlist-card">
                <div className="ss-table-header">
                  <div>
                    <span className="ss-eyebrow">Watchlist</span>
                    <h2 className="ss-card-title">Open research positions</h2>
                  </div>
                  <span className="ss-execution-count">{rows.length} active</span>
                </div>

                <div className="ss-table-scroll">
                  <table className="ss-table ss-watchlist-table">
                    <thead>
                      <tr>
                        <th>Instrument</th>
                        <th>Price</th>
                        <th>Today</th>
                        <th>Position trend</th>
                        <th>Signal</th>
                        <th className="ss-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const symbol = cleanSymbol(row.symbol);
                        const detail = detailBySymbol.get(symbol);
                        const price = Number(detail?.["Current Price"]);
                        const change = Number(detail?.["Today %"]);
                        const positive = !Number.isFinite(change) || change >= 0;
                        const badge = signalLabelFromMove(change);
                        return (
                          <tr className="ss-row" key={symbol}>
                            <td>
                              <div className="ss-position-cell">
                                <span className="ss-dot" style={{ background: generateAvatarColor(symbol) }} />
                                <Link href={`/watchlist/${encodeURIComponent(symbol)}/summary`}>
                                  <div className="ss-position-symbol">
                                    {symbol}
                                    <span className="ss-currency-chip">{currencyForSymbol(symbol)}</span>
                                  </div>
                                  <div className="ss-position-category">
                                    {String(detail?.Category || row.watch_reason || row.strategy || "Research watchlist")}
                                  </div>
                                </Link>
                              </div>
                            </td>
                            <td className="ss-mono ss-strong">{Number.isFinite(price) ? money(price, currencyForSymbol(symbol)) : "Sync pending"}</td>
                            <td className={positive ? "ss-tone-emerald" : "ss-tone-coral"}>{Number.isFinite(change) ? percent(change) : "n/a"}</td>
                            <td><MiniSparkline values={detail?.Trend} tone={positive ? "gain" : "loss"} /></td>
                            <td><span className={`signal-badge ${badge.toLowerCase()}`}>{badge}</span></td>
                            <td className="ss-col-actions">
                              <div className="ss-row-actions ss-watchlist-actions">
                                <Link className="ss-btn" href={`/watchlist/${encodeURIComponent(symbol)}/signal`}>
                                  <EyeIcon size={14} /> View signal
                                </Link>
                                <Link
                                  className={`ss-btn ${isGuest ? "disabled-link" : ""}`}
                                  href={!isGuest ? `/portfolio/setup?symbol=${encodeURIComponent(symbol)}` : `/login?next=${encodeURIComponent(`/portfolio/setup?symbol=${symbol}`)}`}
                                >
                                  <Plus size={14} /> Add to portfolio
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
