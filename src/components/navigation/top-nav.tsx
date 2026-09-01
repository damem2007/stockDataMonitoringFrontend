"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { GUEST_WORKSPACE_KEY } from "@/lib/constants";
import type { AppNotification } from "@/lib/types";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/providers/toast-provider";
import { useWorkspace } from "@/providers/workspace-provider";

const ACCOUNT_ITEMS = [
  { label: "Profile", href: "/account/profile" },
  { label: "Preferences", href: "/account/preferences" },
  { label: "Security", href: "/account/security" },
  { label: "Subscription", href: "/account/subscription" },
] as const;

export const AVATAR_COLORS = [
  "#16A34A", "#2563EB", "#DC2626", "#EA580C", "#7C3AED", "#0891B2", "#DB2777", "#65A30D", 
  "#D97706", "#059669", "#4F46E5", "#9333EA", "#C026D3", "#E11D48", "#0D9488", "#0284C7", 
  "#CA8A04", "#57534E", "#52525B", "#4B5563", "#475569", "#B91C1C", "#C2410C", "#A16207", 
  "#4D7C0F", "#047857", "#0F766E", "#0369A1", "#1D4ED8", "#6D28D9", "#15803D", "#1E40AF", 
  "#991B1B", "#9A3412", "#5B21B6", "#155E75", "#9D174D", "#3F6212", "#92400E", "#065F46", 
  "#3730A3", "#6B21A8", "#86198F", "#9F1239", "#115E59", "#075985", "#854D0E", "#44403C", 
  "#3F3F46", "#374151", "#334155", "#166534", "#1E3A8A", "#7F1D1D", "#7C2D12", "#581C87", 
  "#164E63", "#831843", "#365314", "#78350F", "#064E3B", "#312E81", "#701A75", "#881337", 
  "#134E4A", "#0C4A6E", "#713F12", "#292524", "#27272A", "#1F2937", "#34D399", "#F87171",
  "#FBBF24", "#6366F1", "#22D3EE", "#A78BFA",
];


// Generates a predictable color based on the text hash value
export function generateAvatarColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Helper to extract initials
export function userInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0]?.slice(0, 2) || "TM").toUpperCase();
}

// Returns both color and initials in an object layout
export function generateUserAvatar(projectName: string): { color: string; initials: string } {
  return {
    color: generateAvatarColor(projectName),
    initials: userInitials(projectName),
  };
}

export function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const session = useSession();
  const theme = useTheme();
  const workspace = useWorkspace();
  const { showToast } = useToast();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<"notifications" | "new">("notifications");
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const isGuest = !session.user || session.user.isGuest;
  const displayUser = {
    name: session.user?.name || "Guest",
    username: session.user?.username || "guest user",
  };
  const userAvatar = generateUserAvatar(String(displayUser.name || displayUser.username));
  const systemUpdates: AppNotification[] = [];
  const visibleNotifications = notificationTab === "new" ? systemUpdates : workspace.notifications;
  const notificationGroups = groupNotifications(visibleNotifications);

  //console.log("Initial", userAvatar);

  useEffect(() => {
    setAccountMenuOpen(false);
    setNotificationMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!accountMenuOpen && !notificationMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (!notificationRef.current?.contains(event.target as Node)) {
        setNotificationMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        setNotificationMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen, notificationMenuOpen]);

  const handleAvatarClick = () => {
    setAccountMenuOpen((open) => !open);
  };

  const handleSignOut = () => {
    setAccountMenuOpen(false);
    session.signOut();
    if(isGuest){
      window.localStorage.removeItem(GUEST_WORKSPACE_KEY);
      router.push("/?next=/watchlist");
      return;
    }
    if (path.startsWith("/watchlist")) {
      showToast("Signed out. You are continuing as a guest.", "info");
      router.refresh();
      return;
    }
    if (path.startsWith("/portfolio") || path.startsWith("/account")) {
      router.push(`/?next=${encodeURIComponent(path)}`);
      return;
    }
    router.refresh();
  };

  return (
    <header className="app-topbar">
      <div className="brand-nav">
        <Link href="/" className="brand-link">
          <strong>StockSignal</strong>
        </Link>
        <nav aria-label="Primary navigation">
          <Link className={path.startsWith("/watchlist") ? "active" : ""} href="/watchlist">
            Watchlist
          </Link>
          {!isGuest ? (
            <Link className={path.startsWith("/portfolio") ? "active" : ""} href="/portfolio">
              Portfolio
            </Link>
          ) : (
            <Link href="/?next=/portfolio">Portfolio</Link>
          )}
        </nav>
      </div>

      <div className="topbar-user">
        <span className="profile-pill" title={workspace.profileIndicatorReason}>{workspace.profileIndicator} profile</span>

        <button
          type="button"
          className="theme-toggle"
          onClick={theme.cyclePreference}
          title={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
          aria-label={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
        >
          {theme.preference === "system" ? <Monitor aria-hidden="true" /> : theme.resolvedTheme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>

        {!isGuest ? (
          <div className="notification-menu" ref={notificationRef}>
            <button
              type="button"
              className="notification-button"
              onClick={() => setNotificationMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={notificationMenuOpen}
              aria-label="Open notifications"
            >
              <Bell aria-hidden="true" />
              {workspace.unreadNotificationCount ? <span className="notification-badge">{workspace.unreadNotificationCount}</span> : null}
            </button>
            {notificationMenuOpen ? (
              <div className="notification-dropdown" role="menu" aria-label="Notifications">
                <div className="notification-dropdown-header">
                  <div className="notification-tabs" aria-label="Notification sections">
                    <button
                      className={notificationTab === "notifications" ? "is-active" : ""}
                      onClick={() => setNotificationTab("notifications")}
                      type="button"
                    >
                      Notifications
                    </button>
                    <button
                      className={notificationTab === "new" ? "is-active" : ""}
                      onClick={() => setNotificationTab("new")}
                      type="button"
                    >
                      What's new
                    </button>
                  </div>
                  <p>{notificationTab === "new" ? "System updates and product changes will appear here." : "Red alerts, amber recommendations, and friendly account notes"}</p>
                </div>
                <div className="notification-list">
                  {visibleNotifications.length ? notificationGroups.map((group) => (
                    <section className="notification-group" key={group.label}>
                      <h3>{group.label}</h3>
                      {group.items.map((item) => {
                        const content = (
                          <>
                            <span className={`notification-dot ${item.tone}`} />
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.detail}</small>
                              <span className="notification-meta-row">
                                <em>{relativeNotificationTime(item.occurredAt)}</em>
                                {item.href ? <b>{item.ctaLabel || "Open"}</b> : null}
                                {item.read ? <i>Read</i> : null}
                              </span>
                            </span>
                          </>
                        );
                        return item.href ? (
                          <Link
                            key={item.id}
                            href={item.href}
                            role="menuitem"
                            className={`notification-item${item.read ? " read" : ""}`}
                            onClick={() => workspace.markNotificationRead(item.id)}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            className={`notification-item${item.read ? " read" : ""}`}
                            onClick={() => workspace.markNotificationRead(item.id)}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </section>
                  )) : (
                    <div className="notification-empty">{notificationTab === "new" ? "No system updates yet." : "No active notifications."}</div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="account-menu"
          ref={menuRef}
          onMouseEnter={() => setAccountMenuOpen(true)}
          onMouseLeave={() => setAccountMenuOpen(false)}
        >
          <button
            type="button"
            className={`avatar-button${path.startsWith("/account") ? " active" : ""}`}
            onClick={handleAvatarClick}
            style={{ backgroundColor: userAvatar.color }} 
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            aria-label="Open account menu"
          >
            <span>{userAvatar.initials}</span>
            <ChevronDown className="avatar-chevron" aria-hidden="true" />
          </button>

          {accountMenuOpen ? (
            <div className="account-dropdown" role="menu" aria-label="Account">
              <div className="account-dropdown-header">
                <strong>{displayUser.name || displayUser.username}</strong>
                {displayUser.name && displayUser.username ? <span>{displayUser.username}</span> : null}
              </div>

              {!isGuest ? (
                <div className="account-dropdown-list">
                  {ACCOUNT_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={path === item.href ? "active" : ""}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="account-dropdown-list">
                  <Link href="/login?mode=register" role="menuitem">
                    Create an account
                  </Link>
                </div>
              )}

              <div className="account-dropdown-footer">
                <button type="button" role="menuitem" onClick={handleSignOut}>
                  <LogOut aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function groupNotifications(items: AppNotification[]) {
  const groups = new Map<string, AppNotification[]>();
  items.forEach((item) => {
    const label = notificationGroupLabel(item);
    groups.set(label, [...(groups.get(label) || []), item]);
  });
  return Array.from(groups, ([label, groupItems]) => ({
    label,
    items: groupItems.sort((a, b) => notificationTimeValue(b) - notificationTimeValue(a)),
  }));
}

function notificationGroupLabel(item: AppNotification) {
  const value = notificationTimeValue(item);
  if (!value) return "Earlier";
  const ageMs = Date.now() - value;
  if (ageMs < 24 * 60 * 60 * 1000) return "Today";
  if (ageMs < 7 * 24 * 60 * 60 * 1000) return "This week";
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return "Last 30 days";
  return "Earlier";
}

function relativeNotificationTime(value?: string) {
  const time = notificationTimeValue({ occurredAt: value } as AppNotification);
  if (!time) return "Recently";
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  return `${Math.floor(diff / day)} days ago`;
}

function notificationTimeValue(item: AppNotification) {
  const time = item.occurredAt ? new Date(item.occurredAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}
