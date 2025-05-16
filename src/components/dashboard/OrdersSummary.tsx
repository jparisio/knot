"use client";

import React from "react";

const orders = [
  {
    name: "Apple Inc",
    ticker: "AAPL",
    portfolioValue: "15,215.70",
    change: "+0.66%",
    color: "bg-blue-500",
  },
  {
    name: "Nasdaq Inc",
    ticker: "NDAQ",
    portfolioValue: "15,120.20",
    change: "-0.28%",
    color: "bg-pink-500",
  },
  {
    name: "Tesla Inc",
    ticker: "TSLA",
    portfolioValue: "10,225.40",
    change: "+1.66%",
    color: "bg-purple-500",
  },
  {
    name: "Amazon Inc",
    ticker: "AMZN",
    portfolioValue: "40,500.20",
    change: "+2.56%",
    color: "bg-yellow-500",
  },
];

export default function OrdersSummary() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {orders.map((order) => (
        <div
          key={order.ticker}
          className="bg-gray-900 rounded-xl p-4 shadow-lg flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs text-white font-semibold px-2 py-1 rounded ${order.color}`}
            >
              {order.name}
            </span>
            <span className="text-sm text-gray-400">{order.ticker}</span>
          </div>
          <div className="text-xl font-bold text-white">
            ${order.portfolioValue}
          </div>
          <div
            className={`text-sm ${
              order.change.startsWith("-") ? "text-red-500" : "text-green-500"
            }`}
          >
            {order.change}
          </div>
        </div>
      ))}
    </div>
  );
}
