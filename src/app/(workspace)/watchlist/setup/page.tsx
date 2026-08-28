"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/workspace-provider";
import { InstrumentEditor } from "@/components/onboarding/instrument-editor";
import { emptyInstrument } from "@/lib/workspace-utils";
import type { Exchange, Instrument } from "@/lib/types";
export default function Page(){const w=useWorkspace();const router=useRouter();const [rows,setRows]=useState<Instrument[]>([emptyInstrument("Watching")]);return <main className="workspace-shell"><section className="onboarding-panel"><header className="workflow-header"><div><h1>Watchlist Onboarding</h1><p className="muted">Add the instruments you want to research or monitor.</p></div><div className="segmented">{(["TSX","NYSE","NASDAQ"] as Exchange[]).map(m=><button className={w.selectedMarkets.includes(m)?"active":""} key={m} onClick={()=>w.toggleMarket(m)}>{m}</button>)}</div></header><InstrumentEditor rows={rows} setRows={setRows} trading={false} markets={w.selectedMarkets}/><div className="inline-actions"><button onClick={()=>setRows(r=>[...r,emptyInstrument("Watching")])}>Add another stock</button><button className="primary" onClick={async()=>{await w.saveWatchlistRows(rows);router.push("/watchlist")}}>Create watchlist dashboard</button><button onClick={()=>router.back()}>Cancel</button></div></section></main>}
