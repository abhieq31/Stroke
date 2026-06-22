"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Sparkles, CheckCircle2, Wand2, RotateCcw } from "lucide-react";
import type { FieldSpec } from "@/lib/ml/schema";
import type { PredictionResult } from "@/lib/ml/engine";
import type { ConditionMeta } from "@/lib/ml/conditions";
import { RangeField, SelectField, BinaryToggle } from "./field-controls";
import { RiskGauge } from "./risk-gauge";
import { Explanation } from "./explanation";

type ApiResult = PredictionResult & { savedId: string | null };
type Values = Record<string, string>;

const BAND_STYLES: Record<string, { chip: string; label: string }> = {
  Lower: { chip: "bg-emerald-50 text-emerald-700", label: "Lower risk" },
  Moderate: { chip: "bg-amber-50 text-amber-700", label: "Moderate risk" },
  Higher: { chip: "bg-rose-50 text-rose-700", label: "Higher risk" },
};

// Numeric sliders start at sensible defaults; categorical fields stay empty
// so the user makes a deliberate choice.
function initialValues(fields: FieldSpec[]): Values {
  const v: Values = {};
  for (const f of fields) {
    v[f.key] = f.type === "number" ? String(f.sliderDefault ?? f.min ?? 0) : "";
  }
  return v;
}

function timesLabel(n: number): string {
  if (n >= 10) return `${Math.round(n)}×`;
  return `${n.toFixed(1)}×`;
}

function summarize(result: ApiResult): string {
  const top = result.factors.filter((f) => f.direction === "increases").slice(0, 2);
  const names = top.map((f) => f.label.toLowerCase());
  const driver =
    names.length === 2
      ? `${names[0]} and ${names[1]}`
      : names.length === 1
        ? names[0]
        : "your overall profile";
  if (result.riskBand === "Lower") {
    return "Good news — this profile screens as lower risk, around the level of an average person.";
  }
  if (result.riskBand === "Moderate") {
    return `This profile screens as moderately elevated, driven mostly by ${driver}.`;
  }
  return `This profile screens as elevated, driven mostly by ${driver}. It's worth discussing these factors with a clinician.`;
}

export function PredictionForm({
  condition,
  authEnabled,
  signedIn,
}: {
  condition: ConditionMeta;
  authEnabled: boolean;
  signedIn: boolean;
}) {
  const { fields, example } = condition;
  const [values, setValues] = useState<Values>(() => initialValues(fields));
  const [result, setResult] = useState<ApiResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  function reset() {
    setValues(initialValues(fields));
    setResult(null);
    setErrors([]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: condition.id, ...values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? ["Something went wrong."]);
        setResult(null);
      } else {
        setResult(data);
        setTimeout(
          () =>
            document
              .getElementById("result")
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          60,
        );
      }
    } catch {
      setErrors(["Could not reach the server. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Form */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-3"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Takes ~30 seconds · no sign-up needed</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              type="button"
              onClick={() => setValues({ ...example })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Wand2 className="h-3.5 w-3.5" /> Try an example
            </button>
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
          {fields.map((field) => {
            const isWide = field.type === "number";
            return (
              <div key={field.key} className={isWide ? "sm:col-span-2" : ""}>
                {field.type === "number" && (
                  <RangeField field={field} value={values[field.key]} onChange={set(field.key)} />
                )}
                {field.type === "binary" && (
                  <BinaryToggle field={field} value={values[field.key]} onChange={set(field.key)} />
                )}
                {field.type === "select" && (
                  <SelectField field={field} value={values[field.key]} onChange={set(field.key)} />
                )}
              </div>
            );
          })}
        </div>

        {errors.length > 0 && (
          <div className="mt-6 flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <ul className="space-y-0.5">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Assess my risk
            </>
          )}
        </button>
      </form>

      {/* Result */}
      <div className="lg:col-span-2" id="result">
        {result ? (
          <div className="animate-fade-up space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <RiskGauge percent={result.percent} band={result.riskBand} />
                <div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      BAND_STYLES[result.riskBand].chip
                    }`}
                  >
                    {BAND_STYLES[result.riskBand].label}
                  </span>
                  <p className="mt-2 text-2xl font-extrabold leading-tight text-slate-900">
                    {timesLabel(result.timesAverage)}{" "}
                    <span className="text-base font-semibold text-slate-500">
                      the average person&apos;s risk
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Estimated absolute risk {result.percent}% · average person ≈{" "}
                    {Math.round(result.baseProbability * 100)}%
                  </p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                    {summarize(result)}
                  </p>
                </div>
              </div>

              {authEnabled && (
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
                  {result.savedId ? (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Saved to your history
                    </span>
                  ) : signedIn ? (
                    <span className="text-slate-400">Could not save this result.</span>
                  ) : (
                    <span className="text-slate-500">
                      <Link href="/login" className="font-medium text-brand-700 underline">
                        Sign in
                      </Link>{" "}
                      to save your assessments.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Explanation
                factors={result.factors}
                baseProbability={result.baseProbability}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              Your risk score and a full breakdown of contributing factors will appear
              here.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Every result is fully explained — no black box.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
