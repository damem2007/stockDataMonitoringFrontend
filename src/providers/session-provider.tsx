"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login, registerAccount, updateAccountPassword, updateAccountProfile } from "@/lib/api";
import { clearAccessToken, getAccessToken, getTokenExpiry, setAccessToken } from "@/lib/auth-token";
import { USER_STORAGE_KEY } from "@/lib/constants";
import type { User } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";

type SessionContextValue = {
  initializing: boolean;
  appLoading: boolean;
  token: string | null;
  user: User | null;
  signIn: (loginName: string, password: string) => Promise<User>;
  register: (email: string, username: string, fullName: string, password: string) => Promise<User>;
  updateProfile: (patch: { email?: string; username?: string; full_name?: string }) => Promise<User>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { reportError, showToast } = useToast();
  const [initializing, setInitializing] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedToken = getAccessToken();
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    const expiry = storedToken ? getTokenExpiry(storedToken) : null;
    if (storedToken && expiry && expiry <= Date.now()) {
      clearAccessToken();
      window.localStorage.removeItem(USER_STORAGE_KEY);
      showToast("Your session expired. Continue as guest or sign in again.", "info");
      setInitializing(false);
      return;
    }
    if (storedToken) setToken(storedToken);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
      } catch {
        window.localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    setInitializing(false);
  }, [showToast]);

  useEffect(() => {
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const timeout = window.setTimeout(() => {
      setToken(null);
      setUser(null);
      clearAccessToken();
      window.localStorage.removeItem(USER_STORAGE_KEY);
      showToast("Your session expired. Continue as guest or sign in again.", "info");
    }, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [showToast, token]);

  const signIn = useCallback(async (loginName: string, password: string) => {
    setAppLoading(true);
    try {
      const result = await login(loginName, password);
      setToken(result.access_token);
      setUser(result.user);
      setAccessToken(result.access_token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      showToast(`Signed in as ${result.user.name}.`, "success");
      return result.user;
    } catch (error) {
      reportError(error, "Sign-in failed.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }, [reportError, showToast]);

  const register = useCallback(async (email: string, username: string, fullName: string, password: string) => {
    setAppLoading(true);
    try {
      const result = await registerAccount(email, username, fullName, password);
      setToken(result.access_token);
      setUser(result.user);
      setAccessToken(result.access_token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      showToast(`Account created for ${result.user.name}.`, "success");
      return result.user;
    } catch (error) {
      reportError(error, "Account registration failed.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }, [reportError, showToast]);

  const updateProfile = useCallback(async (patch: { email?: string; username?: string; full_name?: string }) => {
    if (!token) throw new Error("Sign in is required.");
    setAppLoading(true);
    try {
      const result = await updateAccountProfile(token, patch);
      setToken(result.access_token);
      setUser(result.user);
      setAccessToken(result.access_token);
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(result.user));
      showToast("Profile updated.", "success");
      return result.user;
    } catch (error) {
      reportError(error, "Could not update profile.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }, [reportError, showToast, token]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error("Sign in is required.");
    setAppLoading(true);
    try {
      await updateAccountPassword(token, currentPassword, newPassword);
      showToast("Password updated.", "success");
    } catch (error) {
      reportError(error, "Could not update password.");
      throw error;
    } finally {
      setAppLoading(false);
    }
  }, [reportError, showToast, token]);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAccessToken();
    window.localStorage.removeItem(USER_STORAGE_KEY);
    //if(sessionStorage.user == "Guest user" || sessionStorage.username)
  }, []);

  const value = useMemo(() => ({ initializing, appLoading, token, user, signIn, register, updateProfile, updatePassword, signOut }), [initializing, appLoading, token, user, signIn, register, updateProfile, updatePassword, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
