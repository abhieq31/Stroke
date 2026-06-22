"use client";

import { useState } from "react";
import { Activity, Droplet } from "lucide-react";
import type { ConditionMeta } from "@/lib/ml/conditions";
import { PredictionForm } from "./prediction-form";

const ICONS: Record<string, React.ReactNode> = {
  stroke: <Activity className="h-4 w-4" />,
  diabetes: <Droplet className="h-4 w-4" />,
};

export function PredictPanel({
  conditions,
  authEnabled,
  signedIn,
}: {
  conditions: ConditionMeta[];
  authEnabled: boolean;
  signedIn: boolean;
}) {
  const [activeId, setActiveId] = useState(conditions[0]?.id);
  const active = conditions.find((c) => c.id === activeId) ?? conditions[0];

  return (
    <div>
      {/* Condition selector */}
      <div className="mb-7 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {conditions.map((c) => {
          const on = c.id === active.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                on
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {ICONS[c.id]}
              {c.name}
            </button>
          );
        })}
      </div>

      <p className="mb-6 -mt-2 text-sm text-slate-500">{active.tagline}</p>

      {/* Remount on switch so state + result reset cleanly */}
      <PredictionForm
        key={active.id}
        condition={active}
        authEnabled={authEnabled}
        signedIn={signedIn}
      />
    </div>
  );
}
