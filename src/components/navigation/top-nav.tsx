"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { GUEST_WORKSPACE_KEY } from "@/lib/constants";
import { useTheme } from "@/providers/theme-provider";
import { queueFlashToast, useToast } from "@/providers/toast-provider";
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
  const menuRef = useRef<HTMLDivElement>(null);

  const isGuest = !session.user || session.user.isGuest;
  const displayUser = {
    name: session.user?.name || "Guest",
    username: session.user?.username || "guest user",
  };
  const userAvatar = generateUserAvatar(String(displayUser.name || displayUser.username));

  //console.log("Initial", userAvatar);

  useEffect(() => {
    setAccountMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const handleAvatarClick = () => {
    setAccountMenuOpen((open) => !open);
  };

  const handleSignOut = () => {
    setAccountMenuOpen(false);
    session.signOut();
    if(isGuest){
      window.localStorage.removeItem(GUEST_WORKSPACE_KEY);
      showToast("Signed out. You are continuing as a guest.", "info")
      router.push("/?next=/watchlist");
      return;
    }
    if (path.startsWith("/portfolio") || path.startsWith("/account")) {
      queueFlashToast("Signed out successfully.", "info");
      router.push(`/?next=${encodeURIComponent(path)}`);
      return;
    }
    showToast("Signed out. You are continuing as a guest.", "info");
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
        <span className="profile-pill">{workspace.riskProfile} profile</span>

        <button
          type="button"
          className="theme-toggle"
          onClick={theme.cyclePreference}
          title={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
          aria-label={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
        >
          {theme.preference === "system" ? <Monitor aria-hidden="true" /> : theme.resolvedTheme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>

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
                  <Link href="/?mode=register" role="menuitem">
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
