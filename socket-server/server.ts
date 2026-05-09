import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import https from 'https';

function fetchLastPrice(symbol: string): Promise<number | null> {
  return new Promise((resolve) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_TOKEN}`;
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const { c, pc } = JSON.parse(raw);
          // c = current/last price, pc = previous close — use whichever is non-zero
          resolve((c && c > 0) ? c : (pc && pc > 0) ? pc : null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const FINNHUB_TOKEN = process.env.FINNHUB_API_KEY;
if (!FINNHUB_TOKEN) {
  console.error('[server] FINNHUB_API_KEY is not set. Add it to .env in the project root.');
  process.exit(1);
}

const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${FINNHUB_TOKEN}`;

interface FinnhubTrade {
  p: number;
  s: string;
  t: number;
  v: number;
}

interface Tick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  sim?: true;
}

// ─── Pub/sub ────────────────────────────────────────────────────────────────

const subscriptions = new Map<string, Set<string>>();

// ─── Finnhub WebSocket ───────────────────────────────────────────────────────

let fhWs: WebSocket | null = null;
let fhAttempts = 0;
let fhTimer: ReturnType<typeof setTimeout> | null = null;

// Timestamp of last real Finnhub tick per symbol — used to decide when to simulate
const lastRealTick = new Map<string, number>();

function fhSend(msg: object): void {
  if (fhWs?.readyState === WebSocket.OPEN) {
    fhWs.send(JSON.stringify(msg));
  }
}

function connectFinnhub(): void {
  if (fhTimer) return;

  const delay =
    fhAttempts === 0 ? 0 : Math.min(1_000 * Math.pow(2, fhAttempts), 30_000);
  if (delay > 0) console.log(`[finnhub] reconnecting in ${delay}ms (attempt ${fhAttempts})`);

  fhTimer = setTimeout(() => {
    fhTimer = null;
    fhWs = new WebSocket(FINNHUB_WS_URL);

    fhWs.on('open', () => {
      console.log('[finnhub] connected');
      fhAttempts = 0;
      for (const symbol of subscriptions.keys()) fhSend({ type: 'subscribe', symbol });
    });

    fhWs.on('message', (raw: Buffer) => {
      let msg: { type: string; data?: FinnhubTrade[] };
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;

      for (const trade of msg.data) {
        lastRealTick.set(trade.s, Date.now());

        const subs = subscriptions.get(trade.s);
        if (!subs?.size) continue;

        const tick: Tick = { symbol: trade.s, price: trade.p, volume: trade.v, timestamp: trade.t };
        for (const sid of subs) io.to(sid).emit('tick', tick);
      }
    });

    fhWs.on('close', () => { console.log('[finnhub] disconnected'); fhAttempts++; connectFinnhub(); });
    fhWs.on('error', (err) => { console.error('[finnhub] error:', err.message); fhWs?.terminate(); });
  }, delay);
}

// ─── Simulation fallback ─────────────────────────────────────────────────────
// Generates synthetic random-walk ticks when Finnhub isn't sending real data.
// Activates automatically: when market is closed, or when no real tick has
// arrived for a symbol within REAL_TICK_TIMEOUT ms of subscription.

const SIM_INTERVAL_MS = 600;
const REAL_TICK_TIMEOUT_MS = 4_000;

const SIM_BASE_PRICES: Record<string, number> = {
  AAPL: 213.49,
  TSLA: 248.23,
  AMZN: 204.85,
  NVDA: 114.50,
  MSFT: 421.90,
};

const simPrices = new Map<string, number>();
const simTimers = new Map<string, ReturnType<typeof setInterval>>();

function isMarketOpen(): boolean {
  const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const h = et.getHours() + et.getMinutes() / 60;
  return h >= 9.5 && h < 16;
}

function startSim(symbol: string): void {
  if (simTimers.has(symbol)) return;
  if (!simPrices.has(symbol)) {
    simPrices.set(symbol, SIM_BASE_PRICES[symbol] ?? 100);
  }

  console.log(`[sim] starting simulation for ${symbol}`);

  const interval = setInterval(() => {
    // Yield to real data if market is open and ticks are flowing
    const sinceReal = Date.now() - (lastRealTick.get(symbol) ?? 0);
    if (isMarketOpen() && sinceReal < REAL_TICK_TIMEOUT_MS) {
      stopSim(symbol);
      return;
    }

    if (!subscriptions.has(symbol)) { stopSim(symbol); return; }

    const price = simPrices.get(symbol)!;
    // Random walk: ±0.08% per tick
    const next = Math.max(price + (Math.random() - 0.5) * price * 0.0008, 0.01);
    simPrices.set(symbol, parseFloat(next.toFixed(2)));

    const tick: Tick = {
      symbol,
      price: simPrices.get(symbol)!,
      volume: Math.floor(Math.random() * 800) + 100,
      timestamp: Date.now(),
      sim: true,
    };

    const subs = subscriptions.get(symbol);
    if (subs) for (const sid of subs) io.to(sid).emit('tick', tick);
  }, SIM_INTERVAL_MS);

  simTimers.set(symbol, interval);
}

function stopSim(symbol: string): void {
  const t = simTimers.get(symbol);
  if (t) { clearInterval(t); simTimers.delete(symbol); console.log(`[sim] stopped ${symbol}`); }
}

// ─── Sub management ──────────────────────────────────────────────────────────

async function addSub(symbol: string, socketId: string): Promise<void> {
  const isNew = !subscriptions.has(symbol);
  if (isNew) subscriptions.set(symbol, new Set());
  subscriptions.get(symbol)!.add(socketId);

  if (isNew) {
    fhSend({ type: 'subscribe', symbol });

    // Seed sim price from Finnhub REST quote (real last/prev-close price)
    if (!simPrices.has(symbol)) {
      const fetched = await fetchLastPrice(symbol);
      if (fetched !== null) console.log(`[finnhub] REST quote ${symbol}: $${fetched}`);
      const seed = fetched ?? SIM_BASE_PRICES[symbol] ?? 100;
      simPrices.set(symbol, seed);
      console.log(`[sim] seeded ${symbol} @ $${seed}${fetched ? ' (REST)' : ' (fallback)'}`);
    }

    if (!isMarketOpen()) {
      startSim(symbol);
    } else {
      setTimeout(() => {
        const sinceReal = Date.now() - (lastRealTick.get(symbol) ?? 0);
        if (sinceReal > REAL_TICK_TIMEOUT_MS && subscriptions.has(symbol)) {
          startSim(symbol);
        }
      }, REAL_TICK_TIMEOUT_MS);
    }
  }

  console.log(`[io] ${socketId} subscribed to ${symbol} (${subscriptions.get(symbol)!.size} subs)`);
}

function removeSub(symbol: string, socketId: string): void {
  const subs = subscriptions.get(symbol);
  if (!subs) return;
  subs.delete(socketId);
  if (subs.size === 0) {
    subscriptions.delete(symbol);
    fhSend({ type: 'unsubscribe', symbol });
    stopSim(symbol);
  }
}

// ─── Socket.io ───────────────────────────────────────────────────────────────

connectFinnhub();

io.on('connection', (socket: Socket) => {
  console.log(`[io] client connected: ${socket.id}`);

  socket.on('subscribe', (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const symbol = raw.toUpperCase().trim();
    if (symbol) addSub(symbol, socket.id);
  });

  socket.on('unsubscribe', (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const symbol = raw.toUpperCase().trim();
    if (symbol) removeSub(symbol, socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[io] client disconnected: ${socket.id} (${reason})`);
    for (const symbol of Array.from(subscriptions.keys())) removeSub(symbol, socket.id);
  });
});

httpServer.listen(4000, () => console.log('[server] listening on :4000'));
