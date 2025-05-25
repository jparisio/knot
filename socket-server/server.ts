const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // your frontend URL
    methods: ["GET", "POST"],
  },
});

type StockData = {
  [symbol: string]: number; // Stock symbol as key, price as value
};

// Example mock stocks
const stocks: StockData = {
  AAPL: 175.0,
  TSLA: 700.0,
  AMZN: 3200.0,
};

// Helper to simulate price changes
function randomChange(price: number) {
  const change = (Math.random() - 0.5) * 2; // -1 to +1
  return Math.max(price + change, 0).toFixed(2);
}

io.on("connection", (socket: any) => {
  console.log("Client connected", socket.id);

  // Send stock updates every second
  const interval = setInterval(() => {
    // Update mock stocks
    for (const symbol in stocks) {
      stocks[symbol] = parseFloat(randomChange(stocks[symbol]));
    }

    // Emit updated prices to client
    socket.emit("stock-update", stocks);
  }, 1000);

  socket.on("disconnect", () => {
    clearInterval(interval);
    console.log("Client disconnected", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});
