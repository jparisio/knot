# Knot

A real-time market data dashboard with paper trading and Canadian TFSA tracking, built with Next.js, Socket.io, and Finnhub.

## What it does

**Live market data**
- Streams real trade ticks from Finnhub's WebSocket feed via a Node.js relay server
- Falls back to a random-walk price simulation when markets are closed (weekends/holidays) seeded from the real last close via Finnhub's REST API
- Watchlist with per-symbol sparklines and live price flash on tick arrival
- Full Chart.js tick chart for the selected symbol, updated at up to 60fps using requestAnimationFrame batching

**Paper trading**
- Buy and sell any symbol at the live market price
- Account selector on buy (Auto / TFSA-only / Non-Registered) and sell
- Weighted average cost basis tracking per position
- Live unrealized P&L per holding, recalculated on every tick

**TFSA contribution room tracking**
- Tracks contributions against your CRA lifetime room
- Auto-calculates lifetime room from birth year using official CRA annual limits (2009–2026)
- Warns at 85% and 100% usage
- Auto-overflow: trades that exceed TFSA room are routed to the Non-Registered account instead of being rejected
- Separate TFSA and Non-Registered holdings views
- Portfolio state persisted to localStorage across sessions

**Symbol search**
- Debounced autocomplete via Finnhub's symbol search API (proxied through a Next.js API route to keep the key server-side)

## Architecture

```
Finnhub WSS ──→ socket-server (Node/Socket.io) ──→ browser
                  pub/sub per symbol                  SocketContext (one connection)
                  exponential backoff reconnect         └── useTicks (rAF-throttled)
                  simulation fallback                   └── usePortfolio (localStorage)
```

- **Single socket connection** shared across all components via React Context — no duplicate Finnhub subscriptions regardless of how many symbols are on screen
- **Ref-counted subscriptions** on both server and client — symbols are subscribed/unsubscribed automatically as components mount and unmount
- **Rolling 500-tick buffer** per symbol in context so the chart seeds from history instantly when you switch symbols

## Stack

- Next.js 14 (App Router)
- TypeScript
- Socket.io (client + server)
- Chart.js (imperative canvas updates, no re-instantiation on tick)
- Tailwind CSS
- Finnhub API (WebSocket + REST quote + symbol search)

## Running locally

1. Get a free API key at [finnhub.io](https://finnhub.io)
2. Add it to `.env` in the project root:
   ```
   FINNHUB_API_KEY=your_key_here
   ```
3. Start the socket server:
   ```bash
   cd socket-server && npm install && npm run dev
   ```
4. Start the Next.js app:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)
