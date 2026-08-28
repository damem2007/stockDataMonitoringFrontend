"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/workspace-provider";
import { useSession } from "@/providers/session-provider";
import type { Exchange } from "@/lib/types";
import { cleanSymbol, currencyForSymbol, money, percent } from "@/lib/workspace-utils";

function signalLabelFromMove(value:number){ if(!Number.isFinite(value)) return "Neutral"; if(value>0.004) return "Bullish"; if(value<-0.004) return "Bearish"; return "Neutral"; }
function MiniSparkline({values,tone}:{values:unknown;tone:"gain"|"loss"}) {
  const parsed=Array.isArray(values)?values.map(Number).filter(Number.isFinite):[];
  const min=Math.min(...parsed), max=Math.max(...parsed);
  const points=parsed.length>1&&Number.isFinite(min)&&Number.isFinite(max)&&min!==max
    ? parsed.map((value,index)=>`${(index/(parsed.length-1))*108},${30-((value-min)/(max-min))*26}`).join(" ")
    : "0,18 36,18 72,18 108,18";
  return <svg className={`mini-sparkline ${tone}`} viewBox="0 0 108 32" aria-hidden="true"><polyline points={points}/></svg>;
}

export function WatchlistDashboard(){
  const router=useRouter();
  const w=useWorkspace();
  const session=useSession();
  const rows=w.instruments.filter(item=>item.role!=="Trading"&&item.active!==false&&w.visibleSymbols.includes(cleanSymbol(item.symbol)));
  const details=(w.portfolio?.watchlist||[]) as Record<string, unknown>[];
  const detailBySymbol=new Map(details.map(item=>[cleanSymbol(item.Symbol),item]));
  return <main className="dashboard-shell"><div className="dashboard-content with-sidebar"><aside className="filter-sidebar"><div className="sidebar-group"><span>Exchange</span><div className="market-toggle-row">{(["TSX","NYSE","NASDAQ"] as Exchange[]).map(m=><button className={w.selectedMarkets.includes(m)?"active":""} key={m} onClick={()=>w.toggleMarket(m)}>{m}</button>)}</div></div><div className="sidebar-group"><span>Add ticker or company</span><div className="sidebar-add"><div className="ticker-input-wrap"><input autoComplete="off" value={w.newTicker} placeholder="e.g. RY.TO or Royal Bank" onChange={e=>w.setNewTicker(e.target.value)}/>{w.newTicker.trim()&&w.tickerSearchResults.length>0&&<div className="ticker-suggestions">{w.tickerSearchResults.slice(0,6).map(item=><button key={`${item.symbol}-${item.market}`} type="button" onMouseDown={e=>{e.preventDefault();w.setNewTicker(item.symbol)}}><strong>{item.symbol}</strong><span>{item.name||item.label}</span><em>{item.market} · {item.currency}</em></button>)}</div>}</div><button className="primary" onClick={w.addTickerToWorkspace}>Add</button></div></div><p className="sidebar-note">{session.user?"History, interval, risk profile, intent, and strategy live on each ticker's analysis pages.":"Guest watchlists are local to this browser. Sign in to save them to an account and unlock portfolio dashboards."}</p><div className="sidebar-group"><span>Current watchlist</span><div className="watch-chip-list">{w.visibleSymbols.map(symbol=><span className="watch-chip" key={symbol}>{symbol}<button aria-label={`Remove ${symbol}`} onClick={()=>w.removeTickerFromWorkspace(symbol)}>x</button></span>)}</div>{session.user?<button onClick={()=>w.persistInstruments(w.instruments,"Instrument changes saved.")}>Save watchlist</button>:<button onClick={()=>router.push("/?signin=1&next=/watchlist")}>Sign in to save</button>}</div></aside><section className="dashboard-main"><div className="workspace-dashboard"><section className="dashboard-header hero-panel"><div><p className="eyebrow">Watchlist Dashboard</p><h1>Research watchlist</h1><p className="muted">Watchlist instruments stay separate from trading holdings. Open a ticker for signal, chart, ML, news, backtest, and alert context.</p>{w.lastSyncedAt&&<p className="sync-stamp">Synced {new Date(w.lastSyncedAt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"})}</p>}</div><div className="header-actions"><button onClick={()=>void w.syncWorkspace(false)}>Sync Workspace</button>
    {/* <Link className="button-link primary" href="/watchlist/setup">Add instruments</Link> */}
    </div></section><section className="surface-section">{!rows.length?<div className="empty-state"><h2>No watchlist instruments yet</h2><Link className="button-link primary" href="/watchlist/setup">Create watchlist</Link></div>:<div className="watchlist-table"><div className="watchlist-header"><span>Instrument</span><span>Price</span><span>Today</span><span>Trend</span><span>Signal</span><span>Action</span></div>{rows.map(row=>{const symbol=cleanSymbol(row.symbol);const detail=detailBySymbol.get(symbol);const price=Number(detail?.["Current Price"]);const change=Number(detail?.["Today %"]);const badge=signalLabelFromMove(change);return <article className="watchlist-item" key={symbol}><Link className="watchlist-symbol" href={`/watchlist/${encodeURIComponent(symbol)}/summary`}><strong>{symbol}</strong><span>{String(detail?.Category||row.watch_reason||row.strategy||"Research watchlist")}</span></Link><strong>{Number.isFinite(price)?money(price,currencyForSymbol(symbol)):"Sync pending"}</strong><span className={change>=0?"gain-text":"loss-text"}>{Number.isFinite(change)?percent(change):"n/a"}</span><MiniSparkline values={detail?.Trend} tone={change>=0?"gain":"loss"}/><span className={`signal-badge ${badge.toLowerCase()}`}>{badge}</span><Link className="button-link" href={`/watchlist/${encodeURIComponent(symbol)}/signal`}>View signal</Link><Link className={`button-link ${!session.user?"disabled-link":""}`} href={session.user?`/portfolio/setup?symbol=${encodeURIComponent(symbol)}`:`/?signin=1&next=${encodeURIComponent(`/portfolio/setup?symbol=${symbol}`)}`}>Add to portfolio</Link></article>})}</div>}</section></div></section></div></main>;
}
