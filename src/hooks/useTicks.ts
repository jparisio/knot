'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocketContext } from '@/lib/SocketContext';
import type { Tick } from '@/types/tick';

const MAX_TICKS = 300;

export interface TickSnapshot {
  ticks: Tick[];
  latestPrice: number | null;
  latestVolume: number | null;
}

export function useTicks(symbol: string): TickSnapshot {
  const { subscribe, unsubscribe, onTick, getBuffer } = useSocketContext();

  // Seed initial state from the context's rolling buffer so late subscribers
  // see recent history rather than starting from scratch.
  const [ticks, setTicks] = useState<Tick[]>(() => {
    const buf = getBuffer(symbol);
    return buf.length > MAX_TICKS ? buf.slice(-MAX_TICKS) : [...buf];
  });

  const incomingRef = useRef<Tick[]>([]);
  const rafRef = useRef<number | null>(null);

  // Subscribe / unsubscribe when symbol changes
  useEffect(() => {
    subscribe(symbol);
    return () => unsubscribe(symbol);
  }, [symbol, subscribe, unsubscribe]);

  // Re-seed from buffer whenever the symbol changes
  useEffect(() => {
    setTicks(() => {
      const buf = getBuffer(symbol);
      return buf.length > MAX_TICKS ? buf.slice(-MAX_TICKS) : [...buf];
    });
    incomingRef.current = [];
  }, [symbol, getBuffer]);

  // Register tick handler + rAF loop that flushes the incoming buffer to state
  // once per animation frame instead of on every individual tick.
  useEffect(() => {
    const removeHandler = onTick((tick) => {
      if (tick.symbol === symbol) incomingRef.current.push(tick);
    });

    function flush() {
      if (incomingRef.current.length > 0) {
        const batch = incomingRef.current;
        incomingRef.current = [];
        setTicks((prev) => {
          const combined = [...prev, ...batch];
          return combined.length > MAX_TICKS ? combined.slice(-MAX_TICKS) : combined;
        });
      }
      rafRef.current = requestAnimationFrame(flush);
    }

    rafRef.current = requestAnimationFrame(flush);

    return () => {
      removeHandler();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [symbol, onTick]);

  const last = ticks[ticks.length - 1] ?? null;

  return {
    ticks,
    latestPrice: last?.price ?? null,
    latestVolume: last?.volume ?? null,
  };
}
