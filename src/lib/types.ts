export type WorkflowMode = "choice" | "watchlist" | "portfolio" | "dashboard";
export type Exchange = "TSX" | "NYSE" | "NASDAQ";
export type Role = "Watching" | "Trading";
export type Intent = "Buy / Add" | "Sell / Trim" | "Hold / Watch";
export type Strategy = "Short-term (1-4 weeks)" | "Long-term (6-12 months)" | "Buy-dip";
export type AppRole = "superadmin" | "admin" | "user" | "guest";

export type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: AppRole | string;
  permissions?: string[];
  isGuest?: boolean;
};

export type Instrument = {
  symbol: string;
  role: Role;
  active: boolean;
  notes?: string;
  shares?: number;
  average_cost?: number;
  book_cost?: number;
  category?: string;
  purchase_date?: string;
  intent?: Intent | string;
  strategy?: Strategy | string;
  watch_reason?: string;
};

export type MarketsPayload = {
  exchanges: Record<string, { name: string; examples: string[]; benchmarkSymbol: string; benchmarkName: string }>;
  defaultWatchlists: Record<string, string[]>;
  riskProfiles: Record<string, { name: string; description: string; riskPctPerTrade: number; buyConfidenceThreshold: number }>;
  strategies: Strategy[];
  intents: Intent[];
};

export type WorkspacePayload = {
  instruments: Instrument[];
  symbols: string[];
  markets: MarketsPayload;
  alerts: AlertRule[];
};

export type PortfolioPayload = {
  account?: { id: string; name: string; accountType: string; currency: string; active: boolean } | null;
  portfolio: Record<string, unknown>[];
  categoryExposure: Record<string, unknown>[];
  watchlist: Record<string, unknown>[];
  activities?: PortfolioActivity[];
  executionPlans?: Record<string, unknown>[];
  metrics: {
    totalInvested: number;
    marketValue: number;
    sincePurchase: number;
    sincePurchasePct: number | null;
    todayPl: number;
    weekPl: number;
    currency?: string;
  };
  notes: string[];
};

export type PortfolioActivity = {
  id: string;
  portfolioId: string;
  symbol: string;
  activityType: string;
  tradeDate: string;
  shares: number;
  price: number;
  amount: number;
  fees: number;
  status: string;
  note: string;
  realizedPl: number;
  createdAt: string;
};

export type AlertRule = {
  id?: string;
  symbol: string;
  role?: string;
  metric: string;
  operator: string;
  threshold: number;
  trigger?: string;
  expiration?: string | null;
  message?: string;
  notifications?: string[];
  enabled?: boolean;
};

export type AnalysisPayload = {
  ok: boolean;
  symbol: string;
  sourceStatus?: string;
  snapshotStatus?: string;
  earningsStatus?: string;
  history: Record<string, unknown>[];
  summary?: { title: string; subtitle: string; markdown: string; html: string };
  signal?: Record<string, unknown>;
  strategyRows?: Record<string, unknown>[];
  news?: Record<string, unknown>[];
  snapshot?: Record<string, unknown>;
  marketRegime?: Record<string, unknown>;
  ml?: Record<string, unknown>;
  mlValidation?: Record<string, unknown>;
  backtest?: Record<string, unknown>;
};

export type TickerSuggestion = {
  symbol: string;
  market: string;
  label: string;
  currency: string;
  name?: string;
};

export type CorrelationPayload = {
  symbols: string[];
  matrix: Record<string, unknown>[];
};
