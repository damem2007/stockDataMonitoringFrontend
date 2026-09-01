import type { AlertRule, AppNotification, NotificationActivity, PortfolioPayload, User } from "@/lib/types";
import { cleanSymbol } from "@/lib/workspace-utils";

type NotificationCenterInput = {
  alerts: AlertRule[];
  portfolio: PortfolioPayload | null;
  user: User | null;
  readIds: Set<string>;
  activities?: NotificationActivity[];
};

export class NotificationCenter {
  private alerts: AlertRule[];
  private portfolio: PortfolioPayload | null;
  private user: User | null;
  private readIds: Set<string>;
  private activities: NotificationActivity[];

  constructor(input: NotificationCenterInput) {
    this.alerts = input.alerts;
    this.portfolio = input.portfolio;
    this.user = input.user;
    this.readIds = input.readIds;
    this.activities = input.activities || [];
  }

  build(): AppNotification[] {
    if (!this.user || this.user.isGuest) return [];
    return [
      ...this.triggeredAlerts(),
      ...this.portfolioInsights(),
      ...this.portfolioActivities(),
      ...this.recordedActivities(),
      ...this.accountNotices(),
    ]
      .sort((a, b) => this.timeValue(b.occurredAt) - this.timeValue(a.occurredAt))
      .slice(0, 16);
  }

  private triggeredAlerts(): AppNotification[] {
    return this.alerts.flatMap((alert) => {
      const triggeredAt = alert.last_triggered_at || alert.lastTriggeredAt;
      if (!triggeredAt) return [];
      const symbol = cleanSymbol(alert.symbol);
      const id = `alert-triggered-${alert.id || symbol}`;
      return [{
        id,
        tone: "red" as const,
        title: alert.message || `${symbol} ${alert.metric} ${alert.operator} ${alert.threshold}`,
        detail: `Triggered ${this.formatDate(triggeredAt)}. Missing this may affect gain/loss decisions.`,
        href: symbol === "__PORTFOLIO__" ? "/portfolio" : `/watchlist/${encodeURIComponent(symbol)}/alerts`,
        ctaLabel: symbol === "__PORTFOLIO__" ? "Review portfolio" : "View alert",
        occurredAt: triggeredAt,
        read: this.wasRead(id),
      }];
    });
  }

  private portfolioInsights(): AppNotification[] {
    const rows = this.portfolio?.portfolio || [];
    const symbols = rows.map((row) => cleanSymbol(row.Symbol)).filter(Boolean);
    const occurredAt = this.latestPortfolioTime(rows);
    const notes = (this.portfolio?.notes || []).filter((note) => !/^No trading holdings|^No major/i.test(note));
    return notes.slice(0, 6).map((note) => {
      const symbol = this.symbolFromText(note, symbols);
      const insightType = this.insightType(note);
      const id = `portfolio-insight-${symbol || "portfolio"}-${insightType}`;
      return {
        id,
        tone: this.insightTone(note),
        title: symbol ? `${symbol} portfolio insight` : "Portfolio insight",
        detail: note,
        href: symbol ? `/portfolio/${encodeURIComponent(symbol)}/summary` : "/portfolio",
        ctaLabel: symbol ? "View analysis" : "Review portfolio",
        occurredAt,
        read: this.wasRead(id),
      };
    });
  }

  private portfolioActivities(): AppNotification[] {
    return (this.portfolio?.activities || []).slice(0, 8).flatMap((activity) => {
      const symbol = cleanSymbol(activity.symbol);
      if (!symbol) return [];
      const kind = String(activity.activityType || "").toUpperCase();
      const id = `portfolio-activity-${activity.id || `${kind}-${symbol}`}`;
      const friendlyKind = kind.replace("_", " ").toLowerCase();
      return [{
        id,
        tone: "friendly" as const,
        title: `${symbol} ${friendlyKind}`,
        detail: this.activityDetail(kind),
        href: `/portfolio/${encodeURIComponent(symbol)}/summary`,
        ctaLabel: "Review holding",
        occurredAt: activity.createdAt || activity.tradeDate,
        read: this.wasRead(id),
      }];
    });
  }

  private recordedActivities(): AppNotification[] {
    return this.activities.map((activity) => {
      const id = `activity-${activity.id}`;
      return {
        id,
        tone: activity.tone || this.toneForActivity(activity.kind),
        title: activity.title,
        detail: activity.detail,
        href: activity.href,
        ctaLabel: activity.ctaLabel,
        occurredAt: activity.occurredAt,
        read: this.wasRead(id),
      };
    });
  }

  private accountNotices(): AppNotification[] {
    const onboarding = String(this.user?.onboardingStatus || "").toLowerCase();
    if (!this.user || this.user.isGuest || !onboarding || onboarding === "verified") return [];
    const id = "account-verification";
    return [{
      id,
      tone: "friendly",
      title: "Account verification pending",
      detail: "Verify your email to keep account recovery and saved workspace access clean.",
      href: "/account/profile",
      ctaLabel: "Open account",
      occurredAt: new Date().toISOString(),
      read: this.wasRead(id),
    }];
  }

  private activityDetail(kind: string) {
    if (kind === "LIQUIDATE" || kind === "SELL") return "The disposal is recorded in activity history and portfolio reporting.";
    if (kind === "TRANSFER") return "The transfer is recorded in activity history and portfolio reporting.";
    return "The position is included in portfolio metrics, inference, and alert monitoring.";
  }

  private toneForActivity(kind: string): AppNotification["tone"] {
    const normalized = kind.toLowerCase();
    if (normalized.includes("trigger")) return "red";
    if (normalized.includes("insight") || normalized.includes("recommendation")) return "amber";
    return "friendly";
  }

  private insightTone(text: string): AppNotification["tone"] {
    const lower = text.toLowerCase();
    if (lower.includes("down") || lower.includes("loss") || lower.includes("defensive") || lower.includes("stop level")) return "red";
    return "amber";
  }

  private insightType(text: string) {
    const lower = text.toLowerCase();
    if (lower.includes("concentration") || lower.includes("of the portfolio") || lower.includes("of portfolio")) return "concentration";
    if (lower.includes("down") && lower.includes("purchase")) return "purchase-loss";
    if (lower.includes("up") && lower.includes("purchase")) return "purchase-gain";
    if (lower.includes("today")) return "daily-move";
    if (lower.includes("execution read")) return "execution";
    if (lower.includes("defensive execution")) return "defensive-plans";
    if (lower.includes("diversify")) return "sector-exposure";
    return "review";
  }

  private symbolFromText(text: string, symbols: string[]) {
    const upper = text.toUpperCase();
    return symbols.find((symbol) => upper.includes(symbol.toUpperCase())) || "";
  }

  private latestPortfolioTime(rows: Record<string, unknown>[]) {
    const latest = rows
      .map((row) => new Date(String(row["Price Date"] || row["Quote Date"] || row["Last Updated"] || "")).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0];
    return latest ? new Date(latest).toISOString() : new Date().toISOString();
  }

  private formatDate(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "recently";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  private timeValue(value?: string) {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }

  private wasRead(id: string) {
    if (this.readIds.has(id)) return true;
    return Array.from(this.readIds).some((readId) => readId.startsWith(`${id}-`));
  }
}

