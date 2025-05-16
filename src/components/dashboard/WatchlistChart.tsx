"use client";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip
);

const data = {
  labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  datasets: [
    {
      label: "S&P 500",
      data: [3700, 5000, 4500, 6000, 5200, 6500],
      borderColor: "rgba(34,197,94,1)",
      backgroundColor: "rgba(34,197,94,0.2)",
      // fill: true,
      tension: 0.3,
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: { color: "#9CA3AF" },
      grid: { display: false },
    },
    y: {
      ticks: { color: "#9CA3AF" },
      grid: { color: "#374151" },
    },
  },
};

export default function WatchlistChart() {
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">S&P 500</h2>
      <Line data={data} options={options} />
    </div>
  );
}
