"use client";

import { useInstrument } from "@/providers/instrument-provider";

export function SummaryView() {
  const { analysis } = useInstrument();
  return analysis?.summary
    ? <div className="brief-html" dangerouslySetInnerHTML={{ __html: analysis.summary.html }} />
    : <p className="muted">Summary is not available yet.</p>;
}
