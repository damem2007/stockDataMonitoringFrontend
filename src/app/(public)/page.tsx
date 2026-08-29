"use client";

import Link from "next/link";
import { BriefcaseBusiness, ChartNoAxesCombined, Monitor, Sun, Moon } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { ScreenLoader, ToastStack } from "@/components/ui/feedback";
import { GUEST_WORKSPACE_KEY } from "@/lib/constants";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/providers/toast-provider";
import { useTheme } from "@/providers/theme-provider";
//import { AVATAR_COLORS } from "@/components/navigation/top-nav";
import LoginPage from "@/app/(public)/login/page";


export default function Home() {
  const router = useRouter();
  const session = useSession();
  const { toasts, dismissToast } = useToast();

  const [guestWorkspaceExists, setGuestWorkspaceExists] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [nextPath, setNextPath] = useState("/portfolio");

  const theme = useTheme();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
      const parsed = raw ? (JSON.parse(raw) as { instruments?: unknown[] }) : null;
      setGuestWorkspaceExists(Boolean(parsed?.instruments?.length));

      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get("next");
      if (requestedNext?.startsWith("/") && !requestedNext.startsWith("//")) {
        setNextPath(requestedNext);
      }
      if (params.get("signin") === "1") {
        setShowSignIn(true);
      }
    } catch {
      setGuestWorkspaceExists(false);
    }
  }, []);

  async function handlePortfolioAction() {
    if (session.user) {
      router.push(nextPath);
      return;
    }
    router.push(`/?next=${encodeURIComponent(nextPath)}`);
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginName.trim() || !password || session.appLoading) return;

    try {
      await session.signIn(loginName.trim(), password);
      setPassword("");
      router.push(nextPath);
    } catch {
      // SessionProvider reports the error through the shared toast system.
    }
  }

  function cancelSignIn() {
    setShowSignIn(false);
    setPassword("");
  }

  if (session.initializing) {
    return <ScreenLoader label="Loading workspace" />;
  }

  return (
    <main className="workspace-shell">
      {session.appLoading && <ScreenLoader label="Processing" />}
      <ToastStack toasts={toasts} dismissToast={dismissToast} />

      <section className="choice-panel">
        <div className="choice-intro">
          <Link href="/" className="brand-link">
            <strong className="eyebrow">StockSignal</strong>
          </Link>
          <p className="eyebrow">Stock workspace</p>
          <button
            type="button"
            className="theme-toggle"
            onClick={theme.cyclePreference}
            title={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
            aria-label={`Theme: ${theme.preference === "system" ? "System" : theme.preference === "light" ? "Day" : "Night"}`}
          >
            {theme.preference === "system" ? <Monitor aria-hidden="true" /> : theme.resolvedTheme === "light" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <h1>Start with the workflow you need today</h1>
          <p className="muted">
            Search and analyze tickers as a guest with a browser-local watchlist, or sign in to save watchlists, track holdings, and use premium portfolio dashboards.
          </p>
          <div className="capability-chips">
            {["RSI", "MACD", "ADX", "ML model", "Backtested"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="choice-grid">
          <button
            type="button"
            className="choice-card"
            onClick={() => router.push(guestWorkspaceExists ? "/watchlist" : "/watchlist/setup")}
          >
            <span className="choice-icon" aria-hidden="true">
              <ChartNoAxesCombined />
            </span>
            <small>Research</small>
            <strong>Watchlist</strong>
            <span>
              Search tickers, run signals, backtests, and ML checks. Stored only in this browser until you sign in.
            </span>
            <em>{guestWorkspaceExists ? "Open workspace" : "Create workspace"}</em>
          </button>

          <div className={`choice-card${showSignIn && !session.user ? " choice-card-signin" : ""}`}>
            <span className="choice-icon" aria-hidden="true">
              <BriefcaseBusiness />
            </span>
            <small>Full access</small>
            <strong>Portfolio</strong>
            <span>
              Save watchlists, track holdings, cost basis, P/L, and portfolio-level signals. Premium sign-in required.
            </span>

            {session.user ? (
              <button type="button" className="primary" onClick={handlePortfolioAction}>
                Continue as {session.user.username}
              </button>
            ) : showSignIn ? (
              <form className="landing-signin-form" onSubmit={handleSignIn}>
                <label className="landing-signin-field">
                  <input type="text" value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="username" placeholder="Username or email" required autoFocus />
                </label>
                <PasswordField value={password} onChange={setPassword} label="" placeholder="Password" required autoComplete="current-password" />
                <div className="landing-signin-actions">
                  <button type="button" onClick={cancelSignIn} disabled={session.appLoading}> Cancel </button>
                  <button type="submit" className="primary" disabled={session.appLoading || !loginName.trim() || !password}>
                    {session.appLoading ? "Signing in…" : "Sign in"}
                  </button>
                </div>
              </form>
            ) : (
              <LoginPage />
              /*<button type="button" className="primary" onClick={handlePortfolioAction}>
                Sign in
              </button>*/
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
