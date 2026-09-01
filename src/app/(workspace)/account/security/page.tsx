"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { PasswordField } from "@/components/auth/password-field";
import { useSession } from "@/providers/session-provider";

export default function Page() {
  const session = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await session.updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      // SessionProvider reports password update failures through the shared toast system.
    }
  }

  return (
    <main className="dashboard-shell"><div className="dashboard-content"><section className="dashboard-main">
      <section className="surface-section account-panel"><p className="eyebrow">Account</p><h1>Security</h1><p className="muted">Update the password used for JWT sign-in sessions.</p>
        <form className="account-form" onSubmit={submit}>
          <PasswordField value={currentPassword} onChange={setCurrentPassword} label="Current password" autoComplete="current-password" required />
          <PasswordField value={newPassword} onChange={setNewPassword} label="New password" autoComplete="new-password" showStrength required />
          <button className="primary" type="submit" disabled={session.appLoading || !currentPassword || !newPassword}>
            {session.appLoading ? <LoaderCircle className="button-spinner" size={16} /> : null}
            {session.appLoading ? "Updating password" : "Update password"}
          </button>
        </form>
      </section>
    </section></div></main>
  );
}
