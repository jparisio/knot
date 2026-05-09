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
    <div className="flex flex-col h-full px-5 py-6 gap-5">
      <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Order</p>

      {/* BUY / SELL toggle */}
      <div className="flex bg-white/[0.06] rounded-xl p-1">
        {(['BUY', 'SELL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSide(s); setMessage(null); }}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
              side === s
                ? s === 'BUY'
                  ? 'bg-[#00d07e] text-black shadow-sm'
                  : 'bg-[#ff453a] text-white shadow-sm'
                : 'text-white/35 hover:text-white/60'
            }`}
          >
            {s === 'BUY' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      {/* Account selector */}
      <div>
        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Account</p>
        {side === 'BUY' ? (
          <select
            value={buyAccount}
            onChange={(e) => setBuyAccount(e.target.value as 'AUTO' | AccountType)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white/80 focus:outline-none focus:border-white/20 transition-colors cursor-pointer"
          >
            <option value="AUTO">Auto (TFSA-first)</option>
            <option value="TFSA">TFSA only</option>
            <option value="NON_REG">Non-Registered</option>
          </select>
        ) : (
          <select
            value={sellAccount}
            onChange={(e) => setSellAccount(e.target.value as AccountType)}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white/80 focus:outline-none focus:border-white/20 transition-colors cursor-pointer"
          >
            <option value="TFSA">TFSA</option>
            <option value="NON_REG">Non-Registered</option>
          </select>
        )}
      </div>

      {/* Shares input */}
      <div>
        <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">Shares</p>
        <input
          type="number"
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          min="1"
          step="1"
          placeholder="0"
          className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/20 tabular-nums transition-colors"
        />
      </div>

      {/* Order summary */}
      {price > 0 && (
        <div className="bg-white/[0.04] rounded-xl px-4 py-3.5 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[13px] text-white/40">Market price</span>
            <span className="text-[13px] text-white/60 tabular-nums">${price.toFixed(2)}</span>
          </div>
          {shares > 0 && (
            <div className="flex justify-between">
              <span className="text-[13px] text-white/40">Est. total</span>
              <span className="text-[13px] text-white font-medium tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Auto-allocation preview */}
      {side === 'BUY' && buyAccount === 'AUTO' && shares > 0 && price > 0 && (
        <div className="bg-white/[0.03] rounded-xl px-4 py-3 space-y-2">
          <p className="text-[11px] text-white/25 uppercase tracking-wider mb-1">Allocation</p>
          {autoTfsaShares > 0 && (
            <div className="flex justify-between text-[12px]">
              <span className="text-white/40">TFSA</span>
              <span className="text-[#00d07e] tabular-nums">{autoTfsaShares} shares</span>
            </div>
          )}
          {autoNonRegShares > 0 && (
            <div className="flex justify-between text-[12px]">
              <span className="text-white/40">Non-Reg</span>
              <span className="text-sky-400 tabular-nums">{autoNonRegShares} shares</span>
            </div>
          )}
        </div>
      )}

      {/* Execute button */}
      <button
        onClick={handleTrade}
        disabled={!shares || !price}
        className={`w-full py-3.5 rounded-xl text-[14px] font-semibold transition-all mt-auto ${
          side === 'BUY'
            ? 'bg-[#00d07e] text-black hover:opacity-90 active:opacity-80'
            : 'bg-[#ff453a] text-white hover:opacity-90 active:opacity-80'
        } disabled:opacity-15 disabled:cursor-not-allowed`}
      >
        {side === 'BUY'
          ? shares > 0 ? `Buy ${shares} share${shares !== 1 ? 's' : ''}` : `Buy ${symbol}`
          : shares > 0 ? `Sell ${shares} share${shares !== 1 ? 's' : ''}` : `Sell ${symbol}`}
      </button>

      {/* Result message */}
      {message && (
        <p className={`text-[12px] leading-relaxed ${message.ok ? 'text-[#00d07e]' : 'text-[#ff453a]'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
