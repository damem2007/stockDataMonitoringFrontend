"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/lib/config";
import { formatCell } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function NewsView() {
  const { analysis, symbol } = useInstrument();
  const rows = analysis?.news || [];
  const pageSize = Math.max(1, DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);
  const firstShown = rows.length ? (safePage - 1) * pageSize + 1 : 0;
  const lastShown = Math.min(rows.length, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [symbol, rows.length]);

  if (!rows.length) {
    return (
      <section className="ss-instrument-panel ss-empty-panel">
        <p className="ss-eyebrow">News</p>
        <h2>News</h2>
        <p className="ss-muted">No symbol-specific news matched {symbol}. Generic market headlines are intentionally filtered out.</p>
      </section>
    );
  }
  return (
    <section className="ss-instrument-panel ss-news-panel">
      <div className="ss-section-heading">
        <div>
          <p className="ss-eyebrow">News</p>
          <h2>{symbol} sources</h2>
        </div>
        <span className="news-count">{firstShown}-{lastShown} of {rows.length} matched</span>
      </div>
      <div className="news-list">
        {visibleRows.map((row, index) => {
          const url = String(row.Url || "");
          return (
            <article className="news-card" key={`${String(row.Title)}-${safePage}-${index}`}>
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
      {pageCount > 1 ? (
        <nav className="ss-pagination" aria-label="News pagination">
          <button type="button" className="ss-btn" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <span className="ss-page-meta">Page {safePage} of {pageCount}</span>
          <button type="button" className="ss-btn" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            Next
          </button>
        </nav>
      ) : null}
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
