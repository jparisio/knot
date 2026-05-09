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

ChartJS.defaults.color = 'rgba(255,255,255,0.25)';
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.04)';

const UP_STROKE = '#00d07e';
const DOWN_STROKE = '#ff453a';
const UP_FILL = 'rgba(0, 208, 126, 0.07)';
const DOWN_FILL = 'rgba(255, 67, 58, 0.07)';

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
            backgroundColor: '#1e1e1e',
            titleColor: 'rgba(255,255,255,0.35)',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => ` $${Number(ctx.raw).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: 'rgba(255,255,255,0.2)',
              maxTicksLimit: 6,
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { display: false },
          },
          y: {
            display: true,
            position: 'right',
            ticks: {
              color: 'rgba(255,255,255,0.2)',
              font: { family: 'Inter, system-ui, sans-serif', size: 11 },
              callback: (v) => `$${Number(v).toFixed(2)}`,
            },
            grid: { color: 'rgba(255,255,255,0.04)' },
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
        <div className="absolute inset-0 flex items-center justify-center text-white/15 text-[13px] tracking-wide">
          Awaiting feed
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
