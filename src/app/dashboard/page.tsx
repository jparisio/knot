"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import StockHistoryChart from "@/components/charts/StockHistoryChart";

export default function Dashboard() {
  const [stocks, setStocks] = useState<{ [key: string]: number }>({});
  const [selectedStock, setSelectedStock] = useState<string>("AAPL");

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("stock-update", (data) => {
      setStocks(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl mb-4 font-bold">Real-time Stocks</h1>

      <div className="mb-6">
        <label className="block mb-2">Select Stock to Chart:</label>
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-4 py-2"
          style={{ color: "#10b981" }}
        >
          {Object.keys(stocks).map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 bg-gray-900 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "#10b981" }}>
          {selectedStock} Price History
        </h2>
        <StockHistoryChart symbol={selectedStock} />
      </div>

      <h2 className="text-xl font-semibold mb-4">Current Prices</h2>
      <ul>
        {Object.entries(stocks).map(([symbol, price]) => (
          <li key={symbol} className="mb-2">
            <span className="font-semibold">{symbol}: </span>
            <span>{price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
