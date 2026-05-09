'use client';

import { useState } from 'react';
import { useTicks } from '@/hooks/useTicks';
import type { usePortfolio } from '@/hooks/usePortfolio';
import type { AccountType } from '@/types/portfolio';

interface Props {
  symbol: string;
  portfolio: ReturnType<typeof usePortfolio>;
}

export function TradingPanel({ symbol, portfolio }: Props) {
  const { latestPrice } = useTicks(symbol);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [sharesInput, setSharesInput] = useState('');
  const [buyAccount, setBuyAccount] = useState<'AUTO' | AccountType>('AUTO');
  const [sellAccount, setSellAccount] = useState<AccountType>('TFSA');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const price = latestPrice ?? 0;
  const shares = Math.floor(parseFloat(sharesInput) || 0);
  const totalCost = shares * price;

  // Preview how the buy would be split — only meaningful in AUTO mode
  const autoTfsaShares = price > 0 ? Math.min(shares, Math.floor(portfolio.tfsaRemaining / price)) : 0;
  const autoNonRegShares = shares - autoTfsaShares;

  const handleTrade = () => {
    if (!shares || !price) return;
    setMessage(null);

    if (side === 'BUY') {
      const targetAccount = buyAccount === 'AUTO' ? undefined : buyAccount;
      const res = portfolio.buy(symbol, shares, price, targetAccount);
      if ('error' in res) {
        setMessage({ text: res.error, ok: false });
      } else {
        setMessage({ text: res.warning ?? `Bought ${shares} ${symbol} @ $${price.toFixed(2)}`, ok: true });
        setSharesInput('');
      }
    } else {
      const res = portfolio.sell(symbol, shares, price, sellAccount);
      if ('error' in res) {
        setMessage({ text: res.error, ok: false });
      } else {
        const pnlStr = res.pnl >= 0 ? `+$${res.pnl.toFixed(2)}` : `-$${Math.abs(res.pnl).toFixed(2)}`;
        setMessage({ text: `Sold ${shares} ${symbol} @ $${price.toFixed(2)} — P&L: ${pnlStr}`, ok: true });
        setSharesInput('');
      }
    }
  };

  return (
    <div className="border-t border-slate-800/40 px-6 py-4 flex-shrink-0 bg-[#080a10]">
      {/* Side tabs */}
      <div className="flex items-center gap-2 mb-3">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSide(s); setMessage(null); }}
            className={`text-xs font-mono px-3 py-1 rounded border transition-colors ${
              side === s
                ? s === 'BUY'
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-red-950/40 text-red-400 border-red-900'
                : 'text-slate-600 border-slate-800 hover:text-slate-400'
            }`}
          >
            {s}
          </button>
        ))}
        {side === 'BUY' && (
          <select
            value={buyAccount}
            onChange={(e) => setBuyAccount(e.target.value as 'AUTO' | AccountType)}
            className="ml-1 text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 focus:outline-none"
          >
            <option value="AUTO">Auto (TFSA-first)</option>
            <option value="TFSA">TFSA only</option>
            <option value="NON_REG">Non-Registered</option>
          </select>
        )}
        {side === 'SELL' && (
          <select
            value={sellAccount}
            onChange={(e) => setSellAccount(e.target.value as AccountType)}
            className="ml-1 text-xs font-mono bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-400 focus:outline-none"
          >
            <option value="TFSA">TFSA</option>
            <option value="NON_REG">Non-Registered</option>
          </select>
        )}
      </div>

      <div className="flex items-end gap-4 flex-wrap">
        {/* Shares input */}
        <div>
          <p className="text-[10px] text-slate-600 font-mono mb-1 tracking-widest">SHARES</p>
          <input
            type="number"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            min="1"
            step="1"
            placeholder="0"
            className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-800"
          />
        </div>

        {/* Price */}
        <div>
          <p className="text-[10px] text-slate-600 font-mono mb-1 tracking-widest">MKT PRICE</p>
          <p className="text-xs font-mono text-slate-400 py-1.5">
            {price ? `$${price.toFixed(2)}` : '—'}
          </p>
        </div>

        {/* Total cost */}
        <div>
          <p className="text-[10px] text-slate-600 font-mono mb-1 tracking-widest">TOTAL</p>
          <p className="text-xs font-mono text-slate-300 py-1.5 tabular-nums">
            {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
          </p>
        </div>

        {/* Allocation preview (buy only, AUTO mode) */}
        {side === 'BUY' && buyAccount === 'AUTO' && shares > 0 && price > 0 && (
          <div>
            <p className="text-[10px] text-slate-600 font-mono mb-1 tracking-widest">ALLOCATION</p>
            <p className="text-xs font-mono py-1.5 text-slate-400 tabular-nums">
              {autoTfsaShares > 0 && (
                <span className="text-emerald-600">{autoTfsaShares} TFSA</span>
              )}
              {autoTfsaShares > 0 && autoNonRegShares > 0 && (
                <span className="text-slate-600"> + </span>
              )}
              {autoNonRegShares > 0 && (
                <span className="text-sky-600">{autoNonRegShares} Non-Reg</span>
              )}
            </p>
          </div>
        )}

        {/* Execute button */}
        <button
          onClick={handleTrade}
          disabled={!shares || !price}
          className={`px-5 py-1.5 rounded text-xs font-mono font-semibold border transition-colors ${
            side === 'BUY'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
              : 'bg-red-950/40 text-red-300 border-red-900 hover:bg-red-900/40'
          } disabled:opacity-25 disabled:cursor-not-allowed`}
        >
          {side === 'BUY' ? 'PLACE BUY' : 'PLACE SELL'}
        </button>
      </div>

      {/* Result */}
      {message && (
        <p className={`mt-2 text-xs font-mono ${message.ok ? 'text-emerald-500' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
