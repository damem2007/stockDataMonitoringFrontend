"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { requestVerificationLink, verifyAccount } from "@/lib/api";
import { setAccessToken } from "@/lib/auth-token";
import { USER_STORAGE_KEY } from "@/lib/constants";

type VerificationState = "checking" | "verified" | "failed";

function AccountVerificationContent() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<VerificationState>("checking");
  const [message, setMessage] = useState("Checking your verification link...");
  const [verificationLogin, setVerificationLogin] = useState("");
  const [manualResend, setManualResend] = useState(false);
  const [resendBlocked, setResendBlocked] = useState(false);
  const [requestingLink, setRequestingLink] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("failed");
      setMessage("This verification link is missing a token.");
      setManualResend(true);
      return;
    }

    let cancelled = false;
    verifyAccount(token)
      .then((result) => {
        if (cancelled) return;
        setAccessToken(result.access_token);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
        setState("verified");
        setMessage("Your account has been verified. You can continue to your workspace.");
      })
      .catch((error) => {
        if (cancelled) return;
        const text = error instanceof Error ? error.message : "Verification failed. Please request a new link.";
        setState("failed");
        setMessage(text);
        setManualResend(text.toLowerCase().includes("invalid"));
        setResendBlocked(text.toLowerCase().includes("no longer matches an active account"));
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const Icon = state === "checking" ? Loader2 : state === "verified" ? CheckCircle2 : XCircle;

  async function requestNewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const login = verificationLogin.trim();
    const useManualFallback = manualResend || !token;
    if (useManualFallback && !login) {
      setRequestMessage("Enter your email or username to request a new link.");
      return;
    }
    setRequestingLink(true);
    setRequestMessage("");
    try {
      await requestVerificationLink(useManualFallback ? { login } : { token });
      setRequestMessage("If the account exists and needs verification, a new link has been sent.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not request a new verification link.";
      setRequestMessage(text);
      if (text.toLowerCase().includes("invalid")) setManualResend(true);
      if (text.toLowerCase().includes("no longer matches an active account")) setResendBlocked(true);
    } finally {
      setRequestingLink(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel verification-panel">
        <span className={`verification-icon ${state}`}>
          <Icon aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Account verification</p>
          <h1>{state === "verified" ? "Account verified" : state === "failed" ? "Verification failed" : "Verifying account"}</h1>
          <p className="muted">{message}</p>
        </div>
        {state === "failed" && !resendBlocked ? (
          <form className="verification-resend-form" onSubmit={requestNewLink}>
            {manualResend || !token ? (
              <label>
                <span>Email or username</span>
                <input
                  value={verificationLogin}
                  onChange={(event) => setVerificationLogin(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                />
              </label>
            ) : null}
            <button className="button-link primary" type="submit" disabled={requestingLink}>
              {requestingLink ? "Requesting..." : "Request new link"}
            </button>
            {requestMessage ? <p className="muted">{requestMessage}</p> : null}
          </form>
        ) : null}
        <div className="inline-actions">
          {state === "verified" ? <Link className="button-link primary" href="/watchlist">Continue to workspace</Link> : null}
          {state === "failed" ? <Link className="button-link primary" href="/login?mode=register">Create account</Link> : null}
          <Link className="button-link" href="/">Back to landing page</Link>
        </div>
      </section>
    </main>
  );
}

export default function AccountVerificationPage() {
  return (
    <Suspense fallback={<main className="login-page"><section className="login-panel">Checking your verification link...</section></main>}>
      <AccountVerificationContent />
    </Suspense>
  );
}
