"use client";

import type { ToastMessage } from "@/providers/toast-provider";

export function ToastStack({ toasts, dismissToast }: { toasts: ToastMessage[]; dismissToast: (id: number) => void }) {
  if (!toasts.length) return null;
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <article className={`toast toast-${toast.tone}`} key={toast.id}><span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>x</button></article>)}</div>;
}

export function ScreenLoader({ label }: { label: string }) {
  return <div className="screen-loader" role="status"><div className="loader-box"><span className="spinner"/><strong>{label}</strong></div></div>;
}