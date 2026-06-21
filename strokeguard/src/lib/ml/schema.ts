// Single source of truth for the model's inputs. Drives the prediction
// form, server-side validation, and the plain-language explanations.

export type FieldType = "number" | "binary" | "select";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  /** Plain-language help shown under the input. */
  help: string;
  // number fields
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
  // select fields
  options?: FieldOption[];
}

export const FIELDS: FieldSpec[] = [
  {
    key: "age",
    label: "Age",
    type: "number",
    min: 0,
    max: 120,
    step: 1,
    unit: "years",
    placeholder: "e.g. 54",
    help: "Age is the single strongest driver of stroke risk in the data.",
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
    min: 40,
    max: 400,
    step: 0.1,
    unit: "mg/dL",
    placeholder: "e.g. 110",
    help: "Average blood glucose. Elevated glucose is a known vascular risk factor.",
  },
  {
    key: "bmi",
    label: "Body Mass Index (BMI)",
    type: "number",
    min: 10,
    max: 70,
    step: 0.1,
    unit: "kg/m²",
    placeholder: "e.g. 26.5",
    help: "Body mass index = weight (kg) / height (m)².",
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
