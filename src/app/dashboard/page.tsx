'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
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
      dot: 'bg-[#00d07e]',
      label: isSimulated ? 'Simulated' : 'Live',
      cls: isSimulated ? 'text-sky-400' : 'text-[#00d07e]',
    },
    connecting: { dot: 'bg-white/20 animate-pulse', label: 'Connecting', cls: 'text-white/35' },
    reconnecting: {
      dot: 'bg-amber-400 animate-pulse',
      label: `Reconnecting${reconnectAttempt > 0 ? ` (${reconnectAttempt})` : ''}`,
      cls: 'text-amber-400',
    },
    disconnected: { dot: 'bg-[#ff453a]', label: 'Disconnected', cls: 'text-[#ff453a]' },
  }[connectionState];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      <span className={`text-[12px] ${config.cls}`}>{config.label}</span>
    </div>
  );
}

// ─── SVG sparkline ───────────────────────────────────────────────────────────

function Sparkline({ ticks, isUp }: { ticks: Tick[]; isUp: boolean }) {
  if (ticks.length < 2) return <div className="h-7" />;
  const prices = ticks.map((t) => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 100;
  const H = 28;
  const pts = prices
    .map((p, i) => `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#00d07e' : '#ff453a'}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Watchlist row ───────────────────────────────────────────────────────────

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

  const [priceClass, setPriceClass] = useState('text-white');
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (latestPrice === null) return;
    const prev = prevRef.current;
    prevRef.current = latestPrice;
    if (prev === null) return;
    const cls = latestPrice >= prev ? 'text-[#00d07e]' : 'text-[#ff453a]';
    setPriceClass(cls);
    const t = setTimeout(() => setPriceClass('text-white'), 400);
    return () => clearTimeout(t);
  }, [latestPrice]);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative w-full text-left px-3 py-3 cursor-pointer transition-colors duration-100 rounded-xl ${
        isSelected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex justify-between items-start mb-0.5">
        <span className="font-semibold text-[13px] text-white">{symbol}</span>
        <div className={`text-[13px] font-medium tabular-nums transition-colors duration-300 ${priceClass}`}>
          {latestPrice !== null ? `$${latestPrice.toFixed(2)}` : '—'}
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-white/25">Stock</span>
        {changePct !== null && (
          <span className={`text-[12px] tabular-nums ${isUp ? 'text-[#00d07e]' : 'text-[#ff453a]'}`}>
            {isUp ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="mt-2 opacity-50">
        <Sparkline ticks={ticks} isUp={isUp} />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 text-[15px] leading-none transition-all w-5 h-5 flex items-center justify-center rounded"
        aria-label={`Remove ${symbol}`}
      >
        ×
      </button>
    </div>
  );
}

// ─── Market view ─────────────────────────────────────────────────────────────

function MarketView({ symbol }: { symbol: string }) {
  const { ticks, latestPrice, latestVolume } = useTicks(symbol);
  const sessionOpen = ticks.length > 0 ? ticks[0].price : null;
  const change = latestPrice !== null && sessionOpen !== null ? latestPrice - sessionOpen : null;
  const changePct = change !== null && sessionOpen ? (change / sessionOpen) * 100 : null;
  const isUp = change === null ? true : change >= 0;

  return (
    <div className="flex flex-col h-full">
      {/* Price header */}
      <div className="px-8 py-5 border-b border-white/[0.06] flex items-end gap-5 flex-shrink-0">
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">{symbol}</p>
          <p className="text-5xl font-semibold tabular-nums text-white leading-none">
            {latestPrice !== null ? `$${latestPrice.toFixed(2)}` : '—'}
          </p>
        </div>
        {changePct !== null && (
          <div className={`pb-0.5 ${isUp ? 'text-[#00d07e]' : 'text-[#ff453a]'}`}>
            <p className="text-[13px] tabular-nums">{isUp ? '+' : ''}{change!.toFixed(2)}</p>
            <p className="text-[13px] tabular-nums">{isUp ? '+' : ''}{changePct.toFixed(2)}%</p>
          </div>
        )}
        <div className="ml-auto pb-0.5 flex gap-8">
          {latestVolume !== null && (
            <div>
              <p className="text-[11px] text-white/25 uppercase tracking-wider mb-1">Vol</p>
              <p className="text-[13px] text-white/50 tabular-nums">{latestVolume.toLocaleString()}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-white/25 uppercase tracking-wider mb-1">Ticks</p>
            <p className="text-[13px] text-white/50 tabular-nums">{ticks.length}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-5 min-h-0">
        <TickChart ticks={ticks} />
      </div>
    </div>
  );
}

// ─── Add-symbol form ─────────────────────────────────────────────────────────

interface SearchResult { symbol: string; description: string; }

function AddSymbolForm({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch { setResults([]); }
    }, 300);
  }, []);

  const pick = (symbol: string) => {
    onAdd(symbol);
    setInput('');
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = input.trim().toUpperCase();
    if (sym) pick(sym);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setInput(v);
            search(v);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search stocks..."
          maxLength={12}
          className="bg-white/[0.07] border border-white/[0.08] rounded-lg pl-4 pr-4 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 w-48 transition-colors"
        />
      </form>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#1e1e1e] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          {results.map((r) => (
            <button
              key={r.symbol}
              type="button"
              onMouseDown={() => pick(r.symbol)}
              className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-[13px] text-white font-semibold w-16 shrink-0">{r.symbol}</span>
              <span className="text-[12px] text-white/35 truncate">{r.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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

  const holdingCount = portfolio.state.tfsa.holdings.length + portfolio.state.nonReg.holdings.length;

  return (
    <div className="h-screen flex flex-col bg-[#141414] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-white text-[17px] tracking-tight">knot</span>
          <div className="w-px h-4 bg-white/10" />
          <ConnectionBadge />
        </div>
        <AddSymbolForm onAdd={addSymbol} />
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Watchlist sidebar */}
        <aside className="w-60 border-r border-white/[0.06] flex flex-col overflow-y-auto flex-shrink-0 bg-[#181818]">
          <div className="px-4 pt-5 pb-3">
            <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Watchlist</p>
          </div>
          <div className="px-2 pb-4 flex flex-col gap-0.5">
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
        <main className="flex-1 flex overflow-hidden">
          {/* Center column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-stretch border-b border-white/[0.06] flex-shrink-0">
              {[
                { key: 'market', label: 'Market' },
                { key: 'portfolio', label: holdingCount > 0 ? `Portfolio (${holdingCount})` : 'Portfolio' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMainTab(key as 'market' | 'portfolio')}
                  className={`px-5 py-3.5 text-[13px] font-medium border-b-2 transition-colors ${
                    mainTab === key
                      ? 'border-[#00d07e] text-white'
                      : 'border-transparent text-white/35 hover:text-white/60'
                  }`}
                >
                  {label}
                </button>
              ))}

              {mainTab === 'market' && (
                <div className="ml-auto flex items-center gap-3 px-5">
                  <div className="w-14 h-[3px] rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        portfolio.tfsaUsedPct >= 100 ? 'bg-[#ff453a]' : portfolio.tfsaUsedPct >= 85 ? 'bg-amber-400' : 'bg-[#00d07e]'
                      }`}
                      style={{ width: `${Math.min(portfolio.tfsaUsedPct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-white/30 tabular-nums">
                    ${portfolio.tfsaRemaining.toLocaleString()} TFSA
                  </span>
                </div>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {mainTab === 'market' ? (
                selected ? (
                  <MarketView symbol={selected} />
                ) : (
                  <div className="flex items-center justify-center h-full text-white/20 text-[13px]">
                    Select a symbol
                  </div>
                )
              ) : (
                <PortfolioView portfolio={portfolio} />
              )}
            </div>
          </div>

          {/* Right trading panel */}
          {mainTab === 'market' && selected && (
            <aside className="w-72 border-l border-white/[0.06] flex-shrink-0 overflow-y-auto bg-[#141414]">
              <TradingPanel symbol={selected} portfolio={portfolio} />
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}
