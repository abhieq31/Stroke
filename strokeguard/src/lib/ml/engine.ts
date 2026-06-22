// Generic, condition-agnostic inference engine. Given any exported model
// (see stroke-risk-app/model/build.py) and its field schema, it produces a
// calibrated risk and an *exact* per-factor explanation.
//
// For a linear model, a feature's contribution to the log-odds is exactly
// coef * (x - mean) — the closed-form Shapley value with the dataset mean as
// reference. Calibration maps the raw logit to a true-prevalence probability.

import type { FieldSpec, RawInput } from "./schema";

interface ModelFeature {
  name: string;
  coef: number;
  mean: number;
}

export interface Model {
  model_type: string;
  intercept: number;
  calibration: { A: number; B: number };
  population_risk: number;
  risk_bands: { moderate: number; higher: number };
  numeric_features: string[];
  binary_features: string[];
  categorical_features: string[];
  scaler: Record<string, { mean: number; scale: number }>;
  categories: Record<string, string[]>;
  features: ModelFeature[];
}

export type RiskBand = "Lower" | "Moderate" | "Higher";

export interface FactorContribution {
  key: string;
  label: string;
  valueLabel: string;
  contribution: number;
  weight: number;
  direction: "increases" | "decreases";
}

export interface PredictionResult {
  probability: number;
  percent: number;
  riskBand: RiskBand;
  baseProbability: number;
  timesAverage: number;
  factors: FactorContribution[];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

function riskBand(model: Model, p: number): RiskBand {
  if (p < model.risk_bands.moderate) return "Lower";
  if (p < model.risk_bands.higher) return "Moderate";
  return "Higher";
}

function rawKeyFor(model: Model, name: string): string {
  const [kind, rest] = name.split("__", 2);
  if (kind === "numeric" || kind === "binary") return rest;
  for (const field of model.categorical_features) {
    if (rest === field || rest.startsWith(field + "_")) return field;
  }
  return rest;
}

function transformedValue(model: Model, name: string, input: RawInput): number {
  const [kind, rest] = name.split("__", 2);
  if (kind === "numeric") {
    const sc = model.scaler[rest];
    return (Number(input[rest]) - sc.mean) / sc.scale;
  }
  if (kind === "binary") return Number(input[rest]);
  const field = model.categorical_features.find(
    (f) => rest === f || rest.startsWith(f + "_"),
  )!;
  return String(input[field]) === rest.slice(field.length + 1) ? 1 : 0;
}

export function predict(
  model: Model,
  fields: FieldSpec[],
  input: RawInput,
): PredictionResult {
  const labels = new Map(fields.map((f) => [f.key, f.label]));
  const binary = new Set(model.binary_features);

  const formatValue = (key: string): string => {
    const v = input[key];
    if (binary.has(key)) return Number(v) === 1 ? "Yes" : "No";
    return String(v);
  };

  let logit = model.intercept;
  const perRaw: Record<string, number> = {};
  for (const feat of model.features) {
    const x = transformedValue(model, feat.name, input);
    logit += feat.coef * x;
    const key = rawKeyFor(model, feat.name);
    perRaw[key] = (perRaw[key] ?? 0) + feat.coef * (x - feat.mean);
  }

  const probability = sigmoid(model.calibration.A * logit + model.calibration.B);
  const baseProbability = model.population_risk;
  const totalAbs = Object.values(perRaw).reduce((a, b) => a + Math.abs(b), 0) || 1;

  const factors: FactorContribution[] = Object.entries(perRaw)
    .map(([key, contribution]) => ({
      key,
      label: labels.get(key) ?? key,
      valueLabel: formatValue(key),
      contribution,
      weight: Math.abs(contribution) / totalAbs,
      direction: (contribution >= 0 ? "increases" : "decreases") as
        | "increases"
        | "decreases",
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    probability,
    percent: Math.round(probability * 100),
    riskBand: riskBand(model, probability),
    baseProbability,
    timesAverage: probability / baseProbability,
    factors,
  };
}
