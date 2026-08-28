"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastTone = "error" | "success" | "info";
export type ToastMessage = { id: number; tone: ToastTone; text: string };

type ToastContextValue = {
  toasts: ToastMessage[];
  showToast: (text: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  reportError: (error: unknown, fallback: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((text: string, tone: ToastTone = "error") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => dismissToast(id), 5500);
  }, [dismissToast]);

  const reportError = useCallback((error: unknown, fallback: string) => {
    showToast(error instanceof Error ? error.message : fallback, "error");
  }, [showToast]);

  const value = useMemo(() => ({ toasts, showToast, dismissToast, reportError }), [toasts, showToast, dismissToast, reportError]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
