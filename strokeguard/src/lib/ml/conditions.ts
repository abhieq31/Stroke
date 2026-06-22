// The condition registry. Adding a disease to the whole product = adding one
// entry here (a model JSON from the factory + a field schema). No new code in
// the engine, the API, or the UI. The model is a config, not a codebase.

import type { FieldSpec } from "./schema";
import type { Model } from "./engine";

import strokeModel from "./models/stroke.model.json";
import strokeMetrics from "./models/stroke.metrics.json";
import diabetesModel from "./models/diabetes.model.json";
import diabetesMetrics from "./models/diabetes.metrics.json";

export interface ConditionMetrics {
  name: string;
  best_model: string;
  best_params: { C: number; solver: string };
  test_roc_auc: number;
  test_pr_auc: number;
  positive_rate: number;
  population_risk: number;
  n_inputs: number;
  n_train: number;
  n_test: number;
  classification_report: Record<
    string,
    { precision: number; recall: number; "f1-score": number }
  >;
}

export interface Condition {
  id: string;
  name: string;
  short: string;
  tagline: string;
  fields: FieldSpec[];
  example: Record<string, string>;
  model: Model;
  metrics: ConditionMetrics;
}

const STROKE_FIELDS: FieldSpec[] = [
  {
    key: "age",
    label: "Age",
    type: "number",
    min: 0,
    max: 100,
    step: 1,
    unit: "years",
    placeholder: "e.g. 54",
    sliderDefault: 45,
    help: "Age is the strongest driver of stroke risk — it rises steeply after about 55.",
  },
  {
    key: "hypertension",
    label: "Hypertension",
    type: "binary",
    help: "Have you been diagnosed with high blood pressure?",
  },
  {
    key: "heart_disease",
    label: "Heart disease",
    type: "binary",
    help: "Any diagnosed heart condition.",
  },
  {
    key: "avg_glucose_level",
    label: "Average glucose level",
    type: "number",
    min: 50,
    max: 300,
    step: 1,
    unit: "mg/dL",
    placeholder: "e.g. 110",
    sliderDefault: 100,
    referenceLabel: "Normal 70–125 mg/dL",
    help: "Your average blood-glucose reading. If unsure, leave it near 100. Elevated glucose is a known vascular risk factor.",
    bands: [
      { upTo: 70, label: "Low", tone: "warn" },
      { upTo: 126, label: "Normal", tone: "good" },
      { upTo: 200, label: "Elevated", tone: "warn" },
      { label: "High", tone: "bad" },
    ],
  },
  {
    key: "bmi",
    label: "Body Mass Index (BMI)",
    type: "number",
    min: 12,
    max: 60,
    step: 0.1,
    unit: "kg/m²",
    placeholder: "e.g. 26.5",
    sliderDefault: 24,
    referenceLabel: "Healthy 18.5–24.9",
    calculator: "bmi",
    help: "BMI = weight (kg) ÷ height (m)². Don't know it? Tap “Calculate”.",
    bands: [
      { upTo: 18.5, label: "Underweight", tone: "warn" },
      { upTo: 25, label: "Healthy", tone: "good" },
      { upTo: 30, label: "Overweight", tone: "warn" },
      { label: "Obese", tone: "bad" },
    ],
  },
  {
    key: "smoking_status",
    label: "Smoking status",
    type: "select",
    help: "Smoking history. 'Unknown' is a value the model was trained on.",
    options: [
      { value: "never smoked", label: "Never smoked" },
      { value: "formerly smoked", label: "Formerly smoked" },
      { value: "smokes", label: "Currently smokes" },
      { value: "Unknown", label: "Prefer not to say" },
    ],
  },
];

const DIABETES_FIELDS: FieldSpec[] = [
  {
    key: "Glucose",
    label: "Glucose (plasma)",
    type: "number",
    min: 50,
    max: 250,
    step: 1,
    unit: "mg/dL",
    placeholder: "e.g. 110",
    sliderDefault: 110,
    referenceLabel: "Normal < 140 mg/dL",
    help: "Plasma glucose concentration. The single strongest predictor of diabetes risk.",
    bands: [
      { upTo: 100, label: "Normal", tone: "good" },
      { upTo: 126, label: "Prediabetes", tone: "warn" },
      { label: "Diabetic range", tone: "bad" },
    ],
  },
  {
    key: "BMI",
    label: "Body Mass Index (BMI)",
    type: "number",
    min: 15,
    max: 60,
    step: 0.1,
    unit: "kg/m²",
    placeholder: "e.g. 28",
    sliderDefault: 25,
    referenceLabel: "Healthy 18.5–24.9",
    calculator: "bmi",
    help: "BMI = weight (kg) ÷ height (m)². Don't know it? Tap “Calculate”.",
    bands: [
      { upTo: 18.5, label: "Underweight", tone: "warn" },
      { upTo: 25, label: "Healthy", tone: "good" },
      { upTo: 30, label: "Overweight", tone: "warn" },
      { label: "Obese", tone: "bad" },
    ],
  },
  {
    key: "Age",
    label: "Age",
    type: "number",
    min: 18,
    max: 100,
    step: 1,
    unit: "years",
    placeholder: "e.g. 40",
    sliderDefault: 35,
    help: "Type 2 diabetes risk rises with age.",
  },
  {
    key: "BloodPressure",
    label: "Blood pressure (diastolic)",
    type: "number",
    min: 40,
    max: 130,
    step: 1,
    unit: "mm Hg",
    placeholder: "e.g. 72",
    sliderDefault: 72,
    referenceLabel: "Normal < 80 mm Hg",
    help: "Diastolic blood pressure (the lower number).",
    bands: [
      { upTo: 80, label: "Normal", tone: "good" },
      { upTo: 90, label: "Elevated", tone: "warn" },
      { label: "High", tone: "bad" },
    ],
  },
];

export const CONDITIONS: Record<string, Condition> = {
  stroke: {
    id: "stroke",
    name: "Brain stroke",
    short: "Stroke",
    tagline: "Six everyday health numbers. One minute.",
    fields: STROKE_FIELDS,
    example: {
      age: "67",
      hypertension: "1",
      heart_disease: "0",
      avg_glucose_level: "171",
      bmi: "30",
      smoking_status: "formerly smoked",
    },
    model: strokeModel as unknown as Model,
    metrics: strokeMetrics as unknown as ConditionMetrics,
  },
  diabetes: {
    id: "diabetes",
    name: "Type 2 diabetes",
    short: "Diabetes",
    tagline: "Four numbers from a routine check-up.",
    fields: DIABETES_FIELDS,
    example: {
      Glucose: "155",
      BMI: "33",
      Age: "50",
      BloodPressure: "88",
    },
    model: diabetesModel as unknown as Model,
    metrics: diabetesMetrics as unknown as ConditionMetrics,
  },
};

export const CONDITION_LIST: Condition[] = Object.values(CONDITIONS);

export function getCondition(id: string | undefined | null): Condition | null {
  if (!id) return null;
  return CONDITIONS[id] ?? null;
}

/** Lightweight, client-safe view (no model weights) for UI components. */
export interface ConditionMeta {
  id: string;
  name: string;
  short: string;
  tagline: string;
  fields: FieldSpec[];
  example: Record<string, string>;
}

export function conditionMeta(c: Condition): ConditionMeta {
  return {
    id: c.id,
    name: c.name,
    short: c.short,
    tagline: c.tagline,
    fields: c.fields,
    example: c.example,
  };
}
