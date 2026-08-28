import type { AlertRule, Exchange, Instrument, MarketsPayload } from "./types";
import { GUEST_WORKSPACE_KEY } from "./constants";

export function cleanSymbol(symbol: unknown) {
  return String(symbol || "").trim().toUpperCase();
}

export function symbolMatchesMarkets(symbol: string, selectedMarkets: Exchange[], markets: MarketsPayload | null) {
  if (!selectedMarkets.length) return false;
  return inferMarketsForSymbol(symbol, markets).some((market) => selectedMarkets.includes(market));
}

export function inferMarketsForSymbol(symbol: string, markets: MarketsPayload | null): Exchange[] {
  const normalized = cleanSymbol(symbol);
  if (normalized.endsWith(".TO") || normalized.endsWith(".V")) return ["TSX"];
  const explicit = Object.entries(markets?.defaultWatchlists || {})
    .filter(([, symbols]) => symbols.map(cleanSymbol).includes(normalized))
    .map(([market]) => market as Exchange);
  if (explicit.length) return explicit;
  return ["NYSE", "NASDAQ"];
}

export function effectivePeriod(range: string, fallback: string) {
  return ({ "1D": "5d", "5D": "1mo", "1W": "1mo", "1M": "3mo", "3M": "6mo", "6M": "1y", YTD: "ytd", "1Y": "1y", "10Y": "10y" } as Record<string, string>)[range] || fallback;
}

export function effectiveInterval(range: string, fallback: string) {
  return ({ "1D": "5m", "5D": "15m", "1W": "1h", "1M": "1d", "3M": "1d", "6M": "1d", YTD: "1d", "1Y": "1d", "10Y": "1wk" } as Record<string, string>)[range] || fallback;
}

export function loadGuestState(): { instruments: Instrument[]; alerts: AlertRule[] } {
  if (typeof window === "undefined") return { instruments: [], alerts: [] };
  try {
    const raw = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
    if (!raw) return { instruments: [], alerts: [] };
    const parsed = JSON.parse(raw) as { instruments?: Instrument[]; alerts?: AlertRule[] };
    return { instruments: parsed.instruments || [], alerts: parsed.alerts || [] };
  } catch {
    return { instruments: [], alerts: [] };
  }
}

export function saveGuestState(patch: { instruments?: Instrument[]; alerts?: AlertRule[] }) {
  if (typeof window === "undefined") return;
  const current = loadGuestState();
  window.localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify({ ...current, ...patch }));
}

export const loadGuestInstruments = () => loadGuestState().instruments;
export const loadGuestAlerts = () => loadGuestState().alerts;
export const saveGuestInstruments = (instruments: Instrument[]) => saveGuestState({ instruments });
export const saveGuestAlerts = (alerts: AlertRule[]) => saveGuestState({ alerts });

export function emptyInstrument(role: "Watching" | "Trading"): Instrument {
  return {
    symbol: "",
    role,
    active: true,
    intent: "Hold / Watch",
    strategy: "Buy-dip",
    watch_reason: "",
    purchase_date: role === "Trading" ? today() : "",
    shares: 0,
    average_cost: 0,
    book_cost: 0,
  };
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function money(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function currencyForSymbol(symbol: string | undefined) {
  const normalized = cleanSymbol(symbol || "");
  return normalized.endsWith(".TO") || normalized.endsWith(".V") ? "CAD" : "USD";
}

export function percent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCell(value: unknown) {
  if (value === null || value === undefined) return "n/a";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
