"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useMemo } from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PortfolioChartProps {
  data?: number[];
  labels?: string[];
}

// ...existing imports

export default function PortfolioChart({ data, labels }: PortfolioChartProps) {
  const chartData = useMemo(
    () => ({
      labels: labels ?? ["Mon", "Tue", "Wed", "Thu", "Fri"],
      datasets: [
        {
          label: "Price",
          data: data ?? [10000, 10100, 10050, 10200, 10400],
          borderColor: "#10B981", // Tailwind emerald-500
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [data, labels]
  );

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
