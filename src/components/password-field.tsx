"use client";

import { useMemo, useState } from "react";

export type PasswordPolicy = {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecial?: boolean;
};

export function passwordStrength(password: string, policy: PasswordPolicy = {}) {
  const checks = [
    password.length >= (policy.minLength || 12),
    policy.requireUppercase === false || /[A-Z]/.test(password),
    policy.requireLowercase === false || /[a-z]/.test(password),
    policy.requireNumber === false || /\d/.test(password),
    policy.requireSpecial === false || /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  return { score, label: score <= 2 ? "Weak" : score <= 4 ? "Good" : "Strong" };
}

export function PasswordField({
  value,
  onChange,
  label = "Password",
  placeholder,
  required = false,
  showStrength = false,
  policy,
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showStrength?: boolean;
  policy?: PasswordPolicy;
  autoComplete?: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => passwordStrength(value, policy), [policy, value]);

  return (
    <label className="password-field">
      <span>{label}</span>
      <span className="password-field-wrap">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
        />
        <button type="button" className="password-visibility" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible((current) => !current)}>
          {visible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.4 5.3A9.3 9.3 0 0 1 12 5c5 0 8.4 4.1 9.4 5.6a2.5 2.5 0 0 1 0 2.8 15.4 15.4 0 0 1-2 2.4" />
              <path d="M6.1 6.1a15.5 15.5 0 0 0-3.5 4.5 2.5 2.5 0 0 0 0 2.8C3.6 14.9 7 19 12 19a9.3 9.3 0 0 0 4.2-1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M2.6 10.6C3.6 9.1 7 5 12 5s8.4 4.1 9.4 5.6a2.5 2.5 0 0 1 0 2.8C20.4 14.9 17 19 12 19s-8.4-4.1-9.4-5.6a2.5 2.5 0 0 1 0-2.8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
      {showStrength && value ? (
        <span className={`password-strength password-strength-${strength.score}`}>{strength.label}</span>
      ) : null}
    </label>
  );
}
