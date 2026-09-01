"use client";

import { useEffect, useState } from "react";
import { searchTickers } from "@/lib/api";
import { INTENTS, STRATEGIES } from "@/lib/constants";
import type { Exchange, Instrument, TickerSuggestion } from "@/lib/types";
import { currencyForSymbol, emptyInstrument, money, today } from "@/lib/workspace-utils";

function updateRow(
  setRows: React.Dispatch<React.SetStateAction<Instrument[]>>,
  index: number,
  patch: Partial<Instrument>,
) {
  setRows((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
}

function TickerInput({
  value,
  markets,
  disabled = false,
  onChange,
}: {
  value: string;
  markets: Exchange[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [results, setResults] = useState<TickerSuggestion[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (!query || disabled) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchTickers(query, markets)
        .then((response) => setResults(response.results))
        .catch(() => setResults([]));
    }, 260);
    return () => clearTimeout(timer);
  }, [disabled, markets, value]);

  return (
    <div className="ticker-input-wrap">
      <input disabled={disabled} value={value} placeholder="Ticker or company" onChange={(event) => onChange(event.target.value)} />
      {value.trim() && results.length > 0 ? (
        <div className="ticker-suggestions">
          {results.slice(0, 6).map((result) => (
            <button
              disabled={disabled}
              key={`${result.symbol}-${result.market}`}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(result.symbol);
                setResults([]);
              }}
            >
              <strong>{result.symbol}</strong>
              <span>{result.name || result.label}</span>
              <em>{result.market} · {result.currency}</em>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function InstrumentEditor({
  rows,
  setRows,
  trading,
  markets,
  disabled = false,
}: {
  rows: Instrument[];
  setRows: React.Dispatch<React.SetStateAction<Instrument[]>>;
  trading: boolean;
  markets: Exchange[];
  disabled?: boolean;
}) {
  return (
    <div className="editor-grid">
      {rows.map((item, index) => (
        <article className="instrument-row" key={index}>
          <TickerInput disabled={disabled} value={item.symbol} markets={markets} onChange={(symbol) => updateRow(setRows, index, { symbol })} />
          {trading ? (
            <input
              disabled={disabled}
              type="date"
              value={item.purchase_date || today()}
              onChange={(event) => updateRow(setRows, index, { purchase_date: event.target.value })}
            />
          ) : null}
          {trading ? (
            <input
              disabled={disabled}
              type="number"
              min="0"
              step="0.01"
              value={item.average_cost || ""}
              placeholder="Avg price"
              onChange={(event) => {
                const average_cost = Number(event.target.value);
                updateRow(setRows, index, { average_cost, book_cost: average_cost * (item.shares || 0) });
              }}
            />
          ) : null}
          {trading ? (
            <input
              disabled={disabled}
              type="number"
              min="0"
              step="1"
              value={item.shares || ""}
              placeholder="Shares"
              onChange={(event) => {
                const shares = Number(event.target.value);
                updateRow(setRows, index, { shares, book_cost: (item.average_cost || 0) * shares });
              }}
            />
          ) : null}
          {trading ? (
            <div className="computed-cost">
              <span>Book cost</span>
              <strong>{money((item.average_cost || 0) * (item.shares || 0), currencyForSymbol(item.symbol))}</strong>
            </div>
          ) : (
            <input
              disabled={disabled}
              value={item.watch_reason || ""}
              placeholder="Reason for watchlist"
              onChange={(event) => updateRow(setRows, index, { watch_reason: event.target.value })}
            />
          )}
          <select disabled={disabled} value={item.intent || "Hold / Watch"} onChange={(event) => updateRow(setRows, index, { intent: event.target.value })}>
            {INTENTS.map((intent) => (
              <option key={intent}>{intent}</option>
            ))}
          </select>
          <select disabled={disabled} value={item.strategy || "Buy-dip"} onChange={(event) => updateRow(setRows, index, { strategy: event.target.value })}>
            {STRATEGIES.map((strategy) => (
              <option key={strategy}>{strategy}</option>
            ))}
          </select>
          <button
            aria-label={`Remove ${item.symbol || "row"}`}
            className="symbol-remove"
            disabled={disabled}
            onClick={() => setRows((current) => {
              const next = current.filter((_, rowIndex) => rowIndex !== index);
              return next.length ? next : [emptyInstrument(trading ? "Trading" : "Watching")];
            })}
            type="button"
          >
            X
          </button>
        </article>
      ))}
    </div>
  );
}
