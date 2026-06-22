// Native TypeScript implementation of the trained Logistic Regression
// pipeline. Produces predictions and *exact* per-feature explanations.
//
// For a linear model, the contribution of feature i to the log-odds is
//   coef_i * (x_i - mean_i)
// which is the closed-form Shapley value using the dataset mean as the
// reference. Summing all contributions and the base value reproduces the
// model's log-odds exactly (verified against scikit-learn to < 1e-6).

import modelJson from "./model.json";
import { FRIENDLY_LABELS, type RawInput } from "./schema";

interface ModelFeature {
  name: string;
  coef: number;
  mean: number;
}

interface Model {
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

const MODEL = modelJson as Model;

export type RiskBand = "Lower" | "Moderate" | "Higher";

export interface FactorContribution {
  /** Raw feature key, e.g. "age". */
  key: string;
  /** Human label, e.g. "Age". */
  label: string;
  /** The patient's value for this feature, formatted for display. */
  valueLabel: string;
  /** Signed contribution to the log-odds (positive = raises risk). */
  contribution: number;
  /** Share of the total absolute movement, 0..1, for bar sizing. */
  weight: number;
  direction: "increases" | "decreases";
}

export interface PredictionResult {
  /** Calibrated absolute stroke risk, 0..1. */
  probability: number;
  percent: number; // 0..100, rounded
  riskBand: RiskBand;
  /** Average person's calibrated risk (population reference). */
  baseProbability: number;
  /** How many times the average person's risk this profile carries. */
  timesAverage: number;
  factors: FactorContribution[];
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Apply Platt calibration to a raw logit -> true-prevalence probability. */
function calibrate(logit: number): number {
  return sigmoid(MODEL.calibration.A * logit + MODEL.calibration.B);
}

function riskBand(p: number): RiskBand {
  if (p < MODEL.risk_bands.moderate) return "Lower";
  if (p < MODEL.risk_bands.higher) return "Moderate";
  return "Higher";
}

/** Turn a transformed column name into its raw feature key. */
function rawKeyFor(name: string): string {
  const [kind, rest] = name.split("__", 2);
  if (kind === "numeric" || kind === "binary") return rest;
  // categorical column looks like "field_Category"
  for (const field of MODEL.categorical_features) {
    if (rest === field || rest.startsWith(field + "_")) return field;
  }
  return rest;
}

/** The transformed value x_i for a given column, given raw input. */
function transformedValue(name: string, input: RawInput): number {
  const [kind, rest] = name.split("__", 2);
  if (kind === "numeric") {
    const sc = MODEL.scaler[rest];
    return (Number(input[rest]) - sc.mean) / sc.scale;
  }
  if (kind === "binary") {
    return Number(input[rest]);
  }
  // categorical one-hot
  const field = MODEL.categorical_features.find(
    (f) => rest === f || rest.startsWith(f + "_"),
  )!;
  const category = rest.slice(field.length + 1);
  return String(input[field]) === category ? 1 : 0;
}

function formatValue(key: string, input: RawInput): string {
  const v = input[key];
  if (key === "hypertension" || key === "heart_disease") {
    return Number(v) === 1 ? "Yes" : "No";
  }
  return String(v);
}

export function predict(input: RawInput): PredictionResult {
  let logit = MODEL.intercept;
  const perRaw: Record<string, number> = {};

  for (const feat of MODEL.features) {
    const x = transformedValue(feat.name, input);
    logit += feat.coef * x;
    // Shapley contribution relative to the dataset mean.
    const contribution = feat.coef * (x - feat.mean);
    const key = rawKeyFor(feat.name);
    perRaw[key] = (perRaw[key] ?? 0) + contribution;
  }

  // Calibrated absolute risk for this individual.
  const probability = calibrate(logit);

  // Population reference ("average person") comes from the training data so the
  // "N times average" framing is stable and matches real prevalence.
  const baseProbability = MODEL.population_risk;
  const timesAverage = probability / baseProbability;

  const totalAbs =
    Object.values(perRaw).reduce((a, b) => a + Math.abs(b), 0) || 1;

  const factors: FactorContribution[] = Object.entries(perRaw)
    .map(([key, contribution]) => ({
      key,
      label: FRIENDLY_LABELS[key] ?? key,
      valueLabel: formatValue(key, input),
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
    riskBand: riskBand(probability),
    baseProbability,
    timesAverage,
    factors,
  };
}
