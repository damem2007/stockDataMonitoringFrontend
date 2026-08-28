"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAnalysis, getCorrelation } from "@/lib/api";
import type { AlertRule, AnalysisPayload, CorrelationPayload, Instrument } from "@/lib/types";
import { cleanSymbol, effectiveInterval, effectivePeriod, emptyInstrument } from "@/lib/workspace-utils";
import { useWorkspace } from "@/providers/workspace-provider";
import { useToast } from "@/providers/toast-provider";

type InstrumentContextValue = {
  symbol: string;
  context: "watchlist" | "portfolio";
  selectedInstrument?: Instrument;
  portfolioRow?: Record<string, unknown>;
  analysis: AnalysisPayload | null;
  analysisLoading: boolean;
  period: string;
  interval: string;
  dateRange: string;
  chartType: string;
  compareSymbol: string;
  compareAnalysis: AnalysisPayload | null;
  temporarySymbol: string;
  temporaryAnalysis: AnalysisPayload | null;
  correlation: CorrelationPayload | null;
  compareOptions: string[];
  newAlert: AlertRule;
  alertModalOpen: boolean;
  setPeriod: (value: string) => void;
  setInterval: (value: string) => void;
  setDateRange: (value: string) => void;
  setChartType: (value: string) => void;
  setCompareSymbol: (value: string) => void;
  setTemporarySymbol: (value: string) => void;
  setNewAlert: (value: AlertRule) => void;
  setAlertModalOpen: (value: boolean) => void;
  loadAnalysis: () => Promise<void>;
  loadTemporaryComparison: () => Promise<void>;
  promoteTemporary: (role: "Watching" | "Trading") => Promise<Instrument | null>;
  loadCorrelation: () => Promise<void>;
  submitAlert: () => Promise<void>;
  updatePreferences: (patch: Partial<Instrument>) => Promise<void>;
};

const InstrumentContext = createContext<InstrumentContextValue | null>(null);

export function InstrumentProvider({ symbol, context, children }: { symbol: string; context: "watchlist" | "portfolio"; children: React.ReactNode }) {
  const workspace = useWorkspace();
  const { reportError, showToast } = useToast();
  const normalized = cleanSymbol(symbol);
  const selectedInstrument = workspace.instruments.find((item) => cleanSymbol(item.symbol) === normalized);
  const portfolioRow = (workspace.portfolio?.portfolio || []).find((row) => cleanSymbol(row.Symbol) === normalized);
  const requestRef = useRef(0);

  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [period, setPeriod] = useState("2y");
  const [interval, setInterval] = useState("1d");
  const [dateRange, setDateRange] = useState("1Y");
  const [chartType, setChartType] = useState("Line");
  const [compareSymbol, setCompareSymbol] = useState("");
  const [compareAnalysis, setCompareAnalysis] = useState<AnalysisPayload | null>(null);
  const [temporarySymbol, setTemporarySymbol] = useState("");
  const [temporaryAnalysis, setTemporaryAnalysis] = useState<AnalysisPayload | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationPayload | null>(null);
  const [newAlert, setNewAlert] = useState<AlertRule>({
    symbol: normalized,
    metric: "Price",
    operator: "Crossing Up",
    threshold: 0,
    trigger: "Once only",
    notifications: ["In-app", "Toast"],
  });
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const compareOptions = useMemo(
    () => workspace.activeSymbols.filter((candidate) => cleanSymbol(candidate) !== normalized),
    [workspace.activeSymbols, normalized],
  );

  const analysisParams = useCallback((includeIntent = true) => {
    const params = new URLSearchParams({
      period: effectivePeriod(dateRange, period),
      interval: effectiveInterval(dateRange, interval),
      risk_profile: workspace.riskProfile,
    });
    if (includeIntent) {
      params.set("intent", String(selectedInstrument?.intent || "Hold / Watch"));
      params.set("strategy", String(selectedInstrument?.strategy || "Buy-dip"));
    }
    return params;
  }, [dateRange, interval, period, selectedInstrument?.intent, selectedInstrument?.strategy, workspace.riskProfile]);

  const loadAnalysis = useCallback(async () => {
    if (!normalized) return;
    const requestId = ++requestRef.current;
    setAnalysisLoading(true);
    try {
      const result = await getAnalysis(normalized, analysisParams(true));
      if (requestRef.current !== requestId) return;
      setAnalysis(result);
      if (!result.ok) showToast(result.sourceStatus || `No market data returned for ${normalized}.`, "error");
    } catch (error) {
      if (requestRef.current !== requestId) return;
      reportError(error, "Could not load instrument analysis.");
    } finally {
      if (requestRef.current === requestId) setAnalysisLoading(false);
    }
  }, [analysisParams, normalized, reportError, showToast]);

  useEffect(() => { void loadAnalysis(); }, [loadAnalysis]);

  useEffect(() => {
    if (!compareSymbol) {
      setCompareAnalysis(null);
      return;
    }
    getAnalysis(cleanSymbol(compareSymbol), analysisParams(false))
      .then(setCompareAnalysis)
      .catch((error) => {
        reportError(error, "Could not load comparison analysis.");
        setCompareAnalysis(null);
      });
  }, [compareSymbol, analysisParams, reportError]);

  useEffect(() => {
    setNewAlert((current) => ({ ...current, symbol: normalized }));
  }, [normalized]);

  async function loadTemporaryComparison() {
    if (!temporarySymbol.trim()) return;
    try {
      setTemporaryAnalysis(await getAnalysis(cleanSymbol(temporarySymbol), analysisParams(false)));
    } catch (error) {
      reportError(error, "Could not load temporary comparison.");
    }
  }

  async function promoteTemporary(role: "Watching" | "Trading") {
    if (!temporaryAnalysis?.symbol) return null;
    const promoted: Instrument = {
      ...emptyInstrument(role),
      symbol: temporaryAnalysis.symbol,
      role,
      watch_reason: role === "Watching" ? "Temporary comparison promoted to watchlist" : "",
    };
    if (role === "Watching") {
      await workspace.persistInstruments([
        ...workspace.instruments.filter((item) => cleanSymbol(item.symbol) !== cleanSymbol(promoted.symbol)),
        promoted,
      ]);
    }
    return promoted;
  }

  const loadCorrelation = useCallback(async () => {
    if (workspace.activeSymbols.length < 2) {
      setCorrelation(null);
      return;
    }
    const params = new URLSearchParams({
      period: effectivePeriod(dateRange, period),
      interval: effectiveInterval(dateRange, interval),
    });
    try {
      setCorrelation(await getCorrelation(workspace.activeSymbols.slice(0, 8), params));
    } catch (error) {
      reportError(error, "Could not load correlation.");
    }
  }, [workspace.activeSymbols, dateRange, period, interval, reportError]);

  async function submitAlert() {
    const result = await workspace.createWorkspaceAlert({ ...newAlert, symbol: normalized });
    if (result) setAlertModalOpen(false);
  }

  async function updatePreferences(patch: Partial<Instrument>) {
    await workspace.updateInstrumentPreferences(normalized, patch);
  }

  const value = useMemo<InstrumentContextValue>(() => ({
    symbol: normalized,
    context,
    selectedInstrument,
    portfolioRow,
    analysis,
    analysisLoading,
    period,
    interval,
    dateRange,
    chartType,
    compareSymbol,
    compareAnalysis,
    temporarySymbol,
    temporaryAnalysis,
    correlation,
    compareOptions,
    newAlert,
    alertModalOpen,
    setPeriod,
    setInterval,
    setDateRange,
    setChartType,
    setCompareSymbol,
    setTemporarySymbol,
    setNewAlert,
    setAlertModalOpen,
    loadAnalysis,
    loadTemporaryComparison,
    promoteTemporary,
    loadCorrelation,
    submitAlert,
    updatePreferences,
  }), [normalized, context, selectedInstrument, portfolioRow, analysis, analysisLoading, period, interval, dateRange, chartType, compareSymbol, compareAnalysis, temporarySymbol, temporaryAnalysis, correlation, compareOptions, newAlert, alertModalOpen, loadAnalysis]);

  return <InstrumentContext.Provider value={value}>{children}</InstrumentContext.Provider>;
}

export function useInstrument() {
  const context = useContext(InstrumentContext);
  if (!context) throw new Error("useInstrument must be used inside InstrumentProvider");
  return context;
}
