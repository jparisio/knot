'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import type { Tick } from '@/types/tick';

ChartJS.register(LineController, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

ChartJS.defaults.color = '#475569';
ChartJS.defaults.borderColor = '#1e2130';

const UP_STROKE = '#10b981';
const DOWN_STROKE = '#ef4444';
const UP_FILL = 'rgba(16,185,129,0.06)';
const DOWN_FILL = 'rgba(239,68,68,0.06)';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface Props {
  ticks: Tick[];
}

export function TickChart({ ticks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  // Create chart once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current = new ChartJS(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderColor: UP_STROKE,
            borderWidth: 1.5,
            fill: true,
            backgroundColor: UP_FILL,
            pointRadius: 0,
            tension: 0,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f1117',
            titleColor: '#64748b',
            bodyColor: '#e2e8f0',
            borderColor: '#1e2130',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => ` $${Number(ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: '#334155',
              maxTicksLimit: 6,
              font: { family: 'monospace', size: 10 },
            },
            grid: { color: '#0f1117' },
            border: { display: false },
          },
          y: {
            display: true,
            position: 'right',
            ticks: {
              color: '#334155',
              font: { family: 'monospace', size: 11 },
              callback: (v) => `$${Number(v).toFixed(2)}`,
            },
            grid: { color: '#0f1117' },
            border: { display: false },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  // Efficiently push new data into the existing chart instance — no re-instantiation,
  // no animation overhead. update('none') skips easing entirely.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || ticks.length === 0) return;

    const isUp = ticks[ticks.length - 1].price >= ticks[0].price;
    chart.data.datasets[0].borderColor = isUp ? UP_STROKE : DOWN_STROKE;
    chart.data.datasets[0].backgroundColor = isUp ? UP_FILL : DOWN_FILL;
    chart.data.labels = ticks.map((t) => formatTime(t.timestamp));
    chart.data.datasets[0].data = ticks.map((t) => t.price);
    chart.update('none');
  }, [ticks]);

  return (
    <div className="relative w-full h-full">
      {ticks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-700 text-xs font-mono tracking-widest">
          AWAITING FEED
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
