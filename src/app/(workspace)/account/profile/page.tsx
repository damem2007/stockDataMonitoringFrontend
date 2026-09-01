"use client";

import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useSession } from "@/providers/session-provider";

export default function Page() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    setEmail(session.user?.email || "");
    setUsername(session.user?.username || "");
    setFullName(session.user?.name || "");
  }, [session.user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await session.updateProfile({ email, username, full_name: fullName });
    } catch {
      // SessionProvider reports profile update failures through the shared toast system.
    }
  }

  return (
    <main className="dashboard-shell"><div className="dashboard-content"><section className="dashboard-main">
      <section className="surface-section account-panel"><p className="eyebrow">Account</p><h1>Profile</h1><p className="muted">Manage the account identity used for saved watchlists, portfolio holdings, alerts, and subscription access.</p>
        <form className="account-form" onSubmit={submit}>
          <label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <button className="primary" type="submit" disabled={session.appLoading}>
            {session.appLoading ? <LoaderCircle className="button-spinner" size={16} /> : null}
            {session.appLoading ? "Saving profile" : "Save profile"}
          </button>
        </form>
      </section>
    </section></div></main>
  );
}
