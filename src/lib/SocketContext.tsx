'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Tick } from '@/types/tick';

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const BUFFER_SIZE = 500; // ticks per symbol kept in rolling context buffer

interface SocketContextValue {
  connectionState: ConnectionState;
  reconnectAttempt: number;
  isSimulated: boolean;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  onTick: (handler: (tick: Tick) => void) => () => void;
  getBuffer: (symbol: string) => Tick[];
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ref-counted subscriptions: symbol -> count of active useTicks() consumers
  const refCounts = useRef(new Map<string, number>());
  const tickHandlers = useRef(new Set<(tick: Tick) => void>());
  // rolling per-symbol buffer so late subscribers can seed from recent history
  const tickBuffers = useRef(new Map<string, Tick[]>());

  const scheduleReconnect = useCallback(() => {
    if (timerRef.current) return;
    const attempt = attemptsRef.current++;
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
    setReconnectAttempt(attempt + 1);
    console.log(`[socket] reconnect in ${delay}ms (attempt ${attempt + 1})`);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      socketRef.current?.connect();
    }, delay);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: false, // manual exponential backoff
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      attemptsRef.current = 0;
      setReconnectAttempt(0);
      setConnectionState('connected');
      // Re-subscribe to all currently ref-counted symbols after reconnect
      for (const [sym, count] of refCounts.current) {
        if (count > 0) socket.emit('subscribe', sym);
      }
    });

    socket.on('disconnect', (reason: string) => {
      if (reason === 'io client disconnect') return;
      setConnectionState('reconnecting');
      scheduleReconnect();
    });

    socket.on('connect_error', () => {
      setConnectionState('reconnecting');
      scheduleReconnect();
    });

    socket.on('tick', (tick: Tick) => {
      setIsSimulated(!!tick.sim);
      // Append to rolling buffer, evict oldest if full
      const buf = tickBuffers.current.get(tick.symbol) ?? [];
      buf.push(tick);
      if (buf.length > BUFFER_SIZE) buf.shift();
      tickBuffers.current.set(tick.symbol, buf);
      for (const handler of tickHandlers.current) handler(tick);
    });

    socket.connect();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      socket.disconnect();
    };
  }, [scheduleReconnect]);

  const subscribe = useCallback((symbol: string) => {
    const count = (refCounts.current.get(symbol) ?? 0) + 1;
    refCounts.current.set(symbol, count);
    if (count === 1) socketRef.current?.emit('subscribe', symbol);
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    const count = (refCounts.current.get(symbol) ?? 0) - 1;
    if (count <= 0) {
      refCounts.current.delete(symbol);
      socketRef.current?.emit('unsubscribe', symbol);
    } else {
      refCounts.current.set(symbol, count);
    }
  }, []);

  const onTick = useCallback((handler: (tick: Tick) => void) => {
    tickHandlers.current.add(handler);
    return () => void tickHandlers.current.delete(handler);
  }, []);

  const getBuffer = useCallback((symbol: string): Tick[] => {
    return tickBuffers.current.get(symbol) ?? [];
  }, []);

  const value = useMemo(
    () => ({ connectionState, reconnectAttempt, isSimulated, subscribe, unsubscribe, onTick, getBuffer }),
    [connectionState, reconnectAttempt, isSimulated, subscribe, unsubscribe, onTick, getBuffer]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used within SocketProvider');
  return ctx;
}
