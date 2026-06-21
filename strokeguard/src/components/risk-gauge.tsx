"use client";

import { useEffect, useState } from "react";

const BAND_COLOR: Record<string, string> = {
  Lower: "#14b8a6",
  Moderate: "#f59e0b",
  Higher: "#ef4444",
};

export function RiskGauge({
  percent,
  band,
}: {
  percent: number;
  band: string;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setOffset(circumference - (circumference * percent) / 100),
    );
    return () => cancelAnimationFrame(id);
  }, [percent, circumference]);

  const color = BAND_COLOR[band] ?? BAND_COLOR.Lower;

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="11"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-fg"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums text-slate-900">
          {percent}%
        </span>
        <span className="text-xs font-medium text-slate-500">est. risk</span>
      </div>
    </div>
  );
}
