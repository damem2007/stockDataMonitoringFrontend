import { formatCell } from "../../lib/workspace-utils";
export function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>; }
export function TablePanel({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p className="muted">No data available.</p>;
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return <div className="table-wrap"><table><thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{columns.map((c)=><td key={c}>{formatCell(row[c])}</td>)}</tr>)}</tbody></table></div>;
}
export function JsonPanel({ title, data }: { title: string; data: unknown }) { return <section><h2>{title}</h2><pre className="json-panel">{JSON.stringify(data, null, 2)}</pre></section>; }
