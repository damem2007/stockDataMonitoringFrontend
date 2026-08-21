import type {
  AlertRule,
  AnalysisPayload,
  CorrelationPayload,
  Instrument,
  MarketsPayload,
  PortfolioPayload,
  TickerSuggestion,
  User,
  WorkspacePayload,
} from "./types";
import { API_BASE_URL } from "./config";

type RequestOptions = {
  token?: string | null;
  method?: string;
  body?: unknown;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the generic message.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function login(loginName: string, password: string) {
  return apiFetch<{ access_token: string; token_type: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: { login: loginName, password },
  });
}

export function getMarkets() {
  return apiFetch<MarketsPayload>("/api/markets");
}

export function searchTickers(query: string, markets: string[]) {
  const params = new URLSearchParams({ q: query, markets: markets.join(",") });
  return apiFetch<{ results: TickerSuggestion[] }>(`/api/tickers/search?${params.toString()}`);
}

export function getWorkspace(token?: string | null) {
  return apiFetch<WorkspacePayload>("/api/workspace", { token });
}

export function saveWatchlist(token: string | null, exchange: string, instruments: Instrument[]) {
  return apiFetch<{ instruments: Instrument[]; workspace: WorkspacePayload }>("/api/onboarding/watchlist", {
    token,
    method: "POST",
    body: { exchange, role: "Watching", instruments },
  });
}

export function savePortfolio(token: string, exchange: string, instruments: Instrument[]) {
  return apiFetch<{ instruments: Instrument[]; portfolio: PortfolioPayload }>("/api/onboarding/portfolio", {
    token,
    method: "POST",
    body: { exchange, role: "Trading", instruments },
  });
}

export function updateInstruments(token: string | null, instruments: Instrument[]) {
  return apiFetch<{ instruments: Instrument[] }>("/api/instruments", {
    token,
    method: "PUT",
    body: { instruments },
  });
}

export function getPortfolio(token: string) {
  return apiFetch<PortfolioPayload>("/api/portfolio", { token });
}

export function getAnalysis(symbol: string, params: URLSearchParams) {
  return apiFetch<AnalysisPayload>(`/api/instruments/${encodeURIComponent(symbol)}/analysis?${params.toString()}`);
}

export function getCorrelation(symbols: string[], params: URLSearchParams) {
  const query = new URLSearchParams(params);
  query.set("symbols", symbols.join(","));
  return apiFetch<CorrelationPayload>(`/api/correlation?${query.toString()}`);
}

export function getAlerts(token?: string | null) {
  return apiFetch<{ alerts: AlertRule[] }>("/api/alerts", { token });
}

export function createAlert(token: string | null, alert: AlertRule) {
  return apiFetch<{ alert: AlertRule }>("/api/alerts", { token, method: "POST", body: { alert } });
}

export function replaceAlerts(token: string | null, alerts: AlertRule[]) {
  return apiFetch<{ alerts: AlertRule[] }>("/api/alerts", { token, method: "PUT", body: { alerts } });
}

export function deleteAlert(token: string | null, alertId: string) {
  return apiFetch<{ alerts: AlertRule[] }>(`/api/alerts/${encodeURIComponent(alertId)}`, { token, method: "DELETE" });
}
