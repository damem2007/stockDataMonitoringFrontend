import type { Intent, Strategy } from "./types";

export const STRATEGIES: Strategy[] = [
  "Short-term (1-4 weeks)",
  "Long-term (6-12 months)",
  "Buy-dip",
];

export const INTENTS: Intent[] = ["Buy / Add", "Sell / Trim", "Hold / Watch"];
export const RANGES = ["1D", "5D", "1W", "1M", "3M", "6M", "YTD", "1Y", "10Y"] as const;
export const CHART_TYPES = ["Line", "Candlestick", "Baseline", "Mountain", "Bar"] as const;
export const GUEST_WORKSPACE_KEY = "stockDashboardGuestWorkspace";
export const USER_STORAGE_KEY = "stockDashboardUser";