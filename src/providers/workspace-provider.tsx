"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  createAlert,
  addHoldingLot,
  closeHolding,
  deleteAlert,
  getMarkets,
  getPortfolio,
  getWorkspace,
  savePortfolio,
  saveWatchlist,
  searchTickers,
  syncWorkspace as apiSyncWorkspace,
  updateInstruments,
  renamePortfolio,
} from "@/lib/api";
import type { AlertRule, AppNotification, Exchange, Instrument, MarketsPayload, NotificationActivity, PortfolioPayload, TickerSuggestion, User } from "@/lib/types";
import {
  cleanSymbol,
  emptyInstrument,
  loadGuestAlerts,
  loadGuestInstruments,
  saveGuestAlerts,
  saveGuestInstruments,
  symbolMatchesMarkets,
} from "@/lib/workspace-utils";
import { NotificationCenter } from "@/lib/notifications";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/providers/toast-provider";

type WorkspaceContextValue = {
  initializing: boolean;
  appLoading: boolean;
  markets: MarketsPayload | null;
  selectedMarkets: Exchange[];
  instruments: Instrument[];
  portfolio: PortfolioPayload | null;
  alerts: AlertRule[];
  guestWorkspaceExists: boolean;
  lastSyncedAt: string | null;
  riskProfile: string;
  profileIndicator: string;
  profileIndicatorReason: string;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  newTicker: string;
  tickerSearchResults: TickerSuggestion[];
  activeSymbols: string[];
  visibleSymbols: string[];
  setRiskProfile: (value: string) => void;
  setNewTicker: (value: string) => void;
  toggleMarket: (value: Exchange) => void;
  refreshWorkspace: () => Promise<void>;
  syncWorkspace: (silent?: boolean) => Promise<void>;
  saveWatchlistRows: (rows: Instrument[]) => Promise<void>;
  savePortfolioRows: (rows: Instrument[]) => Promise<PortfolioPayload>;
  addPortfolioLot: (row: Instrument) => Promise<void>;
  closePortfolioHolding: (symbol: string, payload: { action: "TRANSFER" | "LIQUIDATE"; shares?: number; selling_price?: number; trade_date?: string; fees?: number; note?: string }) => Promise<void>;
  renamePortfolioAccount: (name: string, options?: { silent?: boolean }) => Promise<void>;
  persistInstruments: (rows: Instrument[], successMessage?: string) => Promise<void>;
  updateInstrumentPreferences: (symbol: string, patch: Partial<Instrument>) => Promise<void>;
  addTickerToWorkspace: () => void;
  removeTickerFromWorkspace: (symbol: string) => void;
  createWorkspaceAlert: (alert: AlertRule) => Promise<AlertRule | null>;
  removeAlert: (alertId: string | undefined) => Promise<void>;
  markNotificationRead: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const NOTIFICATION_READ_STORAGE_KEY = "stock-signal-read-notifications";
const NOTIFICATION_ACTIVITY_STORAGE_KEY = "stock-signal-notification-activities";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { token, user, initializing: sessionInitializing } = useSession();
  const { reportError, showToast } = useToast();
  const [initializing, setInitializing] = useState(true);
  const [workspaceHydrating, setWorkspaceHydrating] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<Exchange[]>(["TSX", "NYSE", "NASDAQ"]);
  const [markets, setMarkets] = useState<MarketsPayload | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPayload | null>(null);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [guestWorkspaceExists, setGuestWorkspaceExists] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [riskProfile, setRiskProfile] = useState("Balanced");
  const [newTicker, setNewTicker] = useState("");
  const [tickerSearchResults, setTickerSearchResults] = useState<TickerSuggestion[]>([]);
  const [tickerSearchQuery, setTickerSearchQuery] = useState("");
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => new Set());
  const [notificationActivities, setNotificationActivities] = useState<NotificationActivity[]>([]);
  const syncInFlight = useRef(false);
  const notificationScope = user?.id || user?.username || (token ? "signed-in" : "guest");
  const profileIndicator = useMemo(() => deriveProfileIndicator(portfolio, riskProfile), [portfolio, riskProfile]);
  const notifications = useMemo(
    () => new NotificationCenter({ alerts, portfolio, user, readIds: readNotificationIds, activities: notificationActivities }).build(),
    [alerts, notificationActivities, portfolio, readNotificationIds, user],
  );
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const activeSymbols = useMemo(
    () => Array.from(new Set(instruments.filter((item) => item.active !== false).map((item) => cleanSymbol(item.symbol)).filter(Boolean))),
    [instruments],
  );
  const visibleSymbols = useMemo(
    () => activeSymbols.filter((symbol) => symbolMatchesMarkets(symbol, selectedMarkets, markets)),
    [activeSymbols, selectedMarkets, markets],
  );

  const refreshWorkspace = useCallback(async () => {
    setWorkspaceHydrating(true);
    try {
      if (!token) {
        const localInstruments = loadGuestInstruments();
        const localAlerts = loadGuestAlerts();
        setGuestWorkspaceExists(localInstruments.length > 0);
        setInstruments(localInstruments);
        setAlerts(localAlerts);
        if (localInstruments.length > 0) {
          const result = await apiSyncWorkspace(null, localInstruments);
          setPortfolio(result.synced);
          setLastSyncedAt(new Date().toISOString());
        } else {
          setPortfolio(null);
        }
        return;
      }
      const [workspace, portfolioSnapshot] = await Promise.all([
        getWorkspace(token),
        getPortfolio(token, false).catch(() => null),
      ]);
      setInstruments(workspace.instruments);
      setAlerts(workspace.alerts);
      setPortfolio(portfolioSnapshot);
      if (portfolioSnapshot) setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      reportError(error, "Could not load workspace.");
    } finally {
      setWorkspaceHydrating(false);
    }
  }, [reportError, token]);

  const syncWorkspace = useCallback(async (silent = true) => {
    if (syncInFlight.current || !activeSymbols.length) return;
    syncInFlight.current = true;
    if (!silent) setAppLoading(true);
    try {
      const scoped = instruments.filter((item) => item.active !== false && cleanSymbol(item.symbol));
      const result = await apiSyncWorkspace(token, scoped);
      setPortfolio(result.synced);
      if (token) {
        const workspace = await getWorkspace(token);
        setAlerts(workspace.alerts);
      } else {
        setAlerts(loadGuestAlerts());
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      if (!silent) reportError(error, "Could not sync workspace.");
    } finally {
      syncInFlight.current = false;
      if (!silent) setAppLoading(false);
    }
  }, [activeSymbols.length, instruments, reportError, token]);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      saveReadNotificationIdsForScope(notificationScope, next);
      return next;
    });
  }, [notificationScope]);

  const recordNotificationActivity = useCallback((activity: Omit<NotificationActivity, "id" | "occurredAt"> & { id?: string; occurredAt?: string }) => {
    if (!user || user.isGuest) return;
    setNotificationActivities((current) => {
      const nextActivity: NotificationActivity = {
        ...activity,
        id: activity.id || `${activity.kind}-${Date.now()}`,
        occurredAt: activity.occurredAt || new Date().toISOString(),
      };
      const next = [nextActivity, ...current.filter((item) => item.id !== nextActivity.id)].slice(0, 80);
      saveNotificationActivitiesForScope(notificationScope, next);
      return next;
    });
  }, [notificationScope, user]);

  useEffect(() => {
    let cancelled = false;
    getMarkets()
      .then((payload) => { if (!cancelled) setMarkets(payload); })
      .catch((error) => reportError(error, "Could not load market options."))
      .finally(() => { if (!cancelled) setInitializing(false); });
    setGuestWorkspaceExists(loadGuestInstruments().length > 0);
    return () => { cancelled = true; };
  }, [reportError]);

  useEffect(() => {
    if (!sessionInitializing && !initializing) void refreshWorkspace();
  }, [sessionInitializing, initializing, refreshWorkspace]);

  useEffect(() => {
    setReadNotificationIds(readNotificationIdsForScope(notificationScope));
    setNotificationActivities(notificationActivitiesForScope(notificationScope));
  }, [notificationScope]);

  useEffect(() => {
    if (sessionInitializing || initializing || !activeSymbols.length) return;
    const intervalSeconds = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_SECONDS || 30);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void syncWorkspace(true);
    }, Math.max(5, intervalSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [activeSymbols.length, initializing, sessionInitializing, syncWorkspace]);

  useEffect(() => {
    const query = newTicker.trim();
    if (!query) {
      setTickerSearchResults([]);
      setTickerSearchQuery("");
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchTickers(query, selectedMarkets)
        .then((payload) => {
          if (!cancelled) {
            setTickerSearchResults(payload.results);
            setTickerSearchQuery(query);
          }
        })
        .catch(() => setTickerSearchResults([]));
    }, 260);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [newTicker, selectedMarkets]);

  const persistInstruments = useCallback(async (nextRows: Instrument[], successMessage?: string) => {
    if (!token) {
      saveGuestInstruments(nextRows);
      setGuestWorkspaceExists(nextRows.length > 0);
      setInstruments(nextRows);
      if (nextRows.length > 0) {
        const result = await apiSyncWorkspace(null, nextRows);
        setPortfolio(result.synced);
        setLastSyncedAt(new Date().toISOString());
      } else {
        setPortfolio(null);
      }
      if (successMessage) showToast(`${successMessage} Saved locally in this browser only.`, "info");
      return;
    }
    setAppLoading(true);
    try {
      const result = await updateInstruments(token, nextRows);
      setInstruments(result.instruments);
      const synced = await apiSyncWorkspace(token, result.instruments);
      setPortfolio(synced.synced);
      setLastSyncedAt(new Date().toISOString());
      if (successMessage) showToast(successMessage, "success");
    } catch (error) {
      reportError(error, "Could not save instruments.");
    } finally {
      setAppLoading(false);
    }
  }, [reportError, showToast, token]);

  async function saveWatchlistRows(rows: Instrument[]) {
    const normalized = rows.filter((item) => cleanSymbol(item.symbol)).map((item) => ({ ...item, symbol: cleanSymbol(item.symbol), role: "Watching" as const }));
    const exchange = selectedMarkets.length === 1 ? selectedMarkets[0] : "Mixed";
    if (!token) {
      saveGuestInstruments(normalized);
      setInstruments(normalized);
      setGuestWorkspaceExists(normalized.length > 0);
      const synced = await apiSyncWorkspace(null, normalized);
      setPortfolio(synced.synced);
      setLastSyncedAt(new Date().toISOString());
      showToast("Guest watchlist saved locally in this browser. Sign in to save it to your account.", "info");
      return;
    }
    const result = await saveWatchlist(token, exchange, normalized);
    setInstruments(result.workspace.instruments);
    const synced = await apiSyncWorkspace(token, result.workspace.instruments);
    setPortfolio(synced.synced);
    setLastSyncedAt(new Date().toISOString());
  }

  async function savePortfolioRows(rows: Instrument[]) {
    if (!token) throw new Error("Sign in is required for portfolio monitoring.");
    const normalized = rows.filter((item) => cleanSymbol(item.symbol)).map((item) => ({
      ...item,
      symbol: cleanSymbol(item.symbol),
      role: "Trading" as const,
      book_cost: (Number(item.average_cost) || 0) * (Number(item.shares) || 0),
    }));
    const exchange = selectedMarkets.length === 1 ? selectedMarkets[0] : "Mixed";
    const result = await savePortfolio(token, exchange, normalized);
    setInstruments(result.instruments);
    const synced = await apiSyncWorkspace(token, result.instruments);
    setPortfolio(synced.synced);
    setLastSyncedAt(new Date().toISOString());
    return synced.synced;
  }

  async function addPortfolioLot(row: Instrument) {
    if (!token) throw new Error("Sign in is required for portfolio monitoring.");
    setAppLoading(true);
    try {
      const result = await addHoldingLot(token, {
        symbol: cleanSymbol(row.symbol),
        trade_date: row.purchase_date,
        shares: Number(row.shares) || 0,
        price: Number(row.average_cost) || 0,
        note: row.notes || "",
        intent: row.intent,
        strategy: row.strategy,
      });
      setPortfolio(result.portfolio);
      setInstruments((current) => {
        const symbol = cleanSymbol(row.symbol);
        const next = current.filter((item) => cleanSymbol(item.symbol) !== symbol);
        const matched = result.portfolio.portfolio.find((item) => cleanSymbol(item.Symbol) === symbol);
        return [
          ...next,
          {
            ...emptyInstrument("Trading"),
            symbol,
            role: "Trading",
            active: true,
            shares: Number(matched?.Shares) || Number(row.shares) || 0,
            average_cost: Number(matched?.["Avg Cost"]) || Number(row.average_cost) || 0,
            book_cost: Number(matched?.["Book Cost"]) || (Number(row.average_cost) || 0) * (Number(row.shares) || 0),
            purchase_date: String(matched?.["Purchase Date"] || row.purchase_date || ""),
            intent: row.intent,
            strategy: row.strategy,
          },
        ];
      });
      const workspace = await getWorkspace(token);
      setInstruments(workspace.instruments);
      setAlerts(workspace.alerts);
      const synced = await apiSyncWorkspace(token, workspace.instruments);
      setPortfolio(synced.synced);
      setLastSyncedAt(new Date().toISOString());
      const accountName = synced.synced.account?.name || "your portfolio";
      showToast(`Instrument ${cleanSymbol(row.symbol)} has been added to ${accountName}.`, "success");
    } catch (error) {
      reportError(error, "Could not save holding activity.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }

  async function closePortfolioHolding(symbol: string, payload: { action: "TRANSFER" | "LIQUIDATE"; shares?: number; selling_price?: number; trade_date?: string; fees?: number; note?: string }) {
    if (!token) throw new Error("Sign in is required for portfolio monitoring.");
    setAppLoading(true);
    try {
      const result = await closeHolding(token, symbol, payload);
      setPortfolio(result.portfolio);
      setInstruments((current) => current.map((item) => {
        if (cleanSymbol(item.symbol) !== cleanSymbol(symbol)) return item;
        const matched = result.portfolio.portfolio.find((row) => cleanSymbol(row.Symbol) === cleanSymbol(symbol));
        if (!matched) return { ...item, active: false, shares: 0, book_cost: 0 };
        return { ...item, shares: Number(matched.Shares) || 0, average_cost: Number(matched["Avg Cost"]) || 0, book_cost: Number(matched["Book Cost"]) || 0 };
      }));
      setLastSyncedAt(new Date().toISOString());
      showToast(`${cleanSymbol(symbol)} portfolio activity saved.`, "success");
    } catch (error) {
      reportError(error, "Could not update holding.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }

  async function renamePortfolioAccount(name: string, options: { silent?: boolean } = {}) {
    if (!token) throw new Error("Sign in is required for portfolio monitoring.");
    setAppLoading(true);
    try {
      const result = await renamePortfolio(token, name);
      setPortfolio(result.portfolio);
      if (!options.silent) showToast("Portfolio name updated.", "success");
    } catch (error) {
      reportError(error, "Could not rename portfolio.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }

  async function updateInstrumentPreferences(symbol: string, patch: Partial<Instrument>) {
    const normalized = cleanSymbol(symbol);
    const nextRows = instruments.map((item) => cleanSymbol(item.symbol) === normalized ? { ...item, ...patch } : item);
    setInstruments(nextRows);
    await persistInstruments(nextRows, "Instrument preferences updated.");
  }

  function toggleMarket(market: Exchange) {
    setSelectedMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market]);
  }

  function addTickerToWorkspace() {
    const rawTicker = newTicker.trim();
    const exactSuggestion = tickerSearchResults.find((item) => item.symbol === cleanSymbol(rawTicker));
    const freshSuggestion = tickerSearchQuery === rawTicker ? tickerSearchResults[0] : undefined;
    const symbol = exactSuggestion?.symbol || freshSuggestion?.symbol || cleanSymbol(rawTicker);
    if (!symbol) return;
    const next = [...instruments.filter((item) => cleanSymbol(item.symbol) !== symbol), { ...emptyInstrument("Watching"), symbol }];
    setInstruments(next);
    setNewTicker("");
    setTickerSearchResults([]);
    setTickerSearchQuery("");
    void persistInstruments(next, `${symbol} added to the watchlist.`);
  }

  function removeTickerFromWorkspace(symbol: string) {
    const normalized = cleanSymbol(symbol);
    const next = instruments.filter((item) => cleanSymbol(item.symbol) !== normalized);
    setInstruments(next);
    void persistInstruments(next, `${normalized} removed from the workspace.`);
  }

  async function createWorkspaceAlert(alert: AlertRule) {
    const target = cleanSymbol(alert.symbol);
    if (!target) return null;
    if (!token) {
      const localAlert = { ...alert, id: alert.id || `local-${Date.now()}`, symbol: target };
      const nextAlerts = [...alerts.filter((item) => item.id !== localAlert.id), localAlert];
      saveGuestAlerts(nextAlerts);
      setAlerts(nextAlerts);
      showToast(`Alert created locally for ${target}. Sign in to save alerts to your account.`, "info");
      return localAlert;
    }
    setAppLoading(true);
    try {
      const result = await createAlert(token, { ...alert, symbol: target });
      setAlerts((current) => [...current.filter((item) => item.id !== result.alert.id), result.alert]);
      recordNotificationActivity({
        id: `alert-created-${result.alert.id || target}`,
        kind: "alert-created",
        title: `Alert created for ${target}`,
        detail: `${result.alert.metric} ${result.alert.operator} ${result.alert.threshold} is now being monitored.`,
        symbol: target,
        href: target === "__PORTFOLIO__" ? "/portfolio" : `/watchlist/${encodeURIComponent(target)}/alerts`,
        ctaLabel: target === "__PORTFOLIO__" ? "Review portfolio" : "View alert",
      });
      showToast(`Alert created for ${target}.`, "success");
      return result.alert;
    } catch (error) {
      reportError(error, "Could not create alert.");
      return null;
    } finally {
      setAppLoading(false);
    }
  }

  async function removeAlert(alertId: string | undefined) {
    if (!alertId) return;
    const existing = alerts.find((item) => item.id === alertId);
    if (!token) {
      const nextAlerts = alerts.filter((item) => item.id !== alertId);
      saveGuestAlerts(nextAlerts);
      setAlerts(nextAlerts);
      showToast("Local alert deleted.", "success");
      return;
    }
    setAppLoading(true);
    try {
      const result = await deleteAlert(token, alertId);
      setAlerts(result.alerts);
      const symbol = cleanSymbol(existing?.symbol);
      recordNotificationActivity({
        id: `alert-deleted-${alertId}-${Date.now()}`,
        kind: "alert-deleted",
        title: symbol ? `Alert deleted for ${symbol}` : "Alert deleted",
        detail: existing ? `${existing.metric} ${existing.operator} ${existing.threshold} is no longer being monitored.` : "The alert is no longer being monitored.",
        symbol,
        href: symbol === "__PORTFOLIO__" ? "/portfolio" : symbol ? `/watchlist/${encodeURIComponent(symbol)}/alerts` : "/watchlist",
        ctaLabel: symbol === "__PORTFOLIO__" ? "Review portfolio" : symbol ? "Open alerts" : "Open watchlist",
      });
      showToast("Alert deleted.", "success");
    } catch (error) {
      reportError(error, "Could not delete alert.");
    } finally {
      setAppLoading(false);
    }
  }

  const value = useMemo<WorkspaceContextValue>(() => ({
    initializing: sessionInitializing || initializing || workspaceHydrating,
    appLoading,
    markets,
    selectedMarkets,
    instruments,
    portfolio,
    alerts,
    guestWorkspaceExists,
    lastSyncedAt,
    riskProfile,
    profileIndicator: profileIndicator.label,
    profileIndicatorReason: profileIndicator.reason,
    notifications,
    unreadNotificationCount,
    newTicker,
    tickerSearchResults,
    activeSymbols,
    visibleSymbols,
    setRiskProfile,
    setNewTicker,
    toggleMarket,
    refreshWorkspace,
    syncWorkspace,
    saveWatchlistRows,
    savePortfolioRows,
    addPortfolioLot,
    closePortfolioHolding,
    renamePortfolioAccount,
    persistInstruments,
    updateInstrumentPreferences,
    addTickerToWorkspace,
    removeTickerFromWorkspace,
    createWorkspaceAlert,
    removeAlert,
    markNotificationRead,
  }), [sessionInitializing, initializing, workspaceHydrating, appLoading, markets, selectedMarkets, instruments, portfolio, alerts, guestWorkspaceExists, lastSyncedAt, riskProfile, profileIndicator, notifications, unreadNotificationCount, newTicker, tickerSearchResults, activeSymbols, visibleSymbols, refreshWorkspace, syncWorkspace, persistInstruments, markNotificationRead]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}

function deriveProfileIndicator(portfolio: PortfolioPayload | null, fallback: string) {
  const rows = portfolio?.portfolio || [];
  const metrics = portfolio?.metrics;
  if (!rows.length || !metrics) {
    return { label: fallback, reason: "Using the selected analysis profile until portfolio behavior is available." };
  }
  const maxWeight = rows.reduce((max, row) => Math.max(max, Number(row["Portfolio %"]) || 0), 0);
  const sincePct = Number(metrics.sincePurchasePct);
  const todayRatio = Number(metrics.marketValue) > 0 ? Number(metrics.todayPl) / Number(metrics.marketValue) : 0;
  const losers = rows.filter((row) => (Number(row["Since Purchase $"]) || 0) < 0).length;

  if (maxWeight >= 0.45 || todayRatio <= -0.02 || sincePct <= -0.1) {
    return {
      label: "Conservative",
      reason: "Portfolio behavior suggests tighter risk because concentration or drawdown risk is elevated.",
    };
  }
  if (sincePct >= 0.15 && maxWeight <= 0.35 && losers <= Math.max(1, rows.length / 3)) {
    return {
      label: "Growth",
      reason: "Portfolio behavior supports a growth tilt because returns are strong without dominant concentration.",
    };
  }
  return {
    label: "Balanced",
    reason: "Portfolio behavior is mixed, so the indicator is staying balanced.",
  };
}

function readNotificationIdsForScope(scope: string) {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY) || "{}") as Record<string, string[]>;
    return new Set(stored[scope] || []);
  } catch {
    return new Set<string>();
  }
}

function saveReadNotificationIdsForScope(scope: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY) || "{}") as Record<string, string[]>;
    stored[scope] = Array.from(ids).slice(-100);
    window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Read state is a convenience; ignore browser storage failures.
  }
}

function notificationActivitiesForScope(scope: string) {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFICATION_ACTIVITY_STORAGE_KEY) || "{}") as Record<string, NotificationActivity[]>;
    return Array.isArray(stored[scope]) ? stored[scope] : [];
  } catch {
    return [];
  }
}

function saveNotificationActivitiesForScope(scope: string, activities: NotificationActivity[]) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFICATION_ACTIVITY_STORAGE_KEY) || "{}") as Record<string, NotificationActivity[]>;
    stored[scope] = activities.slice(0, 80);
    window.localStorage.setItem(NOTIFICATION_ACTIVITY_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Activity notifications are helpful but should not block account actions.
  }
}
