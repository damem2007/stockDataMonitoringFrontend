"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordField } from "@/components/auth/password-field";
import { ScreenLoader, ToastStack } from "@/components/ui/feedback";
import { GUEST_WORKSPACE_KEY } from "@/lib/constants";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/providers/toast-provider";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const { toasts, dismissToast } = useToast();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [loginName, setLoginName] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [guestWorkspaceExists, setGuestWorkspaceExists] = useState(false);
  const nextPath = params.get("next")?.startsWith("/") ? params.get("next") || "/portfolio" : "/portfolio";

  useEffect(() => {
    if (session.user) router.replace(nextPath);
    if (params.get("mode") === "register") {
      setMode("register");
    }
    try {
      const raw = window.localStorage.getItem(GUEST_WORKSPACE_KEY);
      const parsed = raw ? JSON.parse(raw) as { instruments?: unknown[] } : null;
      setGuestWorkspaceExists(Boolean(parsed?.instruments?.length));
    } catch {
      setGuestWorkspaceExists(false);
    }
  }, [nextPath, params, router, session.user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (session.appLoading) return;

    try {
      if (mode === "register") {
        await session.register(email.trim(), username.trim() || email.split("@")[0] || "", fullName.trim(), password);
      } else {
        await session.signIn(loginName.trim(), password);
      }
      setPassword("");
      router.replace(nextPath);
    } catch {
      // SessionProvider reports the error through the shared toast system.
    }
  }

  if (session.initializing) return <ScreenLoader label="Loading sign-in" />;

  return (
    <main className="login-page">
      {session.appLoading && <ScreenLoader label={mode === "register" ? "Creating account" : "Signing in"} />}
      <ToastStack toasts={toasts} dismissToast={dismissToast} />
      <section className="login-panel">
        {/*<div className="login-brand"><ShieldCheck aria-hidden="true" /><span>StockSignal</span></div>*/}
        <div><p className="eyebrow"> <ShieldCheck aria-hidden="true" /> Secure workspace - {mode === "register" ? "Create account" : "Sign in"}</p>{/*<p className="muted">Save watchlists, manage portfolio holdings, and use premium portfolio-level analysis.</p>*/}</div>
        <form className="account-form" onSubmit={submit}>
          {mode === "register" ? <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" /></label> : null}
          {mode === "register" ? <label>Email <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" type="email" required /></label> : <input value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="email" placeholder="Username or email" required />}
          {mode === "register" ? <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label> : null}
          <PasswordField value={password} onChange={setPassword} label="" placeholder="Enter password" autoComplete={mode === "register" ? "new-password" : "current-password"} showStrength={mode === "register"} required />
          <button type="submit" className="primary" disabled={mode === "register" ? !username || !email || !password || session.appLoading : !loginName || !password || session.appLoading}>{mode === "register" ? <UserPlus size={16} /> : <LockKeyhole size={16} />} {mode === "register" ? "Create account" : "Sign in"}</button>
        </form>
        <button className="text-button" type="button" onClick={() => setMode(mode === "register" ? "signin" : "register")}>{mode === "register" ? "Already have an account? Sign in" : "Create an account"}</button>
        {/* <button className="text-button" type="button" onClick={() => router.push(guestWorkspaceExists ? "/watchlist" : "/watchlist/setup")}>{guestWorkspaceExists ? "Continue as guest" : "Use as guest"}</button> */}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<ScreenLoader label="Loading sign-in" />}><LoginContent /></Suspense>;
}
