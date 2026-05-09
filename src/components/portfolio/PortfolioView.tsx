'use client';

import { useState } from 'react';
import { useTicks } from '@/hooks/useTicks';
import type { usePortfolio } from '@/hooks/usePortfolio';
import type { Holding, AccountType } from '@/types/portfolio';

// TFSA annual contribution limits by year (CRA official)
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

// Each holding row subscribes to live prices independently via useTicks
function HoldingRow({
  holding,
  account,
}: {
  holding: Holding;
  account: AccountType;
}) {
  const { latestPrice } = useTicks(holding.symbol);
  const price = latestPrice ?? holding.avgCost;
  const value = price * holding.shares;
  const pnl = (price - holding.avgCost) * holding.shares;
  const pnlPct = ((price - holding.avgCost) / holding.avgCost) * 100;
  const isUp = pnl >= 0;

  return (
    <tr className="border-t border-slate-800/40">
      <td className="py-2 pr-4 font-mono text-xs text-white font-semibold">
        {holding.symbol}
        <span className="ml-1.5 text-[9px] text-slate-600">{account}</span>
      </td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-400 tabular-nums">{holding.shares}</td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-500 tabular-nums">${holding.avgCost.toFixed(2)}</td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-300 tabular-nums">${price.toFixed(2)}</td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-300 tabular-nums">${value.toFixed(2)}</td>
      <td className={`py-2 font-mono text-xs tabular-nums ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
        {isUp ? '+' : ''}${pnl.toFixed(2)}&nbsp;
        <span className="text-[10px]">({isUp ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
      </td>
    </tr>
  );
}

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
  const barColor =
    tfsaUsedPct >= 100 ? 'bg-red-500' : tfsaUsedPct >= 85 ? 'bg-amber-500' : 'bg-emerald-500';

  const recentTrades = [...state.trades].reverse().slice(0, 15);

  return (
    <div className="h-full overflow-y-auto px-6 py-5 flex flex-col gap-6">
      {/* ── TFSA Status ─────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-mono tracking-widest text-slate-600 mb-3">TFSA ACCOUNT</h2>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
            <span>${contributed.toLocaleString()} contributed</span>
            <span>${tfsaRemaining.toLocaleString()} remaining of ${totalRoom.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>

        {/* Overflow warning */}
        {tfsaUsedPct >= 85 && (
          <div className={`text-xs font-mono mt-2 px-3 py-2 rounded border ${
            tfsaUsedPct >= 100
              ? 'border-red-900 bg-red-950/30 text-red-400'
              : 'border-amber-900 bg-amber-950/30 text-amber-400'
          }`}>
            {tfsaUsedPct >= 100
              ? '⚠ TFSA contribution room exhausted. New trades route to Non-Registered.'
              : `⚠ ${(100 - tfsaUsedPct).toFixed(1)}% of TFSA room remaining ($${tfsaRemaining.toLocaleString()}).`}
          </div>
        )}

        {/* Cash balances */}
        <div className="flex gap-4 mt-3">
          <div className="bg-slate-900/40 border border-slate-800/40 rounded px-3 py-2">
            <p className="text-[10px] text-slate-600 font-mono tracking-widest">TFSA CASH</p>
            <p className="text-sm font-mono text-emerald-400 tabular-nums">${state.tfsa.cashBalance.toFixed(2)}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/40 rounded px-3 py-2">
            <p className="text-[10px] text-slate-600 font-mono tracking-widest">NON-REG CASH</p>
            <p className="text-sm font-mono text-sky-400 tabular-nums">${state.nonReg.cashBalance.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* ── TFSA Settings ───────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-mono tracking-widest text-slate-600 mb-3">TFSA SETTINGS</h2>

        <div className="flex flex-col gap-3">
          {/* Manual room entry */}
          <div className="flex items-end gap-3">
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1">CRA CONTRIBUTION ROOM ($)</p>
              <input
                type="number"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder={totalRoom.toString()}
                className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-800"
              />
            </div>
            <button
              onClick={() => {
                const n = parseFloat(roomInput);
                if (n > 0) { updateTFSAConfig({ totalRoom: n }); setRoomInput(''); }
              }}
              className="px-3 py-1 text-xs font-mono text-emerald-700 border border-emerald-900 rounded hover:text-emerald-400 hover:border-emerald-700 transition-colors"
            >
              UPDATE
            </button>
          </div>

          {/* Auto-calculate from birth year */}
          <div className="flex items-end gap-3">
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1">OR CALCULATE FROM BIRTH YEAR</p>
              <input
                type="number"
                value={birthYearInput}
                onChange={(e) => setBirthYearInput(e.target.value)}
                placeholder="e.g. 1998"
                className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-800"
              />
            </div>
            <button
              onClick={() => {
                const y = parseInt(birthYearInput);
                if (y > 1900 && y < 2010) {
                  const room = calcLifetimeRoom(y);
                  updateTFSAConfig({ totalRoom: room });
                  setCalcBirthYear(y);
                  setBirthYearInput('');
                }
              }}
              className="px-3 py-1 text-xs font-mono text-slate-500 border border-slate-800 rounded hover:text-slate-300 hover:border-slate-600 transition-colors"
            >
              CALC
            </button>
          </div>
          {calcBirthYear !== null && (
            <p className="text-[10px] font-mono text-slate-600">
              Displaying for born <span className="text-slate-400">{calcBirthYear}</span>
              {' · '}lifetime room accrued through {new Date().getFullYear()}
            </p>
          )}

          {/* Overflow toggle */}
          <label className="flex items-center gap-3 cursor-pointer mt-1">
            <div
              onClick={() => updateTFSAConfig({ overflowEnabled: !overflowEnabled })}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                overflowEnabled ? 'bg-emerald-700' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  overflowEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs font-mono text-slate-400">
              Auto-invest overflow to Non-Registered
            </span>
          </label>

          {!overflowEnabled && (
            <p className="text-[10px] font-mono text-slate-600">
              Trades exceeding TFSA room will be rejected. Enable to auto-route excess to Non-Registered.
            </p>
          )}

          <p className="text-[10px] font-mono text-slate-700">
            Note: TFSA withdrawals restore contribution room in the following January (CRA rule).
            Update your room manually each year from CRA My Account.
          </p>
        </div>
      </section>

      {/* ── TFSA Holdings ───────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-mono tracking-widest text-slate-600 mb-3">TFSA HOLDINGS</h2>
        {state.tfsa.holdings.length === 0 ? (
          <p className="text-xs font-mono text-slate-700">No TFSA positions.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['SYMBOL', 'SHARES', 'AVG COST', 'PRICE', 'VALUE', 'UNREALIZED P&L'].map((h) => (
                  <th key={h} className="pb-2 pr-4 text-left text-[9px] font-mono text-slate-700 tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.tfsa.holdings.map((h) => (
                <HoldingRow key={h.symbol} holding={h} account="TFSA" />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Non-Registered Holdings ──────────────────────── */}
      <section>
        <h2 className="text-[10px] font-mono tracking-widest text-slate-600 mb-3">NON-REGISTERED HOLDINGS</h2>
        {state.nonReg.holdings.length === 0 ? (
          <p className="text-xs font-mono text-slate-700">No Non-Registered positions.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['SYMBOL', 'SHARES', 'AVG COST', 'PRICE', 'VALUE', 'UNREALIZED P&L'].map((h) => (
                  <th key={h} className="pb-2 pr-4 text-left text-[9px] font-mono text-slate-700 tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.nonReg.holdings.map((h) => (
                <HoldingRow key={h.symbol} holding={h} account="NON_REG" />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Trade History ────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-[10px] font-mono tracking-widest text-slate-600">TRADE HISTORY</h2>
          <button
            onClick={() => { if (window.confirm('Reset all portfolio data?')) reset(); }}
            className="text-[10px] font-mono text-slate-700 hover:text-red-500 transition-colors"
          >
            RESET
          </button>
        </div>

        {recentTrades.length === 0 ? (
          <p className="text-xs font-mono text-slate-700">No trades yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {recentTrades.map((t) => (
              <div key={t.id} className="flex items-center gap-4 text-xs font-mono text-slate-500 tabular-nums">
                <span className={t.type === 'BUY' ? 'text-emerald-700' : 'text-red-700'}>{t.type}</span>
                <span className="text-slate-300">{t.symbol}</span>
                <span>{t.shares} @ ${t.price.toFixed(2)}</span>
                <span className={t.account === 'TFSA' ? 'text-emerald-800' : 'text-sky-800'}>{t.account}</span>
                <span className="ml-auto text-slate-700">
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
