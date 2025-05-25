"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import PortfolioChart from "./PortfolioChart";

// Number of data points to keep in history
const MAX_HISTORY = 20;

export default function StockHistoryChart({ symbol }: { symbol: string }) {
  // Track history for all stocks separately
  const [stockHistories, setStockHistories] = useState<{
    [symbol: string]: {
      prices: number[];
      timestamps: string[];
    };
  }>({});

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("stock-update", (data: { [key: string]: number }) => {
      const now = new Date();
      const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(
        2,
        "0"
      )}:${String(now.getSeconds()).padStart(2, "0")}`;

      setStockHistories((prevHistories) => {
        const newHistories = { ...prevHistories };

        // Update histories for all stocks in the data
        Object.entries(data).forEach(([stockSymbol, price]) => {
          // Initialize history for this stock if it doesn't exist
          if (!newHistories[stockSymbol]) {
            newHistories[stockSymbol] = {
              prices: [],
              timestamps: [],
            };
          }

          // Add new price and timestamp
          const prices = [...newHistories[stockSymbol].prices, price];
          const timestamps = [...newHistories[stockSymbol].timestamps, timeStr];

          // Keep only the most recent MAX_HISTORY points
          newHistories[stockSymbol] = {
            prices: prices.slice(-MAX_HISTORY),
            timestamps: timestamps.slice(-MAX_HISTORY),
          };
        });

        return newHistories;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Get history for the currently selected stock
  const currentStockData = stockHistories[symbol] || {
    prices: [],
    timestamps: [],
  };

  return (
    <PortfolioChart
      data={currentStockData.prices}
      labels={currentStockData.timestamps}
    />
  );
}
