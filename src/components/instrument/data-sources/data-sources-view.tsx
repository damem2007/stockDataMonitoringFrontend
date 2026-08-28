"use client";

import { TablePanel } from "@/components/ui/data";
import { formatCell } from "@/lib/workspace-utils";
import { useInstrument } from "@/providers/instrument-provider";

export function DataSourcesView() {
  const { analysis, symbol } = useInstrument();
  const snapshot = analysis?.snapshot || {};
  const sourceRows = [
    { area: "Price history", status: analysis?.sourceStatus || "Not loaded" },
    { area: "Company profile", status: analysis?.snapshotStatus || "Not loaded" },
    { area: "Earnings calendar", status: analysis?.earningsStatus || "Not loaded" },
    { area: "News", status: `${analysis?.news?.length || 0} symbol-specific items matched` },
  ];
  const profileRows = [
    {
      symbol,
      exchange: snapshot.exchange,
      currency: snapshot.currency,
      sector: snapshot.sector,
      industry: snapshot.industry,
      website: snapshot.website,
    },
  ];
  return (
    <section className="info-panel data-source-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Data Sources</p>
          <h2>Analysis provenance</h2>
        </div>
      </div>
      <TablePanel rows={sourceRows} />
      <h3>Profile fields</h3>
      <TablePanel rows={profileRows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, formatCell(value)])))} />
    </section>
  );
}
