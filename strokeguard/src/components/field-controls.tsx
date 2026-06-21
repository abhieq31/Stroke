"use client";

import { useEffect, useRef, useState } from "react";
import { Info, Calculator, X } from "lucide-react";
import { classify, type FieldSpec, type Tone } from "@/lib/ml/schema";

const TONE_CHIP: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  warn: "bg-amber-50 text-amber-700 ring-amber-600/10",
  bad: "bg-rose-50 text-rose-700 ring-rose-600/10",
};

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
  return ref;
}

export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="More information"
        onClick={() => setOpen((o) => !o)}
        className="text-slate-400 transition hover:text-brand-600"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span className="absolute left-1/2 top-6 z-30 w-60 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed font-normal text-slate-600 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function ClassChip({ field, value }: { field: FieldSpec; value: string }) {
  if (value === "") return null;
  const band = classify(field, Number(value));
  if (!band) return null;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE_CHIP[band.tone]}`}
    >
      {band.label}
    </span>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20";

export function RangeField({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  const [showCalc, setShowCalc] = useState(false);
  const sliderVal = value === "" ? (field.sliderDefault ?? field.min ?? 0) : Number(value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label
          htmlFor={field.key}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          {field.label}
          {field.unit && <span className="font-normal text-slate-400">({field.unit})</span>}
          <InfoTip text={field.help} />
        </label>
        <div className="flex items-center gap-2">
          <ClassChip field={field} value={value} />
          {field.calculator === "bmi" && (
            <button
              type="button"
              onClick={() => setShowCalc((s) => !s)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <Calculator className="h-3.5 w-3.5" /> Calculate
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={sliderVal}
          onChange={(e) => onChange(e.target.value)}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600"
          aria-label={`${field.label} slider`}
        />
        <input
          id={field.key}
          name={field.key}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} w-24 text-center`}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-slate-400">
        <span>
          {field.min}–{field.max} {field.unit}
        </span>
        {field.referenceLabel && <span>{field.referenceLabel}</span>}
      </div>

      {showCalc && (
        <BmiCalculator
          onApply={(bmi) => {
            onChange(bmi.toFixed(1));
            setShowCalc(false);
          }}
          onClose={() => setShowCalc(false)}
        />
      )}
    </div>
  );
}

function BmiCalculator({
  onApply,
  onClose,
}: {
  onApply: (bmi: number) => void;
  onClose: () => void;
}) {
  const ref = useOutsideClose(true, onClose);
  const [metric, setMetric] = useState(true);
  // metric
  const [cm, setCm] = useState("");
  const [kg, setKg] = useState("");
  // imperial
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [lb, setLb] = useState("");

  let bmi: number | null = null;
  if (metric) {
    const h = Number(cm) / 100;
    const w = Number(kg);
    if (h > 0 && w > 0) bmi = w / (h * h);
  } else {
    const totalIn = Number(ft) * 12 + Number(inch);
    const w = Number(lb);
    if (totalIn > 0 && w > 0) bmi = (w / (totalIn * totalIn)) * 703;
  }
  const valid = bmi !== null && bmi >= 10 && bmi <= 80;

  return (
    <div
      ref={ref}
      className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800">BMI calculator</span>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMetric(true)}
              className={`rounded-md px-2.5 py-1 ${metric ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Metric
            </button>
            <button
              type="button"
              onClick={() => setMetric(false)}
              className={`rounded-md px-2.5 py-1 ${!metric ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Imperial
            </button>
          </div>
          <button type="button" onClick={onClose} aria-label="Close calculator">
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      </div>

      {metric ? (
        <div className="grid grid-cols-2 gap-2">
          <LabeledMini label="Height (cm)" value={cm} onChange={setCm} placeholder="170" />
          <LabeledMini label="Weight (kg)" value={kg} onChange={setKg} placeholder="70" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <LabeledMini label="Height (ft)" value={ft} onChange={setFt} placeholder="5" />
          <LabeledMini label="(in)" value={inch} onChange={setInch} placeholder="9" />
          <LabeledMini label="Weight (lb)" value={lb} onChange={setLb} placeholder="155" />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {valid ? (
            <>
              BMI = <strong className="text-slate-900">{bmi!.toFixed(1)}</strong>
            </>
          ) : (
            "Enter height & weight"
          )}
        </span>
        <button
          type="button"
          disabled={!valid}
          onClick={() => valid && onApply(bmi!)}
          className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          Use this value
        </button>
      </div>
    </div>
  );
}

function LabeledMini({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

export function SelectField({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={field.key}
        className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700"
      >
        {field.label}
        <InfoTip text={field.help} />
      </label>
      <select
        id={field.key}
        name={field.key}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="" disabled>
          Select
        </option>
        {field.options!.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BinaryToggle({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {field.label}
        <InfoTip text={field.help} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { v: "1", label: "Yes" },
          { v: "0", label: "No" },
        ].map((opt) => {
          const active = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              className={`rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20"
                  : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-white"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
