'use client';

import { useState } from 'react';
import { useTicks } from '@/hooks/useTicks';
import type { usePortfolio } from '@/hooks/usePortfolio';
import type { Holding, AccountType } from '@/types/portfolio';

const ANNUAL_LIMITS: Record<number, number> = {
  2009: 5000, 2010: 5000, 2011: 5000, 2012: 5000,
  2013: 5500, 2014: 5500, 2015: 10000,
  2016: 5500, 2017: 5500, 2018: 5500,
  2019: 6000, 2020: 6000, 2021: 6000, 2022: 6000,
  2023: 6500,
  2024: 7000, 2025: 7000, 2026: 7000,
};

function calcLifetimeRoom(birthYear: number): number {
  const firstEligible = Math.max(2009, birthYear + 18);
  const currentYear = new Date().getFullYear();
  let total = 0;
  for (let y = firstEligible; y <= currentYear; y++) {
    total += ANNUAL_LIMITS[y] ?? 7000;
  }
  return total;
}

function HoldingRow({ holding, account }: { holding: Holding; account: AccountType }) {
  const { latestPrice } = useTicks(holding.symbol);
  const price = latestPrice ?? holding.avgCost;
  const value = price * holding.shares;
  const pnl = (price - holding.avgCost) * holding.shares;
  const pnlPct = ((price - holding.avgCost) / holding.avgCost) * 100;
  const isUp = pnl >= 0;

  return (
    <tr className="border-t border-white/[0.05]">
      <td className="px-4 py-3">
        <span className="text-[13px] text-white font-semibold">{holding.symbol}</span>
        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
          account === 'TFSA' ? 'bg-[#00d07e]/10 text-[#00d07e]' : 'bg-sky-500/10 text-sky-400'
        }`}>
          {account === 'TFSA' ? 'TFSA' : 'Non-Reg'}
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-white/50 tabular-nums">{holding.shares}</td>
      <td className="px-4 py-3 text-[13px] text-white/40 tabular-nums">${holding.avgCost.toFixed(2)}</td>
      <td className="px-4 py-3 text-[13px] text-white/70 tabular-nums">${price.toFixed(2)}</td>
      <td className="px-4 py-3 text-[13px] text-white tabular-nums">${value.toFixed(2)}</td>
      <td className={`px-4 py-3 text-[13px] tabular-nums ${isUp ? 'text-[#00d07e]' : 'text-[#ff453a]'}`}>
        {isUp ? '+' : ''}${pnl.toFixed(2)}
        <span className="text-[11px] ml-1 opacity-70">({isUp ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
      </td>
    </tr>
  );
}

const inputCls = 'w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors';
const labelCls = 'text-[11px] text-white/30 uppercase tracking-wider font-medium mb-2';

interface Props {
  portfolio: ReturnType<typeof usePortfolio>;
}

export function PortfolioView({ portfolio }: Props) {
  const { state, tfsaRemaining, tfsaUsedPct, updateTFSAConfig, reset } = portfolio;
  const [roomInput, setRoomInput] = useState('');
  const [birthYearInput, setBirthYearInput] = useState('');
  const [calcBirthYear, setCalcBirthYear] = useState<number | null>(null);

  const { totalRoom, contributed, overflowEnabled } = state.tfsaConfig;

  const barPct = Math.min(tfsaUsedPct, 100);
  const barColor = tfsaUsedPct >= 100 ? 'bg-[#ff453a]' : tfsaUsedPct >= 85 ? 'bg-amber-400' : 'bg-[#00d07e]';

  const recentTrades = [...state.trades].reverse().slice(0, 15);

  const allHoldings = [
    ...state.tfsa.holdings.map(h => ({ ...h, account: 'TFSA' as AccountType })),
    ...state.nonReg.holdings.map(h => ({ ...h, account: 'NON_REG' as AccountType })),
  ];

  return (
    <div className="h-full overflow-y-auto px-8 py-6 flex flex-col gap-8">

      {/* ── Account Overview ───────────────────────────────── */}
      <section>
        <h2 className={labelCls}>Account Overview</h2>

        {/* Cash balances */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">TFSA Cash</p>
            <p className="text-[20px] font-semibold text-[#00d07e] tabular-nums">${state.tfsa.cashBalance.toFixed(2)}</p>
          </div>
          <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-1.5">Non-Reg Cash</p>
            <p className="text-[20px] font-semibold text-sky-400 tabular-nums">${state.nonReg.cashBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* TFSA progress */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-4">
          <div className="flex justify-between text-[12px] text-white/40 mb-3">
            <span>${contributed.toLocaleString()} contributed</span>
            <span>${tfsaRemaining.toLocaleString()} of ${totalRoom.toLocaleString()} remaining</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${barPct}%` }}
            />
          </div>

          {tfsaUsedPct >= 85 && (
            <div className={`mt-3 text-[12px] px-3.5 py-2.5 rounded-lg flex items-start gap-2 ${
              tfsaUsedPct >= 100
                ? 'bg-[#ff453a]/10 text-[#ff453a]'
                : 'bg-amber-400/10 text-amber-400'
            }`}>
              <span className="text-[14px] leading-none mt-0.5">⚠</span>
              <span>
                {tfsaUsedPct >= 100
                  ? 'TFSA contribution room exhausted. New trades route to Non-Registered.'
                  : `${(100 - tfsaUsedPct).toFixed(1)}% of TFSA room remaining ($${tfsaRemaining.toLocaleString()}).`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Holdings ─────────────────────────────────────────── */}
      <section>
        <h2 className={labelCls}>Holdings</h2>
        {allHoldings.length === 0 ? (
          <p className="text-[13px] text-white/20 py-2">No open positions.</p>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Symbol', 'Shares', 'Avg Cost', 'Price', 'Value', 'Unrealized P&L'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] text-white/25 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allHoldings.map((h) => (
                  <HoldingRow key={`${h.symbol}-${h.account}`} holding={h} account={h.account} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── TFSA Settings ───────────────────────────────────── */}
      <section>
        <h2 className={labelCls}>TFSA Settings</h2>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-5 flex flex-col gap-5">

          {/* Manual room */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className={labelCls}>CRA Contribution Room ($)</p>
              <input
                type="number"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder={totalRoom.toString()}
                className={inputCls}
              />
            </div>
            <button
              onClick={() => {
                const n = parseFloat(roomInput);
                if (n > 0) { updateTFSAConfig({ totalRoom: n }); setRoomInput(''); }
              }}
              className="px-4 py-2.5 text-[13px] font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/70 hover:text-white rounded-lg transition-all"
            >
              Update
            </button>
          </div>

          {/* Birth year calculator */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className={labelCls}>Or Calculate from Birth Year</p>
              <input
                type="number"
                value={birthYearInput}
                onChange={(e) => setBirthYearInput(e.target.value)}
                placeholder="e.g. 1998"
                className={inputCls}
              />
            </div>
            <button
              onClick={() => {
                const y = parseInt(birthYearInput);
                if (y > 1900 && y < 2010) {
                  updateTFSAConfig({ totalRoom: calcLifetimeRoom(y) });
                  setCalcBirthYear(y);
                  setBirthYearInput('');
                }
              }}
              className="px-4 py-2.5 text-[13px] font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/60 hover:text-white rounded-lg transition-all"
            >
              Calculate
            </button>
          </div>
          {calcBirthYear !== null && (
            <p className="text-[12px] text-white/30 -mt-2">
              Lifetime room accrued through {new Date().getFullYear()} for birth year{' '}
              <span className="text-white/50">{calcBirthYear}</span>
            </p>
          )}

          {/* Overflow toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[13px] text-white/70">Auto-invest overflow to Non-Registered</p>
              {!overflowEnabled && (
                <p className="text-[12px] text-white/25 mt-0.5">
                  Trades exceeding TFSA room will be rejected.
                </p>
              )}
            </div>
            <button
              onClick={() => updateTFSAConfig({ overflowEnabled: !overflowEnabled })}
              className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                overflowEnabled ? 'bg-[#00d07e]' : 'bg-white/15'
              }`}
              role="switch"
              aria-checked={overflowEnabled}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  overflowEnabled ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <p className="text-[11px] text-white/20">
            TFSA withdrawals restore contribution room in the following January (CRA rule).
            Update your room manually each year via CRA My Account.
          </p>
        </div>
      </section>

      {/* ── Trade History ─────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className={labelCls}>Trade History</h2>
          <button
            onClick={() => { if (window.confirm('Reset all portfolio data?')) reset(); }}
            className="text-[12px] text-white/25 hover:text-[#ff453a] transition-colors"
          >
            Reset
          </button>
        </div>

        {recentTrades.length === 0 ? (
          <p className="text-[13px] text-white/20">No trades yet.</p>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.05]">
            {recentTrades.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-4 py-3">
                <span className={`text-[13px] font-semibold w-8 ${t.type === 'BUY' ? 'text-[#00d07e]' : 'text-[#ff453a]'}`}>
                  {t.type === 'BUY' ? 'Buy' : 'Sell'}
                </span>
                <span className="text-[13px] text-white font-medium">{t.symbol}</span>
                <span className="text-[13px] text-white/40 tabular-nums">{t.shares} @ ${t.price.toFixed(2)}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                  t.account === 'TFSA' ? 'bg-[#00d07e]/10 text-[#00d07e]' : 'bg-sky-500/10 text-sky-400'
                }`}>
                  {t.account === 'TFSA' ? 'TFSA' : 'Non-Reg'}
                </span>
                <span className="ml-auto text-[12px] text-white/20 tabular-nums">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
