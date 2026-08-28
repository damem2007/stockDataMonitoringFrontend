"use client";

import { ExternalLink } from "lucide-react";
import { formatCell } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function NewsView() {
  const { analysis, symbol } = useInstrument();
  const rows = analysis?.news || [];
  if (!rows.length) {
    return (
      <section className="info-panel">
        <h2>News</h2>
        <p className="muted">No symbol-specific news matched {symbol}. Generic market headlines are intentionally filtered out.</p>
      </section>
    );
  }
  return (
    <section className="info-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">News</p>
          <h2>{symbol} sources</h2>
        </div>
        <span className="news-count">{rows.length} matched</span>
      </div>
      <div className="news-list">
        {rows.map((row, index) => {
          const url = String(row.Url || "");
          return (
            <article className="news-card" key={`${String(row.Title)}-${index}`}>
              <div>
                <span className="news-source">{formatCell(row.Source)}</span>
                <time>{formatDate(row.Published)}</time>
              </div>
              <h3>{formatCell(row.Title)}</h3>
              <p>{cleanSummary(row.Summary)}</p>
              <footer>
                <span>Sentiment {sentimentLabel(Number(row.Sentiment))}</span>
                {row.MatchedAliases ? <span>Matched {formatCell(row.MatchedAliases)}</span> : null}
                {url ? <a href={url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} aria-hidden="true" /></a> : null}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return date.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function cleanSummary(value: unknown) {
  const text = String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return decodeEntities(text || "No summary available.");
}

function decodeEntities(value: string) {
  if (typeof window === "undefined") return value;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function sentimentLabel(value: number) {
  if (!Number.isFinite(value)) return "n/a";
  if (value > 0.15) return `positive (${value.toFixed(2)})`;
  if (value < -0.15) return `negative (${value.toFixed(2)})`;
  return `neutral (${value.toFixed(2)})`;
}
