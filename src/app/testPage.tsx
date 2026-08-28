"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  createAlert,
  deleteAlert,
  getCorrelation,
  getAnalysis,
  getMarkets,
  getPortfolio,
  getWorkspace,
  login,
  savePortfolio,
  saveWatchlist,
  searchTickers,
  updateInstruments,
} from "@/lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth-token";
import { PasswordField } from "@/components/auth/password-field";
import type {
  AlertRule,
  AnalysisPayload,
  CorrelationPayload,
  Exchange,
  Instrument,
  MarketsPayload,
  PortfolioPayload,
  TickerSuggestion,
  User,
  WorkflowMode,
} from "@/lib/types";
import {
  ChartCandlestick,
  BriefcaseBusiness,
  Users,
  GitCompareArrows,
  ChartPie,
  History,
  BrainCircuit,
  LucideChartCandlestick,
  Newspaper,
  Bell,
  Database,
  Activity,
  FileText,
  ChartNoAxesCombined
} from "lucide-react";

const STRATEGIES = ["Short-term (1-4 weeks)", "Long-term (6-12 months)", "Buy-dip"];
const INTENTS = ["Buy / Add", "Sell / Trim", "Hold / Watch"];
const RANGES = ["1D", "5D", "1W", "1M", "3M", "6M", "YTD", "1Y", "10Y"];
const CHART_TYPES = ["Line", "Candlestick", "Baseline", "Mountain", "Bar"];
const TABS = [
  { key: "Focused Brief", label: "Summary", icon: FileText },
  { key: "Signal", label: "Signal", icon: Activity },
  { key: "Chart", label: "Chart", icon: LucideChartCandlestick },
  { key: "ML Model", label: "ML model", icon: BrainCircuit },
  { key: "Backtest", label: "Backtest", icon: History },
  { key: "Fit with Portfolio", label: "Fit with portfolio", icon: ChartPie },
  { key: "News", label: "News", icon: Newspaper },
  { key: "Correlation", label: "Correlation", icon: GitCompareArrows },
  { key: "Alerts", label: "Alerts", icon: Bell },
  { key: "Data Sources", label: "Data sources", icon: Database },
];
type WorkspaceView = "portfolio" | "watchlist" | "instrument";
type OnboardingBackTarget = "choice" | "dashboard";
type ToastTone = "error" | "success" | "info";
type ToastMessage = { id: number; tone: ToastTone; text: string };
const US_DEFAULT_SYMBOLS = new Set(["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "JPM", "DIS", "BA", "KO", "JNJ"]);
const GUEST_WORKSPACE_KEY = "stockDashboardGuestWorkspace";

export default function Home() {
  const [workflow, setWorkflow] = useState<WorkflowMode>("choice");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("watchlist");
  const [instrumentParent, setInstrumentParent] = useState<"watchlist" | "portfolio">("watchlist");
  const [onboardingRows, setOnboardingRows] = useState<Instrument[]>([]);
  const [onboardingBackTarget, setOnboardingBackTarget] = useState<OnboardingBackTarget>("dashboard");
  const [onboardingBackView, setOnboardingBackView] = useState<WorkspaceView>("watchlist");
  const [initializing, setInitializing] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState<Exchange[]>(["TSX", "NYSE", "NASDAQ"]);
  const [markets, setMarkets] = useState<MarketsPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [landingSignInOpen, setLandingSignInOpen] = useState(false);
  const [guestWorkspaceExists, setGuestWorkspaceExists] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPayload | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Focused Brief");
  const [riskProfile, setRiskProfile] = useState("Balanced");
  const [period, setPeriod] = useState("2y");
  const [interval, setInterval] = useState("1d");
  const [dateRange, setDateRange] = useState("1Y");
  const [chartType, setChartType] = useState("Line");
  const [newTicker, setNewTicker] = useState("");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [compareAnalysis, setCompareAnalysis] = useState<AnalysisPayload | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationPayload | null>(null);
  const [temporarySymbol, setTemporarySymbol] = useState("");
  const [temporaryAnalysis, setTemporaryAnalysis] = useState<AnalysisPayload | null>(null);
  const [tickerSearchResults, setTickerSearchResults] = useState<TickerSuggestion[]>([]);
  const [tickerSearchQuery, setTickerSearchQuery] = useState("");
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [newAlert, setNewAlert] = useState<AlertRule>({
    symbol: "",
    metric: "Price",
    operator: "Crossing Up",
    threshold: 0,
    trigger: "Once only",
    notifications: ["In-app", "Toast"],
  });

  const activeSymbols = useMemo(
    () => Array.from(new Set(instruments.filter((item) => item.active !== false).map((item) => cleanSymbol(item.symbol)).filter(Boolean))),
    [instruments],
  );
  const visibleSymbols = useMemo(
    () => activeSymbols.filter((symbol) => symbolMatchesMarkets(symbol, selectedMarkets, markets)),
    [activeSymbols, selectedMarkets, markets],
  );
  const primaryExchange = selectedMarkets.length === 1 ? selectedMarkets[0] : "Mixed";
  const selectedInstrument = instruments.find((item) => cleanSymbol(item.symbol) === cleanSymbol(selectedSymbol));
  const compareOptions = activeSymbols.filter((symbol) => symbol !== selectedSymbol);
  const focusedAnalysisRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const storedToken = getAccessToken();
    const storedUser = window.localStorage.getItem("stockDashboardUser");
    setGuestWorkspaceExists(loadGuestInstruments().length > 0);
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      setUser(JSON.parse(storedUser) as User);
      setWorkspaceView("portfolio");
    } else {
      setWorkspaceView("watchlist");
    }
    getMarkets()
      .then((payload) => {
        if (!cancelled) setMarkets(payload);
      })
      .catch((error) => reportError(error, "Could not load market options."))
      .finally(() => {
        if (!cancelled) {
          setWorkflow(storedToken || storedUser ? "dashboard" : "choice");
          setInitializing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (workflow === "dashboard") {
      refreshWorkspace();
    }
  }, [workflow, token]);

  useEffect(() => {
    if (!selectedSymbol) return;
    void loadFocusedAnalysis(selectedSymbol);
  }, [selectedSymbol, period, interval, riskProfile, dateRange, selectedInstrument?.intent, selectedInstrument?.strategy]);

  useEffect(() => {
    if (!compareSymbol) {
      setCompareAnalysis(null);
      return;
    }
    void loadCompareAnalysis(compareSymbol);
  }, [compareSymbol, period, interval, riskProfile, dateRange]);

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
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [newTicker, selectedMarkets]);

  useEffect(() => {
    if (activeTab !== "Correlation" || activeSymbols.length < 2) return;
    const params = new URLSearchParams({ period: effectivePeriod(dateRange, period), interval: effectiveInterval(dateRange, interval) });
    getCorrelation(activeSymbols.slice(0, 8), params)
      .then(setCorrelation)
      .catch((error) => reportError(error, "Could not load correlation."));
  }, [activeTab, activeSymbols, dateRange, period, interval]);

  function showToast(text: string, tone: ToastTone = "error") {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => dismissToast(id), 5500);
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id));
  }

  function reportError(error: unknown, fallback: string) {
    showToast(error instanceof Error ? error.message : fallback, "error");
  }

  function openSignIn() {
    setLandingSignInOpen(true);
    setWorkflow("choice");
  }

  function openGuestWorkspace() {
    if (guestWorkspaceExists) {
      setWorkflow("dashboard");
      return;
    }
    startOnboarding("Watching", [emptyInstrument("Watching")], "choice", "watchlist");
  }

  async function refreshWorkspace() {
    setAppLoading(true);
    try {
      if (!token) {
        const localInstruments = loadGuestInstruments();
        const localAlerts = loadGuestAlerts();
        setGuestWorkspaceExists(localInstruments.length > 0);
        setInstruments(localInstruments);
        setAlerts(localAlerts);
        setPortfolio(null);
        if (!selectedSymbol && localInstruments.length) setSelectedSymbol(cleanSymbol(localInstruments[0].symbol));
        setWorkspaceView((current) => current === "instrument" ? current : "watchlist");
        return;
      }
      const workspace = await getWorkspace(token);
      setInstruments(workspace.instruments);
      setAlerts(workspace.alerts);
      if (!selectedSymbol && workspace.symbols.length) setSelectedSymbol(workspace.symbols[0]);
      try {
        setPortfolio(await getPortfolio(token));
        setWorkspaceView((current) => current === "instrument" ? current : "portfolio");
      } catch {
        setPortfolio(null);
      }
    } catch (error) {
      reportError(error, "Could not load workspace.");
    } finally {
      setAppLoading(false);
    }
  }

  async function signIn() {
    setAppLoading(true);
    try {
      const result = await login(loginName, password);
      setToken(result.access_token);
      setUser(result.user);
      setAccessToken(result.access_token);
      window.localStorage.setItem("stockDashboardUser", JSON.stringify(result.user));
      showToast(`Signed in as ${result.user.name}.`, "success");
      setWorkspaceView("portfolio");
      setWorkflow("dashboard");
    } catch (error) {
      reportError(error, "Sign-in failed.");
    } finally {
      setAppLoading(false);
    }
  }

  function signOut() {
    setToken(null);
    setUser(null);
    setPortfolio(null);
    clearAccessToken();
    window.localStorage.removeItem("stockDashboardUser");
    setWorkspaceView("watchlist");
    setWorkflow("choice");
  }

  function startOnboarding(
    role: "Watching" | "Trading",
    rows: Instrument[] = [emptyInstrument(role)],
    backTarget: OnboardingBackTarget = "dashboard",
    backView: WorkspaceView = role === "Trading" ? "portfolio" : "watchlist",
  ) {
    setOnboardingRows(rows);
    setOnboardingBackTarget(backTarget);
    setOnboardingBackView(backView);
    setWorkflow(role === "Trading" ? "portfolio" : "watchlist");
  }

  function backFromOnboarding() {
    setOnboardingRows([]);
    if (onboardingBackTarget === "choice") {
      setWorkflow("choice");
      return;
    }
    setWorkflow("dashboard");
    setWorkspaceView(user ? onboardingBackView : "watchlist");
  }

  async function submitOnboarding(role: "Watching" | "Trading") {
    setAppLoading(true);
    try {
      const rows = onboardingRows.filter((item) => cleanSymbol(item.symbol)).map((item) => ({
        ...item,
        symbol: cleanSymbol(item.symbol),
        book_cost: (Number(item.average_cost) || 0) * (Number(item.shares) || 0),
      }));
      if (role === "Trading") {
        if (!token) throw new Error("Sign in is required for portfolio monitoring.");
        const result = await savePortfolio(token, primaryExchange, rows);
        setInstruments(result.instruments);
        setPortfolio(result.portfolio);
      } else if (!token) {
        saveGuestInstruments(rows);
        setGuestWorkspaceExists(rows.length > 0);
        setInstruments(rows);
        if (rows[0]?.symbol) setSelectedSymbol(cleanSymbol(rows[0].symbol));
        showToast("Guest watchlist saved locally in this browser. Sign in to save it to your account.", "info");
      } else {
        const result = await saveWatchlist(token, primaryExchange, rows);
        setInstruments(result.workspace.instruments);
      }
      setOnboardingRows([]);
      setWorkflow("dashboard");
      setWorkspaceView(role === "Trading" ? "portfolio" : "watchlist");
    } catch (error) {
      reportError(error, "Could not save onboarding.");
    } finally {
      setAppLoading(false);
    }
  }

  async function loadFocusedAnalysis(symbol: string) {
    const requestId = focusedAnalysisRequest.current + 1;
    focusedAnalysisRequest.current = requestId;
    const requestedSymbol = cleanSymbol(symbol);
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const params = new URLSearchParams({
        period: effectivePeriod(dateRange, period),
        interval: effectiveInterval(dateRange, interval),
        intent: String(selectedInstrument?.intent || "Hold / Watch"),
        strategy: String(selectedInstrument?.strategy || "Buy-dip"),
        risk_profile: riskProfile,
      });
      const result = await getAnalysis(requestedSymbol, params);
      if (focusedAnalysisRequest.current !== requestId) return;
      setAnalysis(result);
      if (!result.ok) showToast(result.sourceStatus || `No Yahoo Finance data returned for ${requestedSymbol}.`, "error");
    } catch (error) {
      if (focusedAnalysisRequest.current !== requestId) return;
      reportError(error, "Could not load instrument analysis.");
    } finally {
      if (focusedAnalysisRequest.current === requestId) setAnalysisLoading(false);
    }
  }

  async function loadCompareAnalysis(symbol: string) {
    try {
      const params = new URLSearchParams({
        period: effectivePeriod(dateRange, period),
        interval: effectiveInterval(dateRange, interval),
        risk_profile: riskProfile,
      });
      setCompareAnalysis(await getAnalysis(cleanSymbol(symbol), params));
    } catch (error) {
      reportError(error, "Could not load comparison analysis.");
      setCompareAnalysis(null);
    }
  }

  async function loadTemporaryComparison() {
    if (!temporarySymbol.trim()) return;
    setAppLoading(true);
    try {
      const params = new URLSearchParams({
        period: effectivePeriod(dateRange, period),
        interval: effectiveInterval(dateRange, interval),
        risk_profile: riskProfile,
      });
      setTemporaryAnalysis(await getAnalysis(cleanSymbol(temporarySymbol), params));
    } catch (error) {
      reportError(error, "Could not load temporary comparison.");
    } finally {
      setAppLoading(false);
    }
  }

  async function promoteTemporary(role: "Watching" | "Trading") {
    if (!temporaryAnalysis?.symbol) return;
    const promoted: Instrument = {
      symbol: temporaryAnalysis.symbol,
      role,
      active: true,
      intent: "Hold / Watch",
      strategy: "Buy-dip",
      watch_reason: role === "Watching" ? "Temporary comparison promoted to watchlist" : "",
      purchase_date: role === "Trading" ? today() : "",
      average_cost: 0,
      book_cost: 0,
    };
    if (role === "Trading") {
      setWorkflow("portfolio");
    }
    setInstruments((current) => [...current.filter((item) => item.symbol !== promoted.symbol), promoted]);
  }

  async function persistInstruments(nextRows: Instrument[], successMessage?: string) {
    if (!token) {
      saveGuestInstruments(nextRows);
      setGuestWorkspaceExists(nextRows.length > 0);
      setInstruments(nextRows);
      if (successMessage) showToast(`${successMessage} Saved locally in this browser only.`, "info");
      return;
    }
    setAppLoading(true);
    try {
      const result = await updateInstruments(token, nextRows);
      setInstruments(result.instruments);
      if (successMessage) showToast(successMessage, "success");
    } catch (error) {
      reportError(error, "Could not save instruments.");
    } finally {
      setAppLoading(false);
    }
  }

  async function saveEditedInstruments() {
    await persistInstruments(instruments.map((item) => ({ ...item, symbol: cleanSymbol(item.symbol) })), "Instrument changes saved.");
  }

  async function updateSelectedInstrumentPreferences(patch: Partial<Instrument>) {
    if (!selectedSymbol) return;
    const normalized = cleanSymbol(selectedSymbol);
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
    const next = [
      ...instruments.filter((item) => cleanSymbol(item.symbol) !== symbol),
      { ...emptyInstrument("Watching"), symbol },
    ];
    setInstruments(next);
    setSelectedSymbol(symbol);
    setNewTicker("");
    setTickerSearchResults([]);
    setTickerSearchQuery("");
    void persistInstruments(next, `${symbol} added to the watchlist.`);
  }

  function openInstrument(symbol: string, source?: "watchlist" | "portfolio") {
    setSelectedSymbol(symbol);
    setInstrumentParent(source || (workspaceView === "portfolio" ? "portfolio" : "watchlist"));
    setWorkspaceView("instrument");
  }

  function openNewHolding(symbol: unknown = "") {
    const normalizedSymbol = typeof symbol === "string" ? cleanSymbol(symbol) : "";
    startOnboarding("Trading", [{
      ...emptyInstrument("Trading"),
      symbol: normalizedSymbol,
      intent: "Hold / Watch",
      strategy: "Buy-dip",
    }], "dashboard", workspaceView);
  }

  function promoteWatchlistToHolding(symbol: string) {
    openNewHolding(symbol);
  }

  function removeTickerFromWorkspace(symbol: string) {
    const normalized = cleanSymbol(symbol);
    const next = instruments.filter((item) => cleanSymbol(item.symbol) !== normalized);
    setInstruments(next);
    if (selectedSymbol === normalized) setSelectedSymbol(next.find((item) => item.active !== false)?.symbol || "");
      void persistInstruments(next, `${normalized} removed from the workspace.`);
  }

  async function submitAlert() {
    const target = newAlert.symbol || selectedSymbol;
    if (!target) return;
    if (!token) {
      const alert = { ...newAlert, id: newAlert.id || `local-${Date.now()}`, symbol: target };
      const nextAlerts = [...alerts.filter((item) => item.id !== alert.id), alert];
      saveGuestAlerts(nextAlerts);
      setAlerts(nextAlerts);
      setAlertModalOpen(false);
      showToast(`Alert created locally for ${target}. Sign in to save alerts to your account.`, "info");
      return;
    }
    setAppLoading(true);
    try {
      const result = await createAlert(token, { ...newAlert, symbol: target });
      setAlerts((current) => [...current, result.alert]);
      setAlertModalOpen(false);
      showToast(`Alert created for ${target}.`, "success");
    } catch (error) {
      reportError(error, "Could not create alert.");
    } finally {
      setAppLoading(false);
    }
  }

  async function removeAlert(alertId: string | undefined) {
    if (!alertId) return;
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
      showToast("Alert deleted.", "success");
    } catch (error) {
      reportError(error, "Could not delete alert.");
    } finally {
      setAppLoading(false);
    }
  }

  if (initializing) {
    return (
      <>
        <ScreenLoader label="Loading workspace" />
        <ToastStack toasts={toasts} dismissToast={dismissToast} />
      </>
    );
  }

  if (workflow === "choice") {
    return (
      <main className="workspace-shell">
        {appLoading && <ScreenLoader label="Processing" />}
        <ToastStack toasts={toasts} dismissToast={dismissToast} />
        <section className="choice-panel">
          <div className="choice-intro">
            <p className="eyebrow">Stock workspace</p>
            <h1>Start with the workflow you need today</h1>
            <p className="muted">Search and analyze tickers as a guest with a browser-local watchlist, or sign in to save watchlists, track holdings, and use premium portfolio dashboards.</p>
            <div className="capability-chips" aria-label="Analysis capabilities">
              {["RSI", "MACD", "ADX", "ML model", "Backtested"].map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="choice-grid">
            <button className="choice-card" onClick={openGuestWorkspace}>
              <span className="choice-icon" aria-hidden="true"> <ChartNoAxesCombined /> </span>
              <small>Research</small>
              <strong>Watchlist</strong>
              <span>Search tickers, run signals, backtests, and ML checks. Stored only in this browser until you sign in.</span>
              <em>{guestWorkspaceExists ? "Open workspace" : "Create workspace"}</em>
            </button>
            <div className="choice-card">
              <span className="choice-icon" aria-hidden="true"><BriefcaseBusiness /></span>
              <small>Full access</small>
              <strong>Portfolio</strong>
              <span>Save watchlists, track holdings, cost basis, P/L, and portfolio-level signals. Premium sign-in required.</span>
              {user ? (
                <button className="primary" onClick={() => {
                  startOnboarding("Trading", [emptyInstrument("Trading")], "choice", "portfolio");
                }}>Continue as {user.username}</button>
              ) : !landingSignInOpen ? (
                <button onClick={() => setLandingSignInOpen(true)}>Sign in</button>
              ) : (
                <div className="signin-form">
                  <input value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="Email or username" />
                  <PasswordField value={password} onChange={setPassword} label="Password" placeholder="Password" />
                  <button className="primary" onClick={signIn}>Sign in</button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (workflow === "watchlist" || workflow === "portfolio") {
    const trading = workflow === "portfolio";
    const exitLabel = onboardingBackTarget === "choice" ? "Back to start" : "Cancel";
    return (
      <main className="workspace-shell">
        {appLoading && <ScreenLoader label="Saving instruments" />}
        <ToastStack toasts={toasts} dismissToast={dismissToast} />
        <section className="onboarding-panel">
          <WorkflowHeader
            title={trading ? "Trading Portfolio Onboarding" : "Watchlist Onboarding"}
            description={trading ? "Enter cost-basis details for each active holding." : "Add the instruments you want to research or monitor."}
            selectedMarkets={selectedMarkets}
            toggleMarket={toggleMarket}
          />
          {trading && !user && (
            <div className="notice">Sign in before creating a trading portfolio. Watchlists can be created without sign-in.</div>
          )}
          <InstrumentEditor
            instruments={onboardingRows.length ? onboardingRows : [emptyInstrument(trading ? "Trading" : "Watching")]}
            setInstruments={setOnboardingRows}
            trading={trading}
            selectedMarkets={selectedMarkets}
          />
          <div className="inline-actions">
            <button onClick={() => setOnboardingRows((rows) => [...rows, emptyInstrument(trading ? "Trading" : "Watching")])}>Add another stock</button>
            <button className="primary" disabled={trading && !token} onClick={() => submitOnboarding(trading ? "Trading" : "Watching")}>
              {trading ? "Create portfolio dashboard" : "Create watchlist dashboard"}
            </button>
            <button onClick={backFromOnboarding}>{exitLabel}</button>
          </div>
        </section>
      </main>
    );
  }

  const watchRows = instruments.filter((item) => item.role !== "Trading" && item.active !== false);
  const portfolioRows = portfolio?.portfolio || [];
  const selectedPortfolioRow = portfolioRows.find((row) => cleanSymbol(row.Symbol) === cleanSymbol(selectedSymbol));

  return (
    <main className="dashboard-shell">
      {appLoading && <ScreenLoader label="Syncing workspace" />}
      <ToastStack toasts={toasts} dismissToast={dismissToast} />
      <TopNav
        user={user}
        activeView={workspaceView === "instrument" ? instrumentParent : workspaceView}
        riskProfile={riskProfile}
        setWorkspaceView={(view) => {
          setWorkspaceView(view);
          if (view !== "instrument") setInstrumentParent(view);
        }}
        signIn={openSignIn}
        signOut={signOut}
      />
      <div className={`dashboard-content ${workspaceView === "watchlist" ? "with-sidebar" : ""}`}>
        {workspaceView === "watchlist" && (
          <DashboardFiltersSidebar
            selectedMarkets={selectedMarkets}
            toggleMarket={toggleMarket}
            newTicker={newTicker}
            setNewTicker={setNewTicker}
            tickerSearchResults={tickerSearchResults}
            addTickerToWorkspace={addTickerToWorkspace}
            removeTickerFromWorkspace={removeTickerFromWorkspace}
            visibleSymbols={visibleSymbols}
            saveEditedInstruments={saveEditedInstruments}
            isSignedIn={Boolean(user)}
            openSignIn={openSignIn}
          />
        )}
        <section className="dashboard-main">
        {workspaceView === "portfolio" && (
          <WorkspacePortfolioDashboard
            payload={portfolio}
            user={user}
            openInstrument={openInstrument}
            openNewHolding={openNewHolding}
            refreshWorkspace={refreshWorkspace}
          />
        )}
        {workspaceView === "watchlist" && (
          <WatchlistDashboard
            watchRows={watchRows}
            watchlistDetails={portfolio?.watchlist || []}
            openInstrument={openInstrument}
            promoteWatchlistToHolding={promoteWatchlistToHolding}
            canPromote={Boolean(user)}
          />
        )}
        {workspaceView === "instrument" && (
          <InstrumentDashboard
            selectedSymbol={selectedSymbol}
            analysis={analysis}
            analysisLoading={analysisLoading}
            selectedInstrument={selectedInstrument}
            selectedPortfolioRow={selectedPortfolioRow}
            parentView={instrumentParent}
            setWorkspaceView={(view) => {
              setWorkspaceView(view);
              setInstrumentParent(view === "portfolio" ? "portfolio" : "watchlist");
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            riskProfile={riskProfile}
            setRiskProfile={setRiskProfile}
            period={period}
            setPeriod={setPeriod}
            interval={interval}
            setInterval={setInterval}
            riskProfiles={Object.keys(markets?.riskProfiles || { Balanced: {} })}
            updateInstrumentPreferences={updateSelectedInstrumentPreferences}
            compareSymbol={compareSymbol}
            setCompareSymbol={setCompareSymbol}
            compareAnalysis={compareAnalysis}
            compareOptions={compareOptions}
            dateRange={dateRange}
            setDateRange={setDateRange}
            chartType={chartType}
            setChartType={setChartType}
            temporarySymbol={temporarySymbol}
            setTemporarySymbol={setTemporarySymbol}
            temporaryAnalysis={temporaryAnalysis}
            loadTemporaryComparison={loadTemporaryComparison}
            promoteTemporary={promoteTemporary}
            alerts={alerts.filter((alert) => alert.symbol === selectedSymbol)}
            newAlert={newAlert}
            setNewAlert={setNewAlert}
            submitAlert={submitAlert}
            selectedSymbolForAlert={selectedSymbol}
            alertModalOpen={alertModalOpen}
            setAlertModalOpen={setAlertModalOpen}
            removeAlert={removeAlert}
            correlation={correlation}
            activeSymbols={activeSymbols}
            syncInstrument={() => selectedSymbol && loadFocusedAnalysis(selectedSymbol)}
          />
        )}
        </section>
      </div>
    </main>
  );
}

function ToastStack({ toasts, dismissToast }: { toasts: ToastMessage[]; dismissToast: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <article className={`toast toast-${toast.tone}`} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}>
          <span>{toast.text}</span>
          <button aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>x</button>
        </article>
      ))}
    </div>
  );
}

function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="screen-loader" role="status" aria-live="polite">
      <div className="loader-box">
        <span className="spinner" />
        <strong>{label}</strong>
      </div>
    </div>
  );
}

function TopNav({ user, activeView, riskProfile, setWorkspaceView, signIn, signOut }: {
  user: User | null;
  activeView: "watchlist" | "portfolio";
  riskProfile: string;
  setWorkspaceView: (view: WorkspaceView) => void;
  signIn: () => void;
  signOut: () => void;
}) {
  const initial = user ? String(user.name || user.username || "U").slice(0, 1).toUpperCase() : "G";
  return (
    <header className="app-topbar">
      <div className="brand-nav">
        <strong>StockSignal</strong>
        <nav aria-label="Primary navigation">
          <button className={activeView === "watchlist" ? "active" : ""} onClick={() => setWorkspaceView("watchlist")}>Watchlist</button>
          <button className={activeView === "portfolio" ? "active" : ""} disabled={!user} onClick={() => setWorkspaceView("portfolio")}>Portfolio</button>
        </nav>
      </div>
      <div className="topbar-user">
        <span className="profile-pill">{riskProfile} profile</span>
        <button className="avatar-button" onClick={user ? signOut : signIn} title={user ? "Sign out" : "Sign in"}>{initial}</button>
      </div>
    </header>
  );
}

function DashboardFiltersSidebar(props: {
  selectedMarkets: Exchange[];
  toggleMarket: (value: Exchange) => void;
  newTicker: string;
  setNewTicker: (value: string) => void;
  tickerSearchResults: TickerSuggestion[];
  addTickerToWorkspace: () => void;
  removeTickerFromWorkspace: (symbol: string) => void;
  visibleSymbols: string[];
  saveEditedInstruments: () => void;
  isSignedIn: boolean;
  openSignIn: () => void;
}) {
  return (
    <aside className="filter-sidebar">
      <div className="sidebar-group">
        <span>Exchange</span>
        <div className="market-toggle-row">
          {(["TSX", "NYSE", "NASDAQ"] as Exchange[]).map((market) => (
            <button className={props.selectedMarkets.includes(market) ? "active" : ""} key={market} onClick={() => props.toggleMarket(market)}>{market}</button>
          ))}
        </div>
      </div>
      <div className="sidebar-group">
        <span>Add ticker or company</span>
        <div className="sidebar-add">
          <div className="ticker-input-wrap">
            <input
              autoComplete="off"
              value={props.newTicker}
              placeholder="e.g. RY.TO or Royal Bank"
              onChange={(event) => props.setNewTicker(event.target.value)}
            />
            <TickerSuggestionList
              query={props.newTicker}
              results={props.tickerSearchResults}
              onSelect={(symbol) => props.setNewTicker(symbol)}
            />
          </div>
          <button className="primary" onClick={props.addTickerToWorkspace}>Add</button>
        </div>
      </div>
      <p className="sidebar-note">
        {props.isSignedIn
          ? "History, interval, and risk profile live on each ticker's Signal page. Save writes this watchlist to your account."
          : "Guest watchlists are local to this browser. Sign in to save them to an account and unlock portfolio dashboards."}
      </p>
      <div className="sidebar-group">
        <span>Current watchlist</span>
        <div className="watch-chip-list">
          {props.visibleSymbols.map((symbol) => (
            <span className="watch-chip" key={symbol}>
              {symbol}
              <button aria-label={`Remove ${symbol}`} onClick={() => props.removeTickerFromWorkspace(symbol)}>x</button>
            </span>
          ))}
        </div>
        <button onClick={props.isSignedIn ? props.saveEditedInstruments : props.openSignIn}>{props.isSignedIn ? "Save watchlist" : "Sign in to save"}</button>
      </div>
    </aside>
  );
}

function WorkspacePortfolioDashboard(props: {
  payload: PortfolioPayload | null;
  user: User | null;
  openInstrument: (symbol: string, source?: "watchlist" | "portfolio") => void;
  openNewHolding: () => void;
  refreshWorkspace: () => void;
}) {
  const portfolioRows = props.payload?.portfolio || [];
  if (!props.user) {
    return (
      <section className="dashboard-header hero-panel">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>Sign in to monitor trading holdings.</h1>
          <p className="muted">Guest mode is limited to a watchlist. Portfolio cost basis, holdings, alerts, and P/L are saved per signed-in user.</p>
        </div>
      </section>
    );
  }
  return (
    <div className="workspace-dashboard">
      <section className="portfolio-hero">
        <div>
          <h1>Portfolio</h1>
          <p className="muted">Synced just now · {portfolioRows.length} {portfolioRows.length === 1 ? "holding" : "holdings"}</p>
        </div>
        <div className="header-actions">
          <button onClick={props.refreshWorkspace}>Sync Workspace</button>
          <button className="primary" onClick={() => props.openNewHolding()}>Add holding</button>
        </div>
      </section>
      {props.payload && <PortfolioMetrics payload={props.payload} />}
      {!portfolioRows.length && (
        <section className="empty-state">
          <h2>No holdings yet</h2>
          <p className="muted">Add a holding or promote a watchlist ticker to see total invested, market value, allocation, P/L, sector exposure, and portfolio-level execution plans.</p>
          <button className="primary" onClick={() => props.openNewHolding()}>Create first holding</button>
        </section>
      )}
      {!!portfolioRows.length && (
        <>
          <section className="portfolio-visual-grid">
            <AllocationChart rows={portfolioRows} />
            <ReturnChart rows={portfolioRows} />
          </section>
          <section className="surface-section">
            <div className="section-heading">
              <div><p className="eyebrow">Holdings</p><h2>Trading positions</h2></div>
            </div>
            <HoldingCards rows={portfolioRows} openInstrument={(symbol) => props.openInstrument(symbol, "portfolio")} />
          </section>
          <section className="portfolio-visual-grid">
            <div className="surface-section">
              <h2>Category / sector exposure</h2>
              <TablePanel rows={props.payload?.categoryExposure || []} />
            </div>
            <div className="inference-card">
              <h2>Portfolio inference notes</h2>
              <ul>{(props.payload?.notes || []).map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          </section>
          <section className="surface-section">
            <div className="section-heading">
              <div><p className="eyebrow">Execution</p><h2>Plans across holdings</h2></div>
            </div>
            <ExecutionPlanList rows={props.payload?.executionPlans || []} openInstrument={(symbol) => props.openInstrument(symbol, "portfolio")} />
          </section>
        </>
      )}
    </div>
  );
}

function WatchlistDashboard(props: {
  watchRows: Instrument[];
  watchlistDetails: Record<string, unknown>[];
  openInstrument: (symbol: string, source?: "watchlist" | "portfolio") => void;
  promoteWatchlistToHolding: (symbol: string) => void;
  canPromote: boolean;
}) {
  return (
    <div className="workspace-dashboard">
      <section className="dashboard-header hero-panel">
        <div>
          <p className="eyebrow">Watchlist Dashboard</p>
          <h1>Research watchlist</h1>
          <p className="muted">Watchlist instruments stay separate from trading holdings. Open a ticker for signal, chart, ML, news, backtest, and alert context.</p>
        </div>
      </section>
      <section className="surface-section">
        <WatchlistRows
          rows={props.watchRows}
          details={props.watchlistDetails}
          openInstrument={props.openInstrument}
          promoteWatchlistToHolding={props.promoteWatchlistToHolding}
          canPromote={props.canPromote}
        />
      </section>
    </div>
  );
}

function InstrumentDashboard(props: {
  selectedSymbol: string;
  analysis: AnalysisPayload | null;
  analysisLoading: boolean;
  selectedInstrument?: Instrument;
  selectedPortfolioRow?: Record<string, unknown>;
  parentView: "watchlist" | "portfolio";
  setWorkspaceView: (value: WorkspaceView) => void;
  activeTab: string;
  setActiveTab: (value: string) => void;
  riskProfile: string;
  setRiskProfile: (value: string) => void;
  period: string;
  setPeriod: (value: string) => void;
  interval: string;
  setInterval: (value: string) => void;
  riskProfiles: string[];
  updateInstrumentPreferences: (patch: Partial<Instrument>) => void;
  compareSymbol: string;
  setCompareSymbol: (value: string) => void;
  compareAnalysis: AnalysisPayload | null;
  compareOptions: string[];
  dateRange: string;
  setDateRange: (value: string) => void;
  chartType: string;
  setChartType: (value: string) => void;
  temporarySymbol: string;
  setTemporarySymbol: (value: string) => void;
  temporaryAnalysis: AnalysisPayload | null;
  loadTemporaryComparison: () => void;
  promoteTemporary: (role: "Watching" | "Trading") => void;
  alerts: AlertRule[];
  newAlert: AlertRule;
  setNewAlert: (value: AlertRule) => void;
  submitAlert: () => void;
  selectedSymbolForAlert: string;
  alertModalOpen: boolean;
  setAlertModalOpen: (value: boolean) => void;
  removeAlert: (alertId: string | undefined) => void;
  correlation: CorrelationPayload | null;
  activeSymbols: string[];
  syncInstrument: () => void;
}) {
  const parentLabel = props.parentView === "portfolio" ? "Portfolio" : "Watchlist";
  const portfolioRow = props.selectedPortfolioRow;
  const currency = currencyForSymbol(props.selectedSymbol);
  const unrealized = Number(portfolioRow?.["Since Purchase $"]);
  return (
    <>
      <header className="instrument-hero">
        <div>
          <div className="breadcrumb">
            <button onClick={() => props.setWorkspaceView(props.parentView)}>{parentLabel}</button>
            <span>/</span>
            <span>{props.selectedSymbol || "Instrument"}</span>
          </div>
          <h1>{props.selectedSymbol || "Select a stock"}</h1>
          <p className="muted">{props.analysis?.summary?.subtitle || "Summary, signals, charts, alerts, ML, news, backtest, and data sources for the selected instrument."}</p>
        </div>
        <div className="header-actions">
          <button onClick={props.syncInstrument}>Sync Instrument</button>
          <button className="primary" onClick={() => {
            props.setNewAlert({ ...props.newAlert, symbol: props.selectedSymbolForAlert || props.selectedSymbol });
            props.setAlertModalOpen(true);
          }}>+ Alert</button>
        </div>
      </header>
      {props.parentView === "portfolio" && portfolioRow && (
        <section className="instrument-metrics">
          <Metric label="Quantity" value={`${formatCell(portfolioRow.Shares)} shares`} />
          <Metric label="Avg cost" value={money(Number(portfolioRow["Avg Cost"]), currency)} />
          <Metric label="Market value" value={money(Number(portfolioRow["Market Value"]), currency)} />
          <Metric label="Unrealized P/L" value={money(unrealized, currency)} detail={percent(Number(portfolioRow["Since Purchase %"]))} />
        </section>
      )}
      <section className="instrument-controls">
        <label>Risk profile<select value={props.riskProfile} onChange={(event) => props.setRiskProfile(event.target.value)}>{props.riskProfiles.map((profile) => <option key={profile}>{profile}</option>)}</select></label>
        <label>History<select value={props.period} onChange={(event) => props.setPeriod(event.target.value)}>{["6mo", "1y", "2y", "5y", "10y"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Interval<select value={props.interval} onChange={(event) => props.setInterval(event.target.value)}>{["5m", "15m", "1h", "1d", "1wk"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Intent<select value={props.selectedInstrument?.intent || "Hold / Watch"} onChange={(event) => props.updateInstrumentPreferences({ intent: event.target.value })}>{INTENTS.map((intent) => <option key={intent}>{intent}</option>)}</select></label>
        <label>Strategy<select value={props.selectedInstrument?.strategy || "Buy-dip"} onChange={(event) => props.updateInstrumentPreferences({ strategy: event.target.value })}>{STRATEGIES.map((strategy) => <option key={strategy}>{strategy}</option>)}</select></label>
      </section>
      <div className="instrument-analysis">
        <nav className="instrument-tabs" aria-label="Instrument sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={props.activeTab === tab.key ? "active" : ""} key={tab.key} onClick={() => props.setActiveTab(tab.key)}>
                <Icon size={16} strokeWidth={1.8} />  <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <section className="tab-panel">
          {props.analysisLoading && <div className="notice">Loading analysis...</div>}
          {props.activeTab === "Focused Brief" && props.analysis?.summary && (
            <div className="brief-html" dangerouslySetInnerHTML={{ __html: props.analysis.summary.html }} />
          )}
          {props.activeTab === "Signal" && <SignalPanel analysis={props.analysis} />}
          {props.activeTab === "Chart" && (
            <ChartPanel
              analysis={props.analysis}
              compareSymbol={props.compareSymbol}
              setCompareSymbol={props.setCompareSymbol}
              compareAnalysis={props.compareAnalysis}
              compareOptions={props.compareOptions}
              dateRange={props.dateRange}
              setDateRange={props.setDateRange}
              chartType={props.chartType}
              setChartType={props.setChartType}
              temporarySymbol={props.temporarySymbol}
              setTemporarySymbol={props.setTemporarySymbol}
              temporaryAnalysis={props.temporaryAnalysis}
              loadTemporaryComparison={props.loadTemporaryComparison}
              promoteTemporary={props.promoteTemporary}
            />
          )}
          {props.activeTab === "Alerts" && (
            <AlertsPanel
              alerts={props.alerts}
              newAlert={props.newAlert}
              setNewAlert={props.setNewAlert}
              submitAlert={props.submitAlert}
              selectedSymbol={props.selectedSymbolForAlert}
              modalOpen={props.alertModalOpen}
              setModalOpen={props.setAlertModalOpen}
              removeAlert={props.removeAlert}
            />
          )}
          {props.activeTab === "ML Model" && <MlPanel analysis={props.analysis} />}
          {props.activeTab === "Correlation" && <CorrelationPanel payload={props.correlation} symbols={props.activeSymbols} />}
          {props.activeTab === "News" && <TablePanel rows={props.analysis?.news || []} />}
          {props.activeTab === "Backtest" && <BacktestPanel analysis={props.analysis} />}
          {props.activeTab === "Fit with Portfolio" && <FitWithPortfolioPanel analysis={props.analysis} portfolioRow={portfolioRow} parentView={props.parentView} />}
          {props.activeTab === "Data Sources" && <JsonPanel title="Data Sources" data={{ sourceStatus: props.analysis?.sourceStatus, snapshot: props.analysis?.snapshot }} />}
        </section>
      </div>
    </>
  );
}

function HoldingCards({ rows, openInstrument }: { rows: Record<string, unknown>[]; openInstrument: (symbol: string) => void }) {
  return (
    <div className="holding-grid">
      {rows.map((row) => {
        const symbol = String(row.Symbol || "");
        const currency = currencyForSymbol(symbol);
        return (
          <button className="holding-card" key={symbol} onClick={() => openInstrument(symbol)}>
            <span className="eyebrow">{symbol}</span>
            <strong>{money(Number(row["Market Value"]), currency)}</strong>
            <small>{percent(Number(row["Portfolio %"]))} of portfolio</small>
            <small>Today: {money(Number(row["Today $"]), currency)} · Since purchase: {money(Number(row["Since Purchase $"]), currency)}</small>
          </button>
        );
      })}
    </div>
  );
}

function WatchlistRows({ rows, details = [], openInstrument, promoteWatchlistToHolding, canPromote }: {
  rows: Instrument[];
  details?: Record<string, unknown>[];
  openInstrument: (symbol: string, source?: "watchlist" | "portfolio") => void;
  promoteWatchlistToHolding: (symbol: string) => void;
  canPromote: boolean;
}) {
  if (!rows.length) return <p className="muted">No watchlist instruments yet.</p>;
  const detailBySymbol = new Map(details.map((item) => [cleanSymbol(item.Symbol), item]));
  return (
    <div className="watchlist-table">
      {rows.map((row) => {
        const symbol = cleanSymbol(row.symbol);
        const detail = detailBySymbol.get(symbol);
        const price = Number(detail?.["Current Price"]);
        const change = Number(detail?.["Today %"]);
        const badge = signalLabelFromMove(change);
        return (
          <article className="watchlist-item" key={symbol}>
            <button className="watchlist-symbol" onClick={() => openInstrument(symbol, "watchlist")}>
              <strong>{symbol}</strong>
              <span>{String(detail?.Category || row.watch_reason || row.strategy || "Research watchlist")}</span>
            </button>
            <strong>{Number.isFinite(price) ? money(price, currencyForSymbol(symbol)) : "Sync pending"}</strong>
            <span className={change >= 0 ? "gain-text" : "loss-text"}>{Number.isFinite(change) ? percent(change) : "n/a"}</span>
            <MiniSparkline tone={change >= 0 ? "gain" : "loss"} />
            <span className={`signal-badge ${badge.toLowerCase()}`}>{badge}</span>
            <button onClick={() => openInstrument(symbol, "watchlist")}>View signal</button>
            <button disabled={!canPromote} onClick={() => promoteWatchlistToHolding(symbol)}>Add to portfolio</button>
          </article>
        );
      })}
    </div>
  );
}

function AllocationChart({ rows }: { rows: Record<string, unknown>[] }) {
  const slices = allocationSlices(rows);
  return (
    <section className="surface-section">
      <h2>Allocation by instrument</h2>
      <div className="allocation-donut-wrap">
        <div className="allocation-donut" style={{ background: donutGradient(slices) }} aria-label="Allocation donut" />
        <div className="allocation-legend">
          {slices.map((slice) => (
            <span key={slice.symbol}><i style={{ background: slice.color }} />{slice.symbol} {percent(slice.value)}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReturnChart({ rows }: { rows: Record<string, unknown>[] }) {
  const max = Math.max(...rows.map((row) => Math.abs(Number(row["Since Purchase $"]) || 0)), 1);
  return (
    <section className="surface-section">
      <h2>Return / loss by instrument</h2>
      <div className="return-bars">
        {rows.map((row) => {
          const value = Number(row["Since Purchase $"]) || 0;
          return (
            <div key={String(row.Symbol)}>
              <span>{String(row.Symbol)}</span>
              <div><i className={value >= 0 ? "gain" : "loss"} style={{ width: `${Math.max(4, Math.abs(value) / max * 100)}%` }} /></div>
              <strong>{money(value, currencyForSymbol(String(row.Symbol)))}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MiniSparkline({ tone }: { tone: "gain" | "loss" }) {
  const points = tone === "gain"
    ? "0,24 18,20 36,21 54,14 72,17 90,9 108,11"
    : "0,9 18,12 36,10 54,17 72,16 90,22 108,24";
  return (
    <svg className={`mini-sparkline ${tone}`} viewBox="0 0 108 32" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function signalLabelFromMove(value: number) {
  if (!Number.isFinite(value)) return "Neutral";
  if (value > 0.004) return "Bullish";
  if (value < -0.004) return "Bearish";
  return "Neutral";
}

function allocationSlices(rows: Record<string, unknown>[]) {
  const colors = ["#2f7ed8", "#ef6c35", "#22b686", "#f2ac00", "#8b5cf6", "#0f5f7a"];
  return rows.map((row, index) => ({
    symbol: String(row.Symbol || "n/a"),
    value: Math.max(0, Number(row["Portfolio %"]) || 0),
    color: colors[index % colors.length],
  }));
}

function donutGradient(slices: { value: number; color: string }[]) {
  if (!slices.length) return "#e5e7eb";
  let cursor = 0;
  const parts = slices.map((slice) => {
    const start = cursor;
    const end = cursor + slice.value * 100;
    cursor = end;
    return `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

function WorkflowHeader({ title, description, selectedMarkets, toggleMarket }: {
  title: string;
  description: string;
  selectedMarkets: Exchange[];
  toggleMarket: (value: Exchange) => void;
}) {
  return (
    <header className="workflow-header">
      <div>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="segmented">
        {(["TSX", "NYSE", "NASDAQ"] as Exchange[]).map((item) => (
          <button className={selectedMarkets.includes(item) ? "active" : ""} key={item} onClick={() => toggleMarket(item)}>{item}</button>
        ))}
      </div>
    </header>
  );
}

function InstrumentEditor({ instruments, setInstruments, trading, selectedMarkets = ["TSX", "NYSE", "NASDAQ"] }: {
  instruments: Instrument[];
  setInstruments: (value: Instrument[] | ((current: Instrument[]) => Instrument[])) => void;
  trading: boolean;
  selectedMarkets?: Exchange[];
}) {
  return (
    <div className="editor-grid">
      {instruments.map((item, index) => (
        <article className="instrument-row" key={index}>
          <TickerInput
            value={item.symbol}
            selectedMarkets={selectedMarkets}
            onChange={(symbol) => updateRow(setInstruments, index, { symbol })}
          />
          {trading && <input aria-label="Purchase date" type="date" value={item.purchase_date || today()} onChange={(event) => updateRow(setInstruments, index, { purchase_date: event.target.value })} />}
          {trading && <input aria-label="Average purchase price" type="number" min="0" step="0.01" value={item.average_cost || ""} placeholder="Avg price" onChange={(event) => { const average_cost = Number(event.target.value); updateRow(setInstruments, index, { average_cost, book_cost: average_cost * (item.shares || 0) }); } } />}
          {trading && <input aria-label="Shares" type="number" min="0" step="1" value={item.shares || ""} placeholder="Shares" onChange={(event) => { const shares = Number(event.target.value); updateRow(setInstruments, index, { shares, book_cost: (item.average_cost || 0) * shares }); } } />}
          {trading && <div className="computed-cost"><span>Book cost</span><strong>{money((Number(item.average_cost) || 0) * (Number(item.shares) || 0), currencyForSymbol(item.symbol))}</strong></div>}
          {!trading && <input aria-label="Watch reason" value={item.watch_reason || ""} placeholder="Reason for watchlist" onChange={(event) => updateRow(setInstruments, index, { watch_reason: event.target.value })} />}
          <select value={item.intent || "Hold / Watch"} onChange={(event) => updateRow(setInstruments, index, { intent: event.target.value })}>{INTENTS.map((intent) => <option key={intent}>{intent}</option>)}</select>
          <select value={item.strategy || "Buy-dip"} onChange={(event) => updateRow(setInstruments, index, { strategy: event.target.value })}>{STRATEGIES.map((strategy) => <option key={strategy}>{strategy}</option>)}</select>
          <span className="symbol-remove" role="button" onClick={() => setInstruments((rows) => {
            const next = rows.filter((_, rowIndex) => rowIndex !== index);
            return next.length ? next : [emptyInstrument(trading ? "Trading" : "Watching")];
          })}>X</span>
        </article>
      ))}
    </div>
  );
}

function TickerInput({ value, selectedMarkets, onChange }: {
  value: string;
  selectedMarkets: Exchange[];
  onChange: (symbol: string) => void;
}) {
  const [results, setResults] = useState<TickerSuggestion[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchTickers(query, selectedMarkets)
        .then((payload) => {
          if (!cancelled) setResults(payload.results);
        })
        .catch(() => setResults([]));
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, selectedMarkets]);

  return (
    <div className="ticker-input-wrap">
      <input
        aria-label="Symbol"
        autoComplete="off"
        value={value}
        placeholder="Ticker or company"
        onChange={(event) => onChange(event.target.value)}
      />
      <TickerSuggestionList
        query={value}
        results={results}
        onSelect={(symbol) => {
          onChange(symbol);
          setResults([]);
        }}
      />
    </div>
  );
}

function TickerSuggestionList({ query, results, onSelect }: {
  query: string;
  results: TickerSuggestion[];
  onSelect: (symbol: string) => void;
}) {
  if (!query.trim() || !results.length) return null;
  return (
    <div className="ticker-suggestions" role="listbox">
      {results.slice(0, 6).map((item) => (
        <button
          key={`${item.symbol}-${item.market}`}
          role="option"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item.symbol);
          }}
          type="button"
        >
          <strong>{item.symbol}</strong>
          <span>{item.name || item.label}</span>
          <em>{item.market} · {item.currency}</em>
        </button>
      ))}
    </div>
  );
}

function PortfolioMetrics({ payload }: { payload: PortfolioPayload }) {
  const metrics = payload.metrics;
  const currency = metrics.currency === "MIXED" ? "USD" : metrics.currency || "USD";
  return (
    <div className="metric-grid">
      <Metric label="Total invested" value={money(metrics.totalInvested, currency)} />
      <Metric label="Market value" value={money(metrics.marketValue, currency)} />
      <Metric label="Total return" value={money(metrics.sincePurchase, currency)} detail={percent(metrics.sincePurchasePct)} />
      <Metric label="Today P/L" value={money(metrics.todayPl, currency)} />
      <Metric label="Week P/L" value={money(metrics.weekPl, currency)} />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function SignalPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  const signal = analysis?.signal || {};
  const rows = analysis?.strategyRows || [];
  return (
    <div className="split-grid">
      <section className="execution-card">
        <p className="eyebrow">Execution Plan</p>
        <h2>{String(signal.action || "No signal")}</h2>
        <dl>
          <div><dt>Setup</dt><dd>{String(signal.setup || "n/a")}</dd></div>
          <div><dt>Entry zone</dt><dd>{String(signal.entry_zone || "n/a")}</dd></div>
          <div><dt>Exit zone</dt><dd>{String(signal.exit_zone || "n/a")}</dd></div>
          <div><dt>Risk</dt><dd>{String(signal.risk_note || "n/a")}</dd></div>
        </dl>
      </section>
      <section>
        <TablePanel rows={rows} />
      </section>
    </div>
  );
}

function ChartTypeMenu({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = [
    { label: "Line", value: "Line", icon: "⌁" },
    { label: "Candle", value: "Candlestick", icon: "▥" },
    { label: "Baseline", value: "Baseline", icon: "↕" },
    { label: "Mountain", value: "Mountain", icon: "▰" },
    { label: "Bar", value: "Bar", icon: "▮" },
  ];
  const selected = options.find((item) => item.value === value) || options[0];
  return (
    <div className="chart-type-menu">
      <button className="chart-type-trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{selected.icon}</span>
        <span>{selected.label}</span>
        <span aria-hidden="true">⌃</span>
      </button>
      {open && (
        <div className="chart-type-options" role="menu">
          {options.map((item) => (
            <button
              className={item.value === value ? "active" : ""}
              key={item.value}
              role="menuitem"
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.value === value && <strong>✓</strong>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartPanel(props: {
  analysis: AnalysisPayload | null;
  compareSymbol: string;
  setCompareSymbol: (value: string) => void;
  compareAnalysis: AnalysisPayload | null;
  compareOptions: string[];
  dateRange: string;
  setDateRange: (value: string) => void;
  chartType: string;
  setChartType: (value: string) => void;
  temporarySymbol: string;
  setTemporarySymbol: (value: string) => void;
  temporaryAnalysis: AnalysisPayload | null;
  loadTemporaryComparison: () => void;
  promoteTemporary: (role: "Watching" | "Trading") => void;
}) {
  const primary = filterHistory(props.analysis?.history || [], props.dateRange);
  const comparisonAnalysis = props.temporaryAnalysis || props.compareAnalysis;
  const comparison = comparisonAnalysis?.history ? filterHistory(comparisonAnalysis.history, props.dateRange) : [];
  return (
    <div>
      <div className="chart-controls">
        <div className="segmented scroll">{RANGES.map((range) => <button className={props.dateRange === range ? "active" : ""} key={range} onClick={() => props.setDateRange(range)}>{range}</button>)}</div>
        <ChartTypeMenu value={props.chartType} onChange={props.setChartType} />
        <select value={props.compareSymbol} onChange={(event) => props.setCompareSymbol(event.target.value)}>
          <option value="">Compare loaded instrument</option>
          {props.compareOptions.map((symbol) => <option key={symbol}>{symbol}</option>)}
        </select>
      </div>
      <SvgPriceChart
        primary={primary}
        comparison={comparison}
        primaryLabel={props.analysis?.symbol || ""}
        comparisonLabel={comparisonAnalysis?.symbol || ""}
        chartType={props.chartType}
        dateRange={props.dateRange}
      />
      <div className="temporary-row">
        <input value={props.temporarySymbol} onChange={(event) => props.setTemporarySymbol(event.target.value)} placeholder="Temporary comparison ticker" />
        <button onClick={props.loadTemporaryComparison}>Load temporary</button>
        <button disabled={!props.temporaryAnalysis?.symbol} onClick={() => props.promoteTemporary("Watching")}>Add to watchlist</button>
        <button disabled={!props.temporaryAnalysis?.symbol} onClick={() => props.promoteTemporary("Trading")}>Add to portfolio</button>
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, newAlert, setNewAlert, submitAlert, selectedSymbol, modalOpen, setModalOpen, removeAlert }: {
  alerts: AlertRule[];
  newAlert: AlertRule;
  setNewAlert: (value: AlertRule) => void;
  submitAlert: () => void;
  selectedSymbol: string;
  modalOpen: boolean;
  setModalOpen: (value: boolean) => void;
  removeAlert: (alertId: string | undefined) => void;
}) {
  return (
    <section className="alerts-board">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Alerts</p>
          <h2>{selectedSymbol} alerts</h2>
        </div>
        <button className="primary icon-button" onClick={() => {
          setNewAlert({ ...newAlert, symbol: selectedSymbol });
          setModalOpen(true);
        }}>+ Add alert</button>
      </div>
      {!alerts.length && <p className="muted">No alerts configured for this instrument yet.</p>}
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className="alert-card" key={alert.id || `${alert.symbol}-${alert.metric}-${alert.threshold}`}>
            <button className="alert-main" onClick={() => {
              setNewAlert(alert);
              setModalOpen(true);
            }}>
              <strong>{alert.symbol} · {alert.metric}</strong>
              <span>{alert.operator} {formatCell(alert.threshold)}</span>
              <small>{alert.message || "No custom message"}</small>
            </button>
            <button onClick={() => removeAlert(alert.id)}>Delete</button>
          </article>
        ))}
      </div>
      {modalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <section className="alert-modal">
            <div className="section-heading">
              <div><p className="eyebrow">Create alert</p><h2>{newAlert.symbol || selectedSymbol}</h2></div>
              <button onClick={() => setModalOpen(false)}>Close</button>
            </div>
            <div className="form-grid">
              <input value={newAlert.symbol || selectedSymbol} onChange={(event) => setNewAlert({ ...newAlert, symbol: event.target.value.toUpperCase() })} placeholder="Symbol or __PORTFOLIO__" />
              <select value={newAlert.metric} onChange={(event) => setNewAlert({ ...newAlert, metric: event.target.value })}>{["Price", "Volume", "SMA 200", "RSI 14", "Portfolio Value", "Portfolio Today P/L", "Portfolio Since Purchase P/L"].map((item) => <option key={item}>{item}</option>)}</select>
              <select value={newAlert.operator} onChange={(event) => setNewAlert({ ...newAlert, operator: event.target.value })}>{["Crossing", "Crossing Up", "Crossing Down", "Above", "Below"].map((item) => <option key={item}>{item}</option>)}</select>
              <input type="number" value={newAlert.threshold} onChange={(event) => setNewAlert({ ...newAlert, threshold: Number(event.target.value) })} />
            </div>
            <div className="inline-actions">
              <button className="primary" onClick={submitAlert}>Create alert</button>
              <button onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function ExecutionPlanList({ rows, openInstrument }: { rows: Record<string, unknown>[]; openInstrument?: (symbol: string) => void }) {
  if (!rows.length) return <p className="muted">No portfolio execution plans are available yet.</p>;
  return (
    <div className="execution-table">
      {rows.map((row) => (
        <article key={String(row.symbol)}>
          <strong>{String(row.symbol)}</strong>
          <span className="action-pill">{String(row.action || "No action")}</span>
          <span>{String(row.score || "n/a")}/99</span>
          <small>{String(row.entryZone || row.setup || "No entry zone available")}</small>
          <button onClick={() => openInstrument?.(String(row.symbol))}>View</button>
        </article>
      ))}
    </div>
  );
}

function MlPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  const ml = analysis?.ml || {};
  const validation = analysis?.mlValidation || {};
  const probability = Number(ml.probability_up ?? ml.probabilityUp ?? ml.p_up);
  return (
    <section className="info-panel">
      <h2>ML Model</h2>
      <p>{Number.isFinite(probability) ? `Latest model probability of an upward move is ${percent(probability)}.` : "No validated model signal is available for this instrument yet."}</p>
      <TablePanel rows={[
        {
          model: String(ml.model_name || ml.model || "logistic"),
          signal: String(ml.signal || ml.direction || "n/a"),
          probabilityUp: Number.isFinite(probability) ? percent(probability) : "n/a",
          validationAccuracy: formatCell(validation.out_of_sample_accuracy || ml.out_of_sample_accuracy),
          validationFolds: formatCell(validation.n_folds || validation.nFolds),
        },
      ]} />
    </section>
  );
}

function CorrelationPanel({ payload, symbols }: { payload: CorrelationPayload | null; symbols: string[] }) {
  if (symbols.length < 2) return <p className="muted">Load at least two instruments to calculate correlation.</p>;
  const rows = payload?.matrix || [];
  const observations = summarizeCorrelation(rows);
  return (
    <section className="info-panel">
      <h2>Correlation</h2>
      <ul>{observations.map((item) => <li key={item}>{item}</li>)}</ul>
      <TablePanel rows={rows} />
    </section>
  );
}

function BacktestPanel({ analysis }: { analysis: AnalysisPayload | null }) {
  const stats = (analysis?.backtest as Record<string, unknown> | undefined)?.stats as Record<string, unknown> | undefined;
  const summary = (analysis?.backtest as Record<string, unknown> | undefined)?.walkForwardSummary as Record<string, unknown> | undefined;
  return (
    <section className="info-panel">
      <h2>Backtest</h2>
      <p>{stats ? `Pullback strategy found ${formatCell(stats.trades || stats.trade_count)} trades with win rate ${formatCell(stats.win_rate)} and profit factor ${formatCell(stats.profit_factor)}.` : "No backtest statistics are available yet."}</p>
      <TablePanel rows={[
        {
          trades: stats?.trades || stats?.trade_count,
          winRate: stats?.win_rate,
          profitFactor: stats?.profit_factor,
          avgReturn: stats?.avg_return,
          walkForwardWindows: summary?.windows,
          walkForwardReturn: summary?.total_return,
        },
      ]} />
    </section>
  );
}

function FitWithPortfolioPanel({ analysis, portfolioRow, parentView }: {
  analysis: AnalysisPayload | null;
  portfolioRow?: Record<string, unknown>;
  parentView: "watchlist" | "portfolio";
}) {
  const signal = analysis?.signal || {};
  const regime = analysis?.marketRegime || {};
  const rows = [
    {
      context: "Instrument action",
      read: String(signal.action || "No action"),
      implication: String(signal.setup || "Open the Signal tab for the current execution plan."),
    },
    {
      context: "Market regime",
      read: String(regime.label || regime.regime || "No regime label available"),
      implication: "Use this to temper position size and confirmation requirements.",
    },
  ];
  if (parentView === "portfolio" && portfolioRow) {
    rows.push(
      {
        context: "Portfolio allocation",
        read: percent(Number(portfolioRow["Portfolio %"])),
        implication: "Higher allocation increases concentration risk and should raise the confirmation bar before adding.",
      },
      {
        context: "Unrealized P/L",
        read: money(Number(portfolioRow["Since Purchase $"]), currencyForSymbol(String(portfolioRow.Symbol))),
        implication: "Combine return since purchase with the current signal before adding, trimming, or holding.",
      },
    );
  } else {
    rows.push({
      context: "Portfolio status",
      read: "Watchlist only",
      implication: "Promote this ticker to portfolio only after entering purchase date, average price, and shares.",
    });
  }
  return (
    <section className="info-panel">
      <h2>Fit with portfolio</h2>
      <p>This view explains how the selected instrument fits the user workflow. Portfolio-level P/L and allocation appear only for active holdings.</p>
      <TablePanel rows={rows} />
    </section>
  );
}

function JsonPanel({ title, data }: { title: string; data: unknown }) {
  return <section><h2>{title}</h2><pre>{JSON.stringify(data || {}, null, 2)}</pre></section>;
}

function TablePanel({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p className="muted">No rows available.</p>;
  const columns = Object.keys(rows[0]).slice(0, 8);
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 25).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{formatCell(row[column])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function SvgPriceChart({ primary, comparison, primaryLabel, comparisonLabel, chartType, dateRange }: {
  primary: Record<string, unknown>[];
  comparison: Record<string, unknown>[];
  primaryLabel: string;
  comparisonLabel: string;
  chartType: string;
  dateRange: string;
}) {
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number; row: Record<string, unknown> } | null>(null);
  const width = 980;
  const height = 360;
  const all = [...primary, ...comparison];
  const values = all.map((row) => Number(row.Close)).filter(Number.isFinite);
  if (!values.length) {
    return <div className="chart-frame empty-chart"><p className="muted">No chart data available for this range.</p></div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const resolvedChartType = chartType === "Mountain" ? "Area" : chartType;
  const primaryPath = pathFor(primary, width, height, min, max);
  const comparisonPath = pathFor(comparison, width, height, min, max);
  const xLabels = xAxisLabels(primary, dateRange, width);
  const baseline = primary.length ? Number(primary[0].Close) : min;
  return (
    <div className="chart-frame">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price comparison chart">
        <rect x="0" y="0" width={width} height={height} rx="8" />
        {[0, 1, 2, 3].map((line) => <line key={line} x1="40" x2={width - 20} y1={40 + line * 80} y2={40 + line * 80} />)}
        {resolvedChartType === "Baseline" && Number.isFinite(baseline) && <line className="baseline-rule" x1="40" x2={width - 20} y1={yFor(baseline, height, min, max)} y2={yFor(baseline, height, min, max)} />}
        {resolvedChartType === "Baseline" && <path d={areaPathFor(primary, width, height, min, max)} className="baseline-area" />}
        {resolvedChartType === "Area" && <path d={areaPathFor(primary, width, height, min, max)} className="area-primary" />}
        {resolvedChartType === "Bar" && renderBars(primary, width, height, min, max)}
        {resolvedChartType === "Candlestick" && renderCandles(primary, width, height, min, max)}
        {(resolvedChartType === "Line" || resolvedChartType === "Area" || resolvedChartType === "Baseline") && <path d={primaryPath} className="line-primary" />}
        {comparisonPath && <path d={comparisonPath} className="line-compare" />}
        {hoverPoint && (
          <g className="chart-crosshair">
            <line x1={hoverPoint.x} x2={hoverPoint.x} y1="20" y2={height - 30} />
            <line x1="40" x2={width - 20} y1={hoverPoint.y} y2={hoverPoint.y} />
          </g>
        )}
        {primary.map((row, index) => {
          const close = Number(row.Close);
          if (!Number.isFinite(close)) return null;
          const x = xFor(index, primary.length, width);
          const y = yFor(close, height, min, max);
          return (
            <circle
              className="chart-hover-target"
              key={`${String(row.Date)}-${index}`}
              cx={x}
              cy={y}
              r="8"
              onMouseEnter={() => setHoverPoint({ x, y, row })}
              onMouseLeave={() => setHoverPoint(null)}
            >
              <title>{chartTooltipText(row, dateRange)}</title>
            </circle>
          );
        })}
        {xLabels.map((label) => (
          <text className="axis-label" key={`${label.x}-${label.text}`} x={label.x} y={height - 8} textAnchor="middle">{label.text}</text>
        ))}
      </svg>
      {hoverPoint && (
        <>
          <div className={`chart-tooltip ${hoverPoint.x > width * 0.66 ? "shift-left" : ""}`} style={{ left: `${(hoverPoint.x / width) * 100}%`, top: `${(hoverPoint.y / height) * 100}%` }}>
            <dl>
              {chartTooltipRows(hoverPoint.row, dateRange).map((item) => (
                <div key={item.label}>
                  <dt>{item.label}:</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="chart-time-pill" style={{ left: `${(hoverPoint.x / width) * 100}%` }}>{chartTimePill(hoverPoint.row, dateRange)}</div>
        </>
      )}
      <div className="legend"><span>{primaryLabel}</span>{comparisonLabel && <span>{comparisonLabel}</span>}</div>
    </div>
  );
}

function pathFor(rows: Record<string, unknown>[], width: number, height: number, min: number, max: number) {
  if (!rows.length || !Number.isFinite(min) || !Number.isFinite(max) || min === max) return "";
  return rows.map((row, index) => {
    const x = xFor(index, rows.length, width);
    const y = yFor(Number(row.Close), height, min, max);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function areaPathFor(rows: Record<string, unknown>[], width: number, height: number, min: number, max: number) {
  const line = pathFor(rows, width, height, min, max);
  if (!line) return "";
  const firstX = xFor(0, rows.length, width);
  const lastX = xFor(rows.length - 1, rows.length, width);
  const baseY = height - 30;
  return `${line} L${lastX.toFixed(1)},${baseY} L${firstX.toFixed(1)},${baseY} Z`;
}

function renderBars(rows: Record<string, unknown>[], width: number, height: number, min: number, max: number) {
  if (!rows.length || min === max) return null;
  const barWidth = Math.max(2, Math.min(10, (width - 70) / Math.max(rows.length, 1) * 0.55));
  const baseY = yFor(min, height, min, max);
  return rows.map((row, index) => {
    const close = Number(row.Close);
    if (!Number.isFinite(close)) return null;
    const x = xFor(index, rows.length, width) - barWidth / 2;
    const y = yFor(close, height, min, max);
    return <rect className="bar-primary" key={index} x={x} y={Math.min(y, baseY)} width={barWidth} height={Math.max(1, Math.abs(baseY - y))} rx="1" />;
  });
}

function renderCandles(rows: Record<string, unknown>[], width: number, height: number, min: number, max: number) {
  if (!rows.length || min === max) return null;
  const candleWidth = Math.max(3, Math.min(12, (width - 70) / Math.max(rows.length, 1) * 0.55));
  return rows.map((row, index) => {
    const open = Number(row.Open);
    const high = Number(row.High);
    const low = Number(row.Low);
    const close = Number(row.Close);
    if (![open, high, low, close].every(Number.isFinite)) return null;
    const x = xFor(index, rows.length, width);
    const openY = yFor(open, height, min, max);
    const closeY = yFor(close, height, min, max);
    const highY = yFor(high, height, min, max);
    const lowY = yFor(low, height, min, max);
    const up = close >= open;
    return (
      <g key={index} className={up ? "candle-up" : "candle-down"}>
        <line x1={x} x2={x} y1={highY} y2={lowY} />
        <rect x={x - candleWidth / 2} y={Math.min(openY, closeY)} width={candleWidth} height={Math.max(2, Math.abs(openY - closeY))} rx="1" />
      </g>
    );
  });
}

function renderOhlc(rows: Record<string, unknown>[], width: number, height: number, min: number, max: number) {
  if (!rows.length || min === max) return null;
  const tick = Math.max(4, Math.min(9, (width - 70) / Math.max(rows.length, 1) * 0.35));
  return rows.map((row, index) => {
    const open = Number(row.Open);
    const high = Number(row.High);
    const low = Number(row.Low);
    const close = Number(row.Close);
    if (![open, high, low, close].every(Number.isFinite)) return null;
    const x = xFor(index, rows.length, width);
    const up = close >= open;
    return (
      <g key={index} className={up ? "candle-up" : "candle-down"}>
        <line x1={x} x2={x} y1={yFor(high, height, min, max)} y2={yFor(low, height, min, max)} />
        <line x1={x - tick} x2={x} y1={yFor(open, height, min, max)} y2={yFor(open, height, min, max)} />
        <line x1={x} x2={x + tick} y1={yFor(close, height, min, max)} y2={yFor(close, height, min, max)} />
      </g>
    );
  });
}

function chartTooltipText(row: Record<string, unknown>, range: string) {
  return chartTooltipRows(row, range).map((item) => `${item.label}: ${item.value}`).join("\n");
}

function chartTooltipRows(row: Record<string, unknown>, range: string) {
  const date = new Date(String(row.Date));
  return [
    { label: "Date", value: chartTimePill(row, range) },
    { label: "Close", value: formatPrice(row.Close) },
    { label: "Open", value: formatPrice(row.Open) },
    { label: "High", value: formatPrice(row.High) },
    { label: "Low", value: formatPrice(row.Low) },
    { label: "Volume", value: formatCell(row.Volume) },
  ];
}

function chartTimePill(row: Record<string, unknown>, range: string) {
  const date = new Date(String(row.Date));
  if (!Number.isFinite(date.getTime())) return "n/a";
  if (range === "1D") {
    return date.toLocaleString([], { month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }).replace(",", "");
  }
  return date.toLocaleDateString([], { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatPrice(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "n/a";
}

function xFor(index: number, total: number, width: number) {
  return 40 + (index / Math.max(total - 1, 1)) * (width - 70);
}

function yFor(value: number, height: number, min: number, max: number) {
  if (min === max) return height / 2;
  return height - 30 - ((value - min) / (max - min)) * (height - 70);
}

function filterHistory(rows: Record<string, unknown>[], range: string) {
  if (!rows.length) return [];
  if (range === "10Y") return rows;
  if (range === "1D") {
    const latest = new Date(String(rows[rows.length - 1].Date));
    return rows.filter((row) => {
      const current = new Date(String(row.Date));
      return current.toDateString() === latest.toDateString();
    });
  }
  const days: Record<string, number> = { "1D": 1, "5D": 5, "1W": 7, "1M": 31, "3M": 93, "6M": 186, "YTD": 260, "1Y": 366 };
  return rows.slice(-Math.min(rows.length, days[range] || rows.length));
}

function xAxisLabels(rows: Record<string, unknown>[], range: string, width: number) {
  if (!rows.length) return [];
  const indexes = Array.from(new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1]));
  return indexes.map((index) => {
    const date = new Date(String(rows[index].Date));
    const text = range === "1D"
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
    return { x: xFor(index, rows.length, width), text };
  });
}

function effectivePeriod(range: string, fallback: string) {
  return range === "1D" ? "5d" : fallback;
}

function effectiveInterval(range: string, fallback: string) {
  return range === "1D" ? "5m" : fallback;
}

function updateRow(setInstruments: (value: Instrument[] | ((current: Instrument[]) => Instrument[])) => void, index: number, patch: Partial<Instrument>) {
  setInstruments((rows) => rows.map((item, rowIndex) => rowIndex === index ? { ...item, ...patch } : item));
}

function loadGuestState() {
  if (typeof window === "undefined") return { instruments: [] as Instrument[], alerts: [] as AlertRule[] };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_WORKSPACE_KEY) || "{}") as { instruments?: Instrument[]; alerts?: AlertRule[] };
    return {
      instruments: Array.isArray(parsed.instruments) ? parsed.instruments : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
    };
  } catch {
    return { instruments: [] as Instrument[], alerts: [] as AlertRule[] };
  }
}

function saveGuestState(patch: { instruments?: Instrument[]; alerts?: AlertRule[] }) {
  if (typeof window === "undefined") return;
  const current = loadGuestState();
  window.localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify({ ...current, ...patch }));
}

function loadGuestInstruments() {
  return loadGuestState().instruments;
}

function saveGuestInstruments(instruments: Instrument[]) {
  saveGuestState({ instruments });
}

function loadGuestAlerts() {
  return loadGuestState().alerts;
}

function saveGuestAlerts(alerts: AlertRule[]) {
  saveGuestState({ alerts });
}

function cleanSymbol(symbol: unknown) {
  const cleaned = String(symbol || "").trim().toUpperCase();
  if (cleaned.endsWith(".TO") && US_DEFAULT_SYMBOLS.has(cleaned.replace(/\.TO$/, ""))) {
    return cleaned.replace(/\.TO$/, "");
  }
  return cleaned;
}

function symbolMatchesMarkets(symbol: string, selectedMarkets: Exchange[], markets: MarketsPayload | null) {
  if (!selectedMarkets.length) return true;
  const inferredMarkets = inferMarketsForSymbol(symbol, markets);
  return inferredMarkets.some((market) => selectedMarkets.includes(market));
}

function inferMarketsForSymbol(symbol: string, markets: MarketsPayload | null): Exchange[] {
  const cleaned = cleanSymbol(symbol);
  if (cleaned.endsWith(".TO") || cleaned.endsWith(".V")) return ["TSX"];
  const matches = (["TSX", "NYSE", "NASDAQ"] as Exchange[]).filter((market) => (
    markets?.defaultWatchlists?.[market] || []
  ).map(cleanSymbol).includes(cleaned));
  if (matches.length) return matches;
  return ["NYSE", "NASDAQ"];
}

function summarizeCorrelation(rows: Record<string, unknown>[]) {
  if (!rows.length) return ["Correlation matrix is loading or unavailable."];
  const pairs: { label: string; value: number }[] = [];
  for (const row of rows) {
    const left = String(row.symbol || "");
    for (const [right, raw] of Object.entries(row)) {
      if (!left || right === "symbol" || right === left) continue;
      const value = Number(raw);
      if (Number.isFinite(value)) pairs.push({ label: `${left} / ${right}`, value });
    }
  }
  const strongest = pairs.sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  if (!strongest) return ["No pairwise correlation could be calculated."];
  const direction = strongest.value >= 0 ? "move together" : "move in opposite directions";
  return [`Strongest relationship: ${strongest.label} at ${strongest.value.toFixed(2)}, meaning they currently tend to ${direction}.`];
}

function emptyInstrument(role: "Watching" | "Trading"): Instrument {
  return {
    symbol: "",
    role,
    active: true,
    intent: "Hold / Watch",
    strategy: "Buy-dip",
    purchase_date: role === "Trading" ? today() : "",
    average_cost: 0,
    book_cost: 0,
    shares: 0,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function currencyForSymbol(symbol: string | undefined) {
  return cleanSymbol(symbol || "").endsWith(".TO") || cleanSymbol(symbol || "").endsWith(".V") ? "CAD" : "USD";
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
