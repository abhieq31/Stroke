"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { FactorContribution } from "@/lib/ml/predict";

// Visualizes each feature's exact contribution to the log-odds as a diverging
// bar chart: green bars (left) lower risk, red bars (right) raise it. This is
// an exact decomposition for the linear model, not a post-hoc approximation.
export function Explanation({
  factors,
  baseProbability,
}: {
  factors: FactorContribution[];
  baseProbability: number;
}) {
  const maxAbs = Math.max(...factors.map((f) => Math.abs(f.contribution)), 0.0001);
  const top = factors.slice(0, 7);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Why this score
        </h3>
        <span className="text-xs text-slate-400">
          avg. person ≈ {Math.round(baseProbability * 100)}%
        </span>
      </div>

      <div className="space-y-2.5">
        {top.map((f) => {
          const widthPct = (Math.abs(f.contribution) / maxAbs) * 100;
          const raises = f.direction === "increases";
          return (
            <div key={f.key} className="flex items-center gap-3 text-sm">
              <div className="w-36 shrink-0 text-right">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="ml-1 text-slate-400">{f.valueLabel}</span>
              </div>

              {/* diverging bar track with a center axis */}
              <div className="relative h-6 flex-1">
                <div className="absolute left-1/2 top-0 h-full w-px bg-slate-200" />
                <div className="absolute left-0 flex h-full w-1/2 justify-end pr-px">
                  {!raises && (
                    <div
                      className="h-full rounded-l-md bg-emerald-400/80"
                      style={{ width: `${widthPct}%` }}
                    />
                  )}
                </div>
                <div className="absolute right-0 flex h-full w-1/2 justify-start pl-px">
                  {raises && (
                    <div
                      className="h-full rounded-r-md bg-rose-400/90"
                      style={{ width: `${widthPct}%` }}
                    />
                  )}
                </div>
              </div>

              <div
                className={`flex w-16 shrink-0 items-center gap-0.5 text-xs font-semibold ${
                  raises ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {raises ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {raises ? "raises" : "lowers"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/80" /> Lowers your risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-400/90" /> Raises your risk
        </span>
      </div>
    </div>
  );
}
