"use client";

import Link from "next/link";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Info,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Instrument, PortfolioActivity } from "@/lib/types";
import { currencyForSymbol, emptyInstrument, formatCell, money, percent, today } from "@/lib/workspace-utils";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell
} from "recharts";
import { generateAvatarColor } from "@/components/navigation/top-nav";


export type HoldingAction = "add" | "transfer" | "liquidate" | null;

type SortKey = "Symbol" | "Shares" | "Book Cost" | "Avg Cost" | "Market Value" | "Since Purchase $";
type PortfolioRange = "1D" | "1W" | "1M" | "YTD" | "ALL";

const HOLDING_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "Symbol", label: "Position" },
  { key: "Shares", label: "Shares" },
  { key: "Book Cost", label: "Book cost" },
  { key: "Avg Cost", label: "Avg price" },
  { key: "Market Value", label: "Market value" },
  { key: "Since Purchase $", label: "Total return" },
];

const PORTFOLIO_RANGES: PortfolioRange[] = ["1D", "1W", "1M", "YTD", "ALL"];

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function SignalDot({ color = "#34D399", size = 7, animate = true }: { color?: string; size?: number; animate?: boolean }) {
  return (
    <span className="ss-signal-dot-wrap" style={{ width: size * 3, height: size * 3 }}>
      {animate && <span className="ss-signal-dot-ring" style={{ background: color, width: size, height: size }} />}
      <span className="ss-signal-dot-core" style={{ background: color, width: size, height: size }} />
    </span>
  );
}

function PortfolioSparkline({ values, tone }: { values: unknown; tone: "gain" | "loss" }) {
  const parsed = Array.isArray(values) ? values.map(Number).filter(Number.isFinite) : [];
  if (parsed.length < 2) return <span className="ss-muted-sm">Sync pending</span>;
  const min = Math.min(...parsed);
  const max = Math.max(...parsed);
  const span = max - min || 1;
  const width = 108;
  const height = 34;
  const pts = parsed.map((value, index) => {
    const x = (index / (parsed.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = tone === "gain" ? "var(--ss-emerald)" : "var(--ss-coral)";
  const areaPts = `0,${height} ${pts.join(" ")} ${width},${height}`;
  return (
    <svg className="ss-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={areaPts} fill={`${color}22`} stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanBadge({ action, confidence }: { action: string; confidence: unknown }) {
  const numeric = Number(confidence);
  const hasNumber = Number.isFinite(numeric);
  const tone = !hasNumber ? "indigo" : numeric >= 80 ? "emerald" : numeric >= 65 ? "indigo" : "amber";
  return (
    <div className="ss-plan-badge">
      <span className={`ss-plan-pill ss-tone-bg-${tone}`}>{action || "—"}</span>
      {hasNumber && (
        <>
          <span className="ss-plan-confidence">
            <span className={`ss-confidence-fill ss-tone-bg-${tone}`} style={{ width: `${Math.min(100, Math.max(0, numeric))}%` }} />
          </span>
          <span className="ss-plan-confidence-label">{formatCell(numeric)}</span>
        </>
      )}
    </div>
  );
}

function CustomHeroTooltip({ active, payload, label, currency }: { active?: boolean; payload?: { value: number }[]; label?: string; currency: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ss-chart-tooltip">
      <span className="ss-chart-tooltip-label">{label}</span>
      <span className="ss-chart-tooltip-value">{money(payload[0].value, currency)}</span>
    </div>
  );
}

function numericArray(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

function aggregateHoldingTrends(rows: Record<string, unknown>[], marketValue: number) {
  const series = rows
    .map((row) => ({ shares: Number(row.Shares) || 0, trend: numericArray(row.Trend) }))
    .filter((row) => row.shares > 0 && row.trend.length > 1);
  const length = Math.max(0, ...series.map((row) => row.trend.length));
  if (length < 2) return [];
  return Array.from({ length }, (_, index) => {
    const value = series.reduce((total, row) => {
      const offset = length - row.trend.length;
      const trendIndex = Math.max(0, index - offset);
      return total + (row.trend[trendIndex] || 0) * row.shares;
    }, 0);
    return { label: `T-${length - index - 1}`, value: Number.isFinite(value) && value > 0 ? value : marketValue };
  });
}

function portfolioHistoryForRange(history: { label: string; value: number }[], range: PortfolioRange) {
  const countByRange: Record<PortfolioRange, number> = { "1D": 78, "1W": 7, "1M": 31, YTD: 190, ALL: history.length };
  return history.slice(-Math.max(2, countByRange[range] || history.length));
}

function valueDomainForHistory(history: { value: number }[]) {
  const values = history.map((row) => Number(row.value)).filter(Number.isFinite);
  if (!values.length) return ["dataMin", "dataMax"] as const;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(1, (max - min || Math.abs(max) * 0.01 || 1) * 0.12);
  return [Math.max(0, min - padding), max + padding] as [number, number];
}

function displayPct(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "n/a";
  return `${Math.abs(numeric > 1 ? numeric : numeric * 100).toFixed(1)}%`;
}

function holdingSummary(row: Record<string, unknown>, plan: Record<string, unknown> | undefined) {
  const symbol = String(row.Symbol || "This position");
  const currency = currencyForSymbol(symbol);
  const since = Number(row["Since Purchase $"]) || 0;
  const todayValue = Number(row["Today $"]) || 0;
  const portfolioWeight = displayPct(row["Portfolio %"]);
  const planAction = String(plan?.Action || plan?.action || "monitor");
  const confidence = plan?.Confidence ?? plan?.score;
  const confidenceText = Number.isFinite(Number(confidence)) ? ` with ${formatCell(confidence)} confidence` : "";
  const returnText = since >= 0 ? "up" : "down";
  const todayText = todayValue >= 0 ? "added" : "lost";
  return `${symbol} is ${returnText} ${money(Math.abs(since), currency)} since purchase and represents ${portfolioWeight} of this portfolio. Today it ${todayText} ${money(Math.abs(todayValue), currency)}. Current execution read: ${planAction}${confidenceText}.`;
}

function executionSummary(plan: Record<string, unknown>, category: string) {
  const symbol = String(plan.Symbol || plan.symbol || "This holding");
  const action = String(plan.Action || plan.action || "HOLD");
  const confidence = plan.Confidence ?? plan.score;
  const reason = String(plan.Reason || plan.reason || plan.Summary || plan.summary || "Review the Signal tab for the full rule-based, RSI/ADX, ML, and backtest context.");
  const confidenceText = Number.isFinite(Number(confidence)) ? ` at ${formatCell(confidence)} confidence` : "";
  return `${symbol} is currently marked ${action}${confidenceText} in ${category}. ${reason}`;
}

/* ------------------------------------------------------------------ */
/*  Metrics + hero                                                     */
/* ------------------------------------------------------------------ */

function PortfolioHero({ rows, lastSyncedAt }: { rows: Record<string, unknown>[]; lastSyncedAt: string | null }) {
  const { portfolio } = useWorkspace();
  const [range, setRange] = useState<PortfolioRange>("1M");
  const m = portfolio?.metrics;
  const currency = m?.currency === "MIXED" ? "USD" : m?.currency || "USD";

  const invested = Number(m?.totalInvested) || 0;
  const marketValue = Number(m?.marketValue) || 0;
  const sincePurchase = Number(m?.sincePurchase) || 0;
  const sincePurchasePct = Number(m?.sincePurchasePct) || 0;
  const todayPl = Number(m?.todayPl) || 0;
  const weekPl = Number(m?.weekPl) || 0;
  const positive = sincePurchase >= 0;
  const apiHistory = (portfolio as unknown as { valueHistory?: { label: string; value: number }[] })?.valueHistory || [];
  const rawHistory = apiHistory.length > 1 ? apiHistory : aggregateHoldingTrends(rows, marketValue);
  const history = portfolioHistoryForRange(rawHistory, range);
  const hasHistory = history.length > 1;
  const yDomain = valueDomainForHistory(history);

  return (
    <section className="ss-hero-grid">
      <div className="ss-card ss-hero-card">
        <div className="ss-hero-top">
          <div className="ss-hero-value-block">
            <div className="ss-hero-label-row">
              <span className="ss-hero-label">Market value</span>
              <span className="ss-live-tag">
                <SignalDot color="#34D399" size={4} /> {lastSyncedAt ? `Synced ${lastSyncedAt}` : "Sync pending"}
              </span>
            </div>
            <span className="ss-hero-value">{money(marketValue, currency)}</span>
            <span className={`ss-hero-delta ${positive ? "ss-tone-emerald" : "ss-tone-coral"}`}>
              {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {money(sincePurchase, currency)} ({percent(sincePurchasePct)}) all time
            </span>
          </div>
          <div className="ss-range-tabs" aria-label="Portfolio value range">
            {PORTFOLIO_RANGES.map((item) => (
              <button key={item} type="button" className={range === item ? "is-active" : ""} onClick={() => setRange(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {hasHistory ? (
          <div className="ss-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ssHeroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" hide />
                <YAxis domain={yDomain} hide />
                <Tooltip content={<CustomHeroTooltip currency={currency} />} cursor={{ stroke: "#2E3948", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="value" stroke="#34D399" strokeWidth={2} fill="url(#ssHeroFill)" animationDuration={500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="ss-hero-history-note">
            Value history isn't available from the workspace yet — this panel will chart it automatically once it is.
          </p>
        )}
      </div>

      <div className="ss-stat-col">
        <div className="ss-stat-tile">
          <span className="ss-stat-label">Total invested</span>
          <span className="ss-stat-value">{money(invested, currency)}</span>
        </div>
        <div className="ss-stat-tile">
          <span className="ss-stat-label">Today's P/L</span>
          <span className="ss-stat-value">{money(todayPl, currency)}</span>
          <span className={`ss-stat-sub ${todayPl >= 0 ? "ss-tone-emerald" : "ss-tone-coral"}`}>
            {invested ? percent((todayPl / invested) * 100) : "—"}
          </span>
        </div>
        <div className="ss-stat-tile">
          <span className="ss-stat-label">This week's P/L</span>
          <span className="ss-stat-value">{money(weekPl, currency)}</span>
          <span className={`ss-stat-sub ${weekPl >= 0 ? "ss-tone-emerald" : "ss-tone-coral"}`}>
            {invested ? percent((weekPl / invested) * 100) : "—"}
          </span>
        </div>
      </div>
    </section>
  );
}

function asRatio(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

/* ------------------------------------------------------------------ */
/*  Allocation donut                                                   */
/* ------------------------------------------------------------------ */

function AllocationCard({ rows }: { rows: Record<string, unknown>[] }) {
  const data = rows.map((row) => {
    const symbol = String(row.Symbol || "");
    //const category = String(symbol);
    return {
      name: symbol,
      value: Math.max(0, Number(row["Portfolio %"]) || 0),
      color: generateAvatarColor(symbol),
    };
  });

  return (
    <div className="ss-card">
      <span className="ss-eyebrow">Composition</span>
      <h3 className="ss-card-title">Allocation by instrument</h3>
      <div className="ss-donut-wrap">
        <div className="ss-donut-chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={3} stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="ss-donut-center">
            <span className="ss-donut-center-value">{rows.length}</span>
            <span className="ss-donut-center-label">holdings</span>
          </div>
        </div>
        <div className="ss-legend">
          {data.map((a) => (
            <div className="ss-legend-row" key={a.name}>
              <div className="ss-legend-left">
                <span className="ss-dot" style={{ background: a.color }} />
                {a.name}
              </div>
              <span className="ss-legend-pct">{percent(a.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function exposureRows(exposure: Record<string, unknown>[], holdings: Record<string, unknown>[]) {
  if (exposure.length) {
    return exposure.map((row, index) => {
      const name = String(row.Category || row.Sector || row.Name || row.Symbol || `Exposure ${index + 1}`);
      return {
        name,
        ratio: asRatio(row["Portfolio %"] ?? row["% of portfolio"] ?? row.Weight ?? row.Exposure),
        marketValue: Number(row["Market Value"] ?? row.Value ?? row.Amount) || 0,
        change: Number(row["Today $"] ?? row["Since Purchase $"] ?? row.Change) || 0,
        color: generateAvatarColor(name),
      };
    });
  }

  const grouped = new Map<string, { marketValue: number; change: number }>();
  const total = holdings.reduce((sum, row) => sum + (Number(row["Market Value"]) || 0), 0);
  holdings.forEach((row) => {
    const name = String(row.Category || "Unassigned");
    const current = grouped.get(name) || { marketValue: 0, change: 0 };
    current.marketValue += Number(row["Market Value"]) || 0;
    current.change += Number(row["Since Purchase $"]) || 0;
    grouped.set(name, current);
  });

  return Array.from(grouped, ([name, row]) => ({
    name,
    ratio: total ? row.marketValue / total : 0,
    marketValue: row.marketValue,
    change: row.change,
    color: generateAvatarColor(name),
  }));
}

function SectorExposureCard({ exposure, holdings }: { exposure: Record<string, unknown>[]; holdings: Record<string, unknown>[] }) {
  const rows = exposureRows(exposure, holdings).sort((a, b) => b.ratio - a.ratio);
  const currency = currencyForSymbol(String(holdings[0]?.Symbol || ""));
  return (
    <div className="ss-card">
      <span className="ss-eyebrow">Risk</span>
      <h3 className="ss-card-title">Sector exposure</h3>
      {!rows.length ? (
        <p className="ss-muted" style={{ marginTop: 14 }}>No exposure data available yet.</p>
      ) : (
        <div className="ss-exposure-list">
          {rows.map((row) => {
            const positive = row.change >= 0;
            return (
              <div className="ss-exposure-row" key={row.name}>
                <div className="ss-exposure-top">
                  <strong>{row.name}</strong>
                  <span>{percent(row.ratio)}</span>
                </div>
                <div className="ss-exposure-track">
                  <span style={{ width: `${Math.min(100, Math.max(4, row.ratio * 100))}%`, background: row.color }} />
                </div>
                <div className="ss-exposure-bottom">
                  <span>{money(row.marketValue, currency)}</span>
                  <span className={positive ? "ss-tone-emerald" : "ss-tone-coral"}>
                    {positive ? "+" : ""}{money(row.change, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Insights (portfolio inference notes)                               */
/* ------------------------------------------------------------------ */

function InsightsCard({ notes }: { notes: string[] }) {
  return (
    <div className="ss-card">
      <span className="ss-eyebrow">Inference</span>
      <h3 className="ss-card-title">Portfolio insights</h3>
      <div style={{ marginTop: 4 }}>
        {!notes.length ? (
          <p className="ss-muted" style={{ marginTop: 14 }}>No notes for this portfolio yet.</p>
        ) : (
          notes.map((note, index) => (
            <div className="ss-insight-row" key={`${index}-${note.slice(0, 24)}`}>
              <div className={`ss-insight-icon ${index === 0 ? "ss-tone-bg-amber" : index === 1 ? "ss-tone-bg-emerald" : "ss-tone-bg-coral"}`}>
                {index === 0 ? <AlertTriangle size={13} /> : index === 1 ? <TrendingUp size={13} /> : index === 2 ? <AlertCircle size={13} /> : <Info size={13} />}
              </div>
              <p className="ss-insight-body">{note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Holdings table                                                     */
/* ------------------------------------------------------------------ */

function HoldingsTable({
  rows,
  executionPlans,
  onAction,
}: {
  rows: Record<string, unknown>[];
  executionPlans: Record<string, unknown>[];
  onAction: (action: HoldingAction, row: Record<string, unknown>) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("Market Value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"all" | "gainers" | "losers">("all");
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const planBySymbol = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    executionPlans.forEach((plan) => {
      const symbol = String(plan.Symbol || plan.symbol || "");
      if (symbol) map.set(symbol, plan);
    });
    return map;
  }, [executionPlans]);

  const gainers = rows.filter((row) => (Number(row["Since Purchase $"]) || 0) > 0).length;
  const losers = rows.filter((row) => (Number(row["Since Purchase $"]) || 0) < 0).length;

  const filtered = useMemo(() => {
    let next = [...rows];
    if (filter === "gainers") next = next.filter((row) => (Number(row["Since Purchase $"]) || 0) > 0);
    if (filter === "losers") next = next.filter((row) => (Number(row["Since Purchase $"]) || 0) < 0);
    next.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "Symbol") return String(a.Symbol || "").localeCompare(String(b.Symbol || "")) * dir;
      const av = Number(a[sortKey]) || 0;
      const bv = Number(b[sortKey]) || 0;
      return (av - bv) * dir;
    });
    return next;
  }, [rows, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <section className="ss-card ss-card-table">
      <div className="ss-table-header">
        <div>
          <span className="ss-eyebrow">Holdings</span>
          <h2 className="ss-card-title">Open positions</h2>
        </div>
        <div className="ss-filter-chips">
          {[
            { key: "all" as const, label: `All · ${rows.length}` },
            { key: "gainers" as const, label: `Gainers · ${gainers}` },
            { key: "losers" as const, label: `Losers · ${losers}` },
          ].map((c) => (
            <button key={c.key} type="button" className={`ss-chip ${filter === c.key ? "is-active" : ""}`} onClick={() => setFilter(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ss-table-scroll">
        <table className="ss-table">
          <thead>
            <tr>
              {HOLDING_COLUMNS.map((col) => (
                <th key={col.key} onClick={() => toggleSort(col.key)}>
                  <span className="ss-th-inner">
                    {col.label}
                    <ArrowUpDown size={12} className={`ss-sort-icon ${sortKey === col.key ? "is-active" : ""}`} />
                  </span>
                </th>
              ))}
              <th>Position trend</th>
              <th>Plan</th>
              <th className="ss-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const symbol = String(row.Symbol || "");
              const category = String(row.Category || "Unassigned");
              const currency = currencyForSymbol(symbol);
              const since = Number(row["Since Purchase $"]) || 0;
              const sincePct = Number(row["Since Purchase %"]) || 0;
              const positive = since >= 0;
              const plan = planBySymbol.get(symbol);
              const dotColor = generateAvatarColor(symbol);
              const expanded = expandedSymbol === symbol;

              return (
                <Fragment key={symbol}>
                  <tr className={`ss-row ${expanded ? "is-expanded" : ""}`} key={symbol}>
                    <td>
                      <div className="ss-position-cell">
                        <button
                          type="button"
                          className="ss-expand-btn"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Collapse" : "Expand"} ${symbol} summary`}
                          onClick={() => setExpandedSymbol(expanded ? null : symbol)}
                        >
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="ss-dot" style={{ background: dotColor }} />
                        <Link href={`/portfolio/${encodeURIComponent(symbol)}/summary`}>
                          <div className="ss-position-symbol">
                            {symbol}
                            <span className="ss-currency-chip">{currency}</span>
                          </div>
                          <div className="ss-position-category">{category}</div>
                        </Link>
                      </div>
                    </td>
                    <td className="ss-mono">{formatCell(row.Shares)}</td>
                    <td className="ss-mono">{money(Number(row["Book Cost"]), currency)}</td>
                    <td className="ss-mono">{money(Number(row["Avg Cost"]), currency)}</td>
                    <td className="ss-mono ss-strong">{money(Number(row["Market Value"]), currency)}</td>
                    <td>
                      <div className="ss-return-cell">
                        <span className={`ss-mono ss-strong ${positive ? "ss-tone-emerald" : "ss-tone-coral"}`}>{money(since, currency)}</span>
                        <span className={`ss-return-pct ss-tone-bg-${positive ? "emerald" : "coral"}`}>
                          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {Math.abs(sincePct).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <PortfolioSparkline values={row.Trend} tone={positive ? "gain" : "loss"} />
                    </td>
                    <td>
                      {plan ? (
                        <PlanBadge action={String(plan.Action || plan.action || "HOLD")} confidence={plan.Confidence ?? plan.score} />
                      ) : (
                        <span className="ss-muted-sm">No plan</span>
                      )}
                    </td>
                    <td className="ss-col-actions">
                      <div className="ss-row-actions">
                        <button type="button" className="ss-icon-btn" title="Add more" onClick={() => onAction("add", row)}>
                          <Plus size={14} />
                        </button>
                        <button type="button" className="ss-icon-btn" title="Transfer" onClick={() => onAction("transfer", row)}>
                          <Archive size={14} />
                        </button>
                        <button type="button" className="ss-icon-btn ss-icon-btn-danger" title="Liquidate" onClick={() => onAction("liquidate", row)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="ss-row-detail" key={`${symbol}-detail`}>
                      <td colSpan={9}>
                        <div className="ss-holding-summary">
                          <div className="ss-holding-summary-copy">
                            <Info size={14} />
                            <span>{holdingSummary(row, plan)}</span>
                          </div>
                          <Link className="ss-detail-link" href={`/portfolio/${encodeURIComponent(symbol)}/summary`}>
                            <Eye size={14} /> View full analysis
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Execution — plans across holdings                                  */
/* ------------------------------------------------------------------ */

function ExecutionPanel({ plans, rows }: { plans: Record<string, unknown>[]; rows: Record<string, unknown>[] }) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(plans[0] ? String(plans[0].Symbol || plans[0].symbol || "") : null);
  if (!plans.length) return null;
  const categoryBySymbol = new Map(rows.map((row) => [String(row.Symbol || ""), String(row.Category || "Unassigned")]));

  return (
    <section className="ss-card ss-execution-card">
      <div className="ss-execution-header">
        <div>
          <span className="ss-eyebrow">Execution</span>
          <h2 className="ss-card-title">Plans across holdings</h2>
          <p className="ss-card-sub">The current call on each position and how confident the signal is.</p>
        </div>
        <span className="ss-execution-count">{plans.length} active plans</span>
      </div>

      <div className="ss-execution-grid">
        {plans.map((plan, index) => {
          const symbol = String(plan.Symbol || plan.symbol || "");
          const category = categoryBySymbol.get(symbol) || "Unassigned";
          const action = String(plan.Action || plan.action || "HOLD");
          const confidence = plan.Confidence ?? plan.score;
          const expanded = expandedSymbol === symbol;
          return (
            <div className={`ss-execution-item ${expanded ? "is-expanded" : ""}`} key={`${symbol}-${index}`}>
              <div className="ss-execution-top">
                <div>
                  <div className="ss-execution-symbol">
                    <span className="ss-dot" style={{ background: generateAvatarColor(symbol) }} />
                    {symbol || "—"}
                  </div>
                  <div className="ss-execution-category">{category}</div>
                </div>
                {symbol && (
                  <button
                    className="ss-execution-view"
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedSymbol(expanded ? null : symbol)}
                  >
                    {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />} View
                  </button>
                )}
              </div>
              <div className="ss-execution-bottom">
                <PlanBadge action={action} confidence={confidence} />
              </div>
              {expanded && symbol ? (
                <div className="ss-execution-detail">
                  <p>{executionSummary(plan, category)}</p>
                  <Link href={`/portfolio/${encodeURIComponent(symbol)}/signal`}>
                    View execution plan <ChevronRight size={13} />
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity                                                            */
/* ------------------------------------------------------------------ */

function ActivityList({ activities }: { activities: PortfolioActivity[] }) {
  const rows = activities.slice(0, 12);
  return (
    <section className="ss-card ss-activity-list-card">
      <span className="ss-eyebrow">Activity</span>
      <h2 className="ss-card-title">Purchase and portfolio history</h2>
      {!rows.length ? (
        <div className="ss-activity-empty">
          <div className="ss-activity-icon"><Wallet size={18} /></div>
          <p className="ss-activity-title">No activity recorded yet</p>
          <p className="ss-activity-sub">Trades, transfers, and syncs will show up here as soon as something happens in this portfolio.</p>
        </div>
      ) : (
        <div className="ss-activity-rows">
          {rows.map((item) => (
            <article className="ss-activity-row" key={item.id}>
              <div>
                <strong>{item.activityType.replace("_", " ")}</strong>
                <span>{item.symbol} · {item.tradeDate}</span>
              </div>
              <div className="ss-activity-row-right">
                <strong>{money(item.amount, currencyForSymbol(item.symbol))}</strong>
                <span>{formatCell(item.shares)} shares at {money(item.price, currencyForSymbol(item.symbol))}</span>
              </div>
              {item.note ? <p className="ss-activity-note">{item.note}</p> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Holding action modal                                               */
/* ------------------------------------------------------------------ */

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
    <div className="ss-modal-backdrop" role="presentation">
      <form className="ss-modal-card" onSubmit={submit}>
        <header className="ss-modal-header">
          <h2>{title}</h2>
          <button type="button" className="ss-icon-btn" onClick={onClose} aria-label="Close">×</button>
        </header>
        <p className="ss-muted">Current position: {formatCell(currentShares)} shares, average cost {money(Number(row["Avg Cost"]), currency)}.</p>
        <label className="ss-field">
          Date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="ss-field">
          Shares
          <input type="number" min="0" step="0.0001" value={shares} placeholder={action === "add" ? "Shares bought" : `${currentShares}`} onChange={(event) => setShares(event.target.value)} />
        </label>
        {action !== "transfer" ? (
          <label className="ss-field">
            {action === "add" ? "Purchase price" : "Selling price"}
            <input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
          </label>
        ) : null}
        <label className="ss-field">
          Note
          <textarea value={note} onChange={(event) => setNote(event.target.value)} required={action === "transfer"} placeholder={action === "transfer" ? "Transfer destination or reason" : "Optional note"} />
        </label>
        <div className="ss-modal-actions">
          <button type="button" className="ss-btn" onClick={onClose}>Cancel</button>
          <button className="ss-btn ss-btn-primary" type="submit">{action === "add" ? "Save purchase" : "Save activity"}</button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */

export function PortfolioDashboard() {
  const workspace = useWorkspace();
  const session = useSession();
  const rows = workspace.portfolio?.portfolio || [];
  const activities = workspace.portfolio?.activities || [];
  const account = workspace.portfolio?.account;
  const notes = workspace.portfolio?.notes || [];
  const executionPlans = workspace.portfolio?.executionPlans || [];
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
        <div className="dashboard-content">
          <section className="dashboard-main">
            <section className="dashboard-header hero-panel">
              <div>
                <p className="eyebrow">Portfolio</p>
                <h1>Sign in to monitor trading holdings.</h1>
                <p className="muted">Guest mode is limited to browser-local watchlists and instrument analysis.</p>
              </div>
            </section>
          </section>
        </div>
      </main>
    );
  }

  function openAction(nextAction: HoldingAction, row: Record<string, unknown>) {
    setActiveRow(row);
    setAction(nextAction);
  }

  const lastSyncedLabel = workspace.lastSyncedAt ? new Date(workspace.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-content">
        <section className="dashboard-main">
          <div className="workspace-dashboard">
            <div className="ss-portfolio">
              <section className="ss-page-header">
                <div>
                  <span className="ss-eyebrow">Portfolio dashboard</span>
                  {editingName ? (
                    <form
                      className="ss-name-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await workspace.renamePortfolioAccount(portfolioName);
                        setEditingName(false);
                      }}
                    >
                      <input value={portfolioName} onChange={(event) => setPortfolioName(event.target.value)} />
                      <button className="ss-btn ss-btn-primary" type="submit">Save</button>
                      <button className="ss-btn" type="button" onClick={() => setEditingName(false)}>Cancel</button>
                    </form>
                  ) : (
                    <div className="ss-title-row">
                      <h1 className="ss-page-title">{account?.name || "My portfolio"}</h1>
                      <button className="ss-edit-btn" type="button" onClick={() => setEditingName(true)} aria-label="Rename portfolio">
                        <Edit3 size={14} />
                      </button>
                    </div>
                  )}
                  <div className="ss-sync-row">
                    <SignalDot color="#34D399" size={5} />
                    Synced {lastSyncedLabel || "pending"} · {rows.length} {rows.length === 1 ? "holding" : "holdings"}
                  </div>
                </div>
                <div className="ss-header-actions">
                  <button type="button" className="ss-btn" onClick={() => void workspace.refreshWorkspace()}>
                    <RefreshCw size={14} /> Sync workspace
                  </button>
                  <Link className="ss-btn ss-btn-primary" href="/portfolio/setup">
                    <Plus size={14} /> Add holding
                  </Link>
                </div>
              </section>

              {!rows.length ? (
                <section className="ss-card ss-empty-state">
                  <h2 className="ss-card-title">No holdings yet</h2>
                  <p className="ss-muted">Create a named portfolio and add the first purchase lot to see cost basis, market value, allocation, P/L, sector exposure, and execution plans.</p>
                  <Link className="ss-btn ss-btn-primary" href="/portfolio/setup">Create first holding</Link>
                </section>
              ) : (
                <>
                  <PortfolioHero rows={rows} lastSyncedAt={lastSyncedLabel} />

                  <section className="ss-mid-grid">
                    <AllocationCard rows={rows} />
                    <SectorExposureCard exposure={workspace.portfolio?.categoryExposure || []} holdings={rows} />
                    <InsightsCard notes={notes} />
                  </section>

                  <HoldingsTable rows={rows} executionPlans={executionPlans} onAction={openAction} />

                  <ExecutionPanel plans={executionPlans} rows={rows} />

                  <ActivityList activities={activities} />
                </>
              )}
            </div>
          </div>
        </section>
      </div>
      <HoldingActionModal
        action={action}
        row={activeRow}
        onClose={() => {
          setAction(null);
          setActiveRow(null);
        }}
      />
    </main>
  );
}
