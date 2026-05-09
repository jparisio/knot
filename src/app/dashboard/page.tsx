'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useSocketContext } from '@/lib/SocketContext';
import { useTicks } from '@/hooks/useTicks';
import { usePortfolio } from '@/hooks/usePortfolio';
import { TradingPanel } from '@/components/portfolio/TradingPanel';
import { PortfolioView } from '@/components/portfolio/PortfolioView';
import type { Tick } from '@/types/tick';

const TickChart = dynamic(
  () => import('@/components/charts/TickChart').then((m) => m.TickChart),
  { ssr: false }
);

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'AMZN', 'NVDA', 'MSFT'];

// ─── Connection badge ────────────────────────────────────────────────────────

function ConnectionBadge() {
  const { connectionState, reconnectAttempt, isSimulated } = useSocketContext();

  const config = {
    connected: {
      dot: 'bg-emerald-500',
      label: isSimulated ? 'SIMULATED' : 'LIVE',
      cls: isSimulated ? 'text-sky-400' : 'text-emerald-400',
    },
    connecting: { dot: 'bg-slate-500 animate-pulse', label: 'CONNECTING', cls: 'text-slate-400' },
    reconnecting: {
      dot: 'bg-amber-500 animate-pulse',
      label: `RECONNECTING${reconnectAttempt > 0 ? ` (${reconnectAttempt})` : ''}`,
      cls: 'text-amber-400',
    },
    disconnected: { dot: 'bg-red-500', label: 'DISCONNECTED', cls: 'text-red-400' },
  }[connectionState];

  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className={`text-xs font-mono tracking-widest ${config.cls}`}>{config.label}</span>
    </div>
  );
}

// ─── SVG sparkline ───────────────────────────────────────────────────────────

function Sparkline({ ticks, isUp }: { ticks: Tick[]; isUp: boolean }) {
  if (ticks.length < 2) return <div className="h-8" />;
  const prices = ticks.map((t) => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 100;
  const H = 32;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Watchlist card ──────────────────────────────────────────────────────────

function SymbolCard({
  symbol,
  isSelected,
  onSelect,
  onRemove,
}: {
  symbol: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { ticks, latestPrice } = useTicks(symbol);
  const sessionOpen = ticks.length > 0 ? ticks[0].price : null;
  const change = latestPrice !== null && sessionOpen !== null ? latestPrice - sessionOpen : null;
  const changePct = change !== null && sessionOpen ? (change / sessionOpen) * 100 : null;
  const isUp = change === null ? true : change >= 0;

  const [priceClass, setPriceClass] = useState('text-slate-100');
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestPrice === null) return;
    const prev = prevRef.current;
    prevRef.current = latestPrice;
    if (prev === null) return;
    const cls = latestPrice >= prev ? 'text-emerald-300' : 'text-red-300';
    setPriceClass(cls);
    const t = setTimeout(() => setPriceClass('text-slate-100'), 350);
    return () => clearTimeout(t);
  }, [latestPrice]);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`w-full text-left p-3 rounded-lg border transition-colors duration-100 cursor-pointer ${
        isSelected
          ? 'border-emerald-800/70 bg-emerald-950/30'
          : 'border-slate-800/60 bg-slate-900/30 hover:border-slate-700/60'
      }`}
    >
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-mono font-bold text-xs text-white tracking-widest">{symbol}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-slate-700 hover:text-slate-400 text-sm leading-none px-0.5"
          aria-label={`Remove ${symbol}`}
        >
          ×
        </button>
      </div>
      <div className={`font-mono text-base font-semibold transition-colors duration-200 ${priceClass}`}>
        {latestPrice !== null ? `$${latestPrice.toFixed(2)}` : '—'}
      </div>
      {changePct !== null && (
        <div className={`text-xs font-mono mt-0.5 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {isUp ? '+' : ''}{changePct.toFixed(3)}%
        </div>
      )}
      <div className="mt-2 opacity-70">
        <Sparkline ticks={ticks} isUp={isUp} />
      </div>
    </div>
  );
}

// ─── Market view (chart + trading panel) ─────────────────────────────────────

function MarketView({
  symbol,
  portfolio,
}: {
  symbol: string;
  portfolio: ReturnType<typeof usePortfolio>;
}) {
  const { ticks, latestPrice, latestVolume } = useTicks(symbol);
  const sessionOpen = ticks.length > 0 ? ticks[0].price : null;
  const change = latestPrice !== null && sessionOpen !== null ? latestPrice - sessionOpen : null;
  const changePct = change !== null && sessionOpen ? (change / sessionOpen) * 100 : null;
  const isUp = change === null ? true : change >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Price header */}
      <div className="px-6 py-4 border-b border-slate-800/40 flex items-end gap-6 flex-shrink-0">
        <div>
          <p className="text-xs text-slate-600 font-mono tracking-[0.2em] mb-1">{symbol}</p>
          <p className={`font-mono text-4xl font-bold tabular-nums ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {latestPrice !== null ? `$${latestPrice.toFixed(2)}` : '—'}
          </p>
        </div>
        {changePct !== null && (
          <div className={`pb-1 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
            <p className="font-mono text-sm tabular-nums">{isUp ? '+' : ''}{change!.toFixed(4)}</p>
            <p className="font-mono text-sm tabular-nums">{isUp ? '+' : ''}{changePct.toFixed(4)}%</p>
          </div>
        )}
        <div className="ml-auto pb-1 flex gap-6">
          {latestVolume !== null && (
            <div>
              <p className="text-xs text-slate-700 font-mono tracking-widest">VOL</p>
              <p className="font-mono text-sm text-slate-500 tabular-nums">{latestVolume.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-700 font-mono tracking-widest">TICKS</p>
            <p className="font-mono text-sm text-slate-500 tabular-nums">{ticks.length}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4 min-h-0">
        <TickChart ticks={ticks} />
      </div>

      {/* Trading panel */}
      <TradingPanel symbol={symbol} portfolio={portfolio} />
    </div>
  );
}

// ─── Add-symbol form ─────────────────────────────────────────────────────────

function AddSymbolForm({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [input, setInput] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) { onAdd(sym); setInput(''); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-1.5">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        placeholder="SYMBOL"
        maxLength={10}
        className="bg-slate-900/60 border border-slate-800 rounded px-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-emerald-800 w-24"
      />
      <button
        type="submit"
        className="text-xs font-mono text-emerald-700 hover:text-emerald-400 border border-slate-800 hover:border-emerald-900 rounded px-2 py-1 transition-colors"
      >
        + ADD
      </button>
    </form>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [selected, setSelected] = useState<string>(DEFAULT_SYMBOLS[0]);
  const [mainTab, setMainTab] = useState<'market' | 'portfolio'>('market');
  const portfolio = usePortfolio();

  const addSymbol = (sym: string) => {
    setSymbols((prev) => (prev.includes(sym) ? prev : [...prev, sym]));
    setSelected(sym);
  };

  const removeSymbol = (sym: string) => {
    setSymbols((prev) => {
      const next = prev.filter((s) => s !== sym);
      if (selected === sym && next.length > 0) setSelected(next[0]);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#080a10] text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/40 flex-shrink-0">
        <div className="flex items-center gap-5">
          <span className="font-mono font-bold text-white tracking-[0.4em] text-sm">KNOT</span>
          <span className="text-slate-800">|</span>
          <ConnectionBadge />
        </div>
        <AddSymbolForm onAdd={addSymbol} />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Watchlist sidebar */}
        <aside className="w-44 border-r border-slate-800/40 flex flex-col overflow-y-auto flex-shrink-0">
          <p className="px-3 pt-3 pb-1.5 text-[10px] font-mono text-slate-700 tracking-widest">WATCHLIST</p>
          <div className="px-2 pb-2 flex flex-col gap-1.5">
            {symbols.map((sym) => (
              <SymbolCard
                key={sym}
                symbol={sym}
                isSelected={sym === selected}
                onSelect={() => { setSelected(sym); setMainTab('market'); }}
                onRemove={() => removeSymbol(sym)}
              />
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-slate-800/40 flex-shrink-0">
            {[
              { key: 'market', label: 'MARKET' },
              { key: 'portfolio', label: `PORTFOLIO${
                portfolio.state.tfsa.holdings.length + portfolio.state.nonReg.holdings.length > 0
                  ? ` (${portfolio.state.tfsa.holdings.length + portfolio.state.nonReg.holdings.length})`
                  : ''
              }` },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMainTab(key as 'market' | 'portfolio')}
                className={`px-5 py-2 text-[10px] font-mono tracking-widest border-b-2 transition-colors ${
                  mainTab === key
                    ? 'border-emerald-700 text-emerald-400'
                    : 'border-transparent text-slate-600 hover:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}

            {/* TFSA room indicator in tab bar */}
            {mainTab === 'market' && (
              <div className="ml-auto flex items-center gap-2 px-4">
                <div className="w-24 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      portfolio.tfsaUsedPct >= 100 ? 'bg-red-500' : portfolio.tfsaUsedPct >= 85 ? 'bg-amber-500' : 'bg-emerald-700'
                    }`}
                    style={{ width: `${Math.min(portfolio.tfsaUsedPct, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-600 tabular-nums">
                  TFSA ${portfolio.tfsaRemaining.toLocaleString()} left
                </span>
              </div>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {mainTab === 'market' ? (
              selected ? (
                <MarketView symbol={selected} portfolio={portfolio} />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-700 text-xs font-mono tracking-widest">
                  SELECT A SYMBOL
                </div>
              )
            ) : (
              <PortfolioView portfolio={portfolio} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
