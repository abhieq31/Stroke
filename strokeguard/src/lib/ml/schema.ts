// Single source of truth for the model's inputs. Drives the prediction
// form, server-side validation, and the plain-language explanations.

export type FieldType = "number" | "binary" | "select";

export type Tone = "good" | "warn" | "bad";

export interface FieldOption {
  value: string;
  label: string;
}

/** A classification band for a numeric value (e.g. BMI "Overweight"). */
export interface Band {
  /** Upper bound (exclusive). Omit on the last, catch-all band. */
  upTo?: number;
  label: string;
  tone: Tone;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  /** Plain-language help shown in the info popover. */
  help: string;
  // number fields
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  /** Default slider position when empty (keeps the slider centered sensibly). */
  sliderDefault?: number;
  /** Reference range shown under the field, e.g. "Healthy 18.5–24.9". */
  referenceLabel?: string;
  /** Live classification bands for the entered value. */
  bands?: Band[];
  /** Opt-in helper tool rendered by the field. */
  calculator?: "bmi";
  // select fields
  options?: FieldOption[];
}

/** Classify a numeric value against a field's bands. */
export function classify(field: FieldSpec, value: number): Band | null {
  if (!field.bands || Number.isNaN(value)) return null;
  for (const band of field.bands) {
    if (band.upTo === undefined || value < band.upTo) return band;
  }
  return field.bands[field.bands.length - 1] ?? null;
}

export const FIELDS: FieldSpec[] = [
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
    help: "Age is the single strongest driver of stroke risk in the data — risk rises steeply after about 55.",
  },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    help: "Biological sex as recorded in the source clinical dataset.",
    options: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" },
    ],
  },
  {
    key: "hypertension",
    label: "Hypertension",
    type: "binary",
    help: "Whether the patient has been diagnosed with high blood pressure.",
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
    help: "Your average blood-glucose reading. If unsure, leave it near 100 (a typical normal value). Elevated glucose is a known vascular risk factor.",
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
    help: "BMI = weight (kg) ÷ height (m)². Don't know it? Tap “Calculate” and just enter your height and weight.",
    bands: [
      { upTo: 18.5, label: "Underweight", tone: "warn" },
      { upTo: 25, label: "Healthy", tone: "good" },
      { upTo: 30, label: "Overweight", tone: "warn" },
      { label: "Obese", tone: "bad" },
    ],
  },
  {
    key: "ever_married",
    label: "Ever married",
    type: "select",
    help: "A proxy variable present in the dataset; correlates with age.",
    options: [
      { value: "Yes", label: "Yes" },
      { value: "No", label: "No" },
    ],
  },
  {
    key: "work_type",
    label: "Work type",
    type: "select",
    help: "Employment category recorded for the patient.",
    options: [
      { value: "Private", label: "Private sector" },
      { value: "Self-employed", label: "Self-employed" },
      { value: "Govt_job", label: "Government job" },
      { value: "children", label: "Child / student" },
      { value: "Never_worked", label: "Never worked" },
    ],
  },
  {
    key: "Residence_type",
    label: "Residence type",
    type: "select",
    help: "Whether the patient lives in an urban or rural area.",
    options: [
      { value: "Urban", label: "Urban" },
      { value: "Rural", label: "Rural" },
    ],
  },
  {
    key: "smoking_status",
    label: "Smoking status",
    type: "select",
    help: "Smoking history. 'Unknown' is a valid value the model was trained on.",
    options: [
      { value: "never smoked", label: "Never smoked" },
      { value: "formerly smoked", label: "Formerly smoked" },
      { value: "smokes", label: "Currently smokes" },
      { value: "Unknown", label: "Prefer not to say" },
    ],
  },
];

// Friendly labels keyed by raw feature name, for the explanation panel.
export const FRIENDLY_LABELS: Record<string, string> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f.label]),
);

export type RawInput = Record<string, string | number>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Normalized values ready for the model. */
  values: RawInput;
}

export function validateInput(payload: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const values: RawInput = {};

  for (const field of FIELDS) {
    const raw = payload[field.key];

    if (raw === undefined || raw === null || raw === "") {
      errors.push(`${field.label} is required.`);
      continue;
    }

    if (field.type === "number") {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        errors.push(`${field.label} must be a number.`);
      } else if (
        (field.min !== undefined && n < field.min) ||
        (field.max !== undefined && n > field.max)
      ) {
        errors.push(`${field.label} must be between ${field.min} and ${field.max}.`);
      } else {
        values[field.key] = n;
      }
    } else if (field.type === "binary") {
      const s = String(raw);
      if (s !== "0" && s !== "1") {
        errors.push(`${field.label} must be Yes or No.`);
      } else {
        values[field.key] = Number(s);
      }
    } else {
      const s = String(raw);
      const allowed = field.options!.map((o) => o.value);
      if (!allowed.includes(s)) {
        errors.push(`${field.label} is missing or invalid.`);
      } else {
        values[field.key] = s;
      }
    }
  }

  return { ok: errors.length === 0, errors, values };
}
