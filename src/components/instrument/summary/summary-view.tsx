"use client";

import { useInstrument } from "@/providers/instrument-provider";

export function SummaryView() {
  const { analysis } = useInstrument();
  return analysis?.summary
    ? <div className="brief-html summary-brief" dangerouslySetInnerHTML={{ __html: analysis.summary.html }} />
    : <p className="summary-brief summary-empty">Summary is not available yet.</p>;
}
