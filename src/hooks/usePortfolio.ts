"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AccountType,
  Holding,
  PortfolioState,
  Trade,
} from "@/types/portfolio";

const STORAGE_KEY = "knot-portfolio-v1";
const STARTING_CASH = 50_000;

const DEFAULT_STATE: PortfolioState = {
  tfsa: { type: "TFSA", cashBalance: STARTING_CASH, holdings: [] },
  nonReg: { type: "NON_REG", cashBalance: STARTING_CASH, holdings: [] },
  tfsaConfig: { totalRoom: 95_000, contributed: 0, overflowEnabled: true },
  trades: [],
};

// Weighted-average cost basis update after a buy
function applyBuy(
  holdings: Holding[],
  symbol: string,
  shares: number,
  price: number,
): Holding[] {
  const existing = holdings.find((h) => h.symbol === symbol);
  if (existing) {
    const totalShares = existing.shares + shares;
    const avgCost =
      (existing.avgCost * existing.shares + price * shares) / totalShares;
    return holdings.map((h) =>
      h.symbol === symbol ? { ...h, shares: totalShares, avgCost } : h,
    );
  }
  return [...holdings, { symbol, shares, avgCost: price }];
}

function applySell(
  holdings: Holding[],
  symbol: string,
  shares: number,
): Holding[] {
  return holdings
    .map((h) => (h.symbol === symbol ? { ...h, shares: h.shares - shares } : h))
    .filter((h) => h.shares > 0);
}

export type BuyResult =
  | { error: string }
  | {
      tfsaShares: number;
      nonRegShares: number;
      tfsaCost: number;
      nonRegCost: number;
      warning?: string;
    };

export type SellResult = { error: string } | { proceeds: number; pnl: number };

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);

  // Load from localStorage on first mount (localStorage isn't available during SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

  const tfsaRemaining =
    state.tfsaConfig.totalRoom - state.tfsaConfig.contributed;
  const tfsaUsedPct =
    state.tfsaConfig.totalRoom > 0
      ? (state.tfsaConfig.contributed / state.tfsaConfig.totalRoom) * 100
      : 0;

  /**
   * Buy shares with TFSA-first allocation.
   *
   * Rules:
   *  - If the full trade fits in TFSA room → TFSA only
   *  - If it partially fits and overflowEnabled → split: max whole shares to TFSA, rest to Non-Reg
   *  - If TFSA is full and overflowEnabled → Non-Reg only
   *  - If it would overflow and overflow is disabled → return error, no trade
   */
  const buy = useCallback(
    (symbol: string, shares: number, price: number, targetAccount?: AccountType): BuyResult => {
      const totalCost = shares * price;
      const remaining =
        state.tfsaConfig.totalRoom - state.tfsaConfig.contributed;

      let tfsaShares = 0;
      let nonRegShares = 0;
      let tfsaCost = 0;
      let nonRegCost = 0;
      let warning: string | undefined;

      if (targetAccount === "NON_REG") {
        // Buy directly into Non-Registered, skip TFSA entirely
        if (state.nonReg.cashBalance < totalCost) {
          return {
            error: `Insufficient Non-Reg cash. Need $${totalCost.toFixed(2)}, have $${state.nonReg.cashBalance.toFixed(2)}.`,
          };
        }
        nonRegShares = shares;
        nonRegCost = totalCost;
      } else if (targetAccount === "TFSA") {
        // Buy directly into TFSA, no overflow
        if (remaining < totalCost) {
          return {
            error: `Insufficient TFSA room. Need $${totalCost.toFixed(2)}, have $${remaining.toFixed(2)} room.`,
          };
        }
        if (state.tfsa.cashBalance < totalCost) {
          return {
            error: `Insufficient TFSA cash. Need $${totalCost.toFixed(2)}, have $${state.tfsa.cashBalance.toFixed(2)}.`,
          };
        }
        tfsaShares = shares;
        tfsaCost = totalCost;
      } else if (remaining >= totalCost) {
        // Auto: all fits in TFSA
        tfsaShares = shares;
        tfsaCost = totalCost;
      } else if (remaining > 0 && state.tfsaConfig.overflowEnabled) {
        // Auto partial fit: floor to whole shares that fit in TFSA, overflow to Non-Reg
        tfsaShares = Math.floor(remaining / price);
        nonRegShares = shares - tfsaShares;
        tfsaCost = tfsaShares * price;
        nonRegCost = nonRegShares * price;
        warning = `TFSA room covers ${tfsaShares} share${tfsaShares !== 1 ? "s" : ""}. ${nonRegShares} routed to Non-Registered (overflow).`;
      } else if (remaining <= 0 && state.tfsaConfig.overflowEnabled) {
        // Auto: TFSA full — all to Non-Reg
        nonRegShares = shares;
        nonRegCost = totalCost;
        warning =
          "TFSA contribution room exhausted. Trade placed in Non-Registered account.";
      } else {
        // Overflow disabled and trade won't fit
        return {
          error: `Trade ($${totalCost.toFixed(2)}) exceeds TFSA room ($${remaining.toFixed(2)}). Enable overflow or reduce shares.`,
        };
      }

      if (tfsaShares > 0 && state.tfsa.cashBalance < tfsaCost) {
        return {
          error: `Insufficient TFSA cash. Need $${tfsaCost.toFixed(2)}, have $${state.tfsa.cashBalance.toFixed(2)}.`,
        };
      }
      if (nonRegShares > 0 && state.nonReg.cashBalance < nonRegCost) {
        return {
          error: `Insufficient Non-Reg cash. Need $${nonRegCost.toFixed(2)}, have $${state.nonReg.cashBalance.toFixed(2)}.`,
        };
      }

      const now = Date.now();
      setState((prev) => {
        let next = { ...prev };
        const newTrades: Trade[] = [];

        if (tfsaShares > 0) {
          next = {
            ...next,
            tfsa: {
              ...next.tfsa,
              cashBalance: next.tfsa.cashBalance - tfsaCost,
              holdings: applyBuy(next.tfsa.holdings, symbol, tfsaShares, price),
            },
            tfsaConfig: {
              ...next.tfsaConfig,
              contributed: next.tfsaConfig.contributed + tfsaCost,
            },
          };
          newTrades.push({
            id: `${now}-t`,
            type: "BUY",
            symbol,
            shares: tfsaShares,
            price,
            account: "TFSA",
            timestamp: now,
          });
        }

        if (nonRegShares > 0) {
          next = {
            ...next,
            nonReg: {
              ...next.nonReg,
              cashBalance: next.nonReg.cashBalance - nonRegCost,
              holdings: applyBuy(
                next.nonReg.holdings,
                symbol,
                nonRegShares,
                price,
              ),
            },
          };
          newTrades.push({
            id: `${now}-n`,
            type: "BUY",
            symbol,
            shares: nonRegShares,
            price,
            account: "NON_REG",
            timestamp: now,
          });
        }

        return { ...next, trades: [...next.trades, ...newTrades] };
      });

      return { tfsaShares, nonRegShares, tfsaCost, nonRegCost, warning };
    },
    [state],
  );

  /**
   * Sell shares from the specified account.
   * TFSA withdrawals restore room the following calendar year — we track this
   * separately and remind the user rather than restoring automatically.
   */
  const sell = useCallback(
    (
      symbol: string,
      shares: number,
      price: number,
      account: AccountType,
    ): SellResult => {
      const acc = account === "TFSA" ? state.tfsa : state.nonReg;
      const holding = acc.holdings.find((h) => h.symbol === symbol);

      if (!holding || holding.shares < shares) {
        return {
          error: `You only hold ${holding?.shares ?? 0} shares of ${symbol} in ${account}.`,
        };
      }

      const proceeds = shares * price;
      const pnl = proceeds - holding.avgCost * shares;

      const now = Date.now();
      setState((prev) => {
        const field = account === "TFSA" ? "tfsa" : "nonReg";
        return {
          ...prev,
          [field]: {
            ...prev[field],
            cashBalance: prev[field].cashBalance + proceeds,
            holdings: applySell(prev[field].holdings, symbol, shares),
          },
          trades: [
            ...prev.trades,
            {
              id: `${now}-s`,
              type: "SELL",
              symbol,
              shares,
              price,
              account,
              timestamp: now,
            },
          ],
        };
      });

      return { proceeds, pnl };
    },
    [state],
  );

  const updateTFSAConfig = useCallback(
    (updates: Partial<PortfolioState["tfsaConfig"]>) =>
      setState((prev) => ({
        ...prev,
        tfsaConfig: { ...prev.tfsaConfig, ...updates },
      })),
    [],
  );

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  return {
    state,
    tfsaRemaining,
    tfsaUsedPct,
    buy,
    sell,
    updateTFSAConfig,
    reset,
  };
}
