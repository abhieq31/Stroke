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

export type RawInput = Record<string, string | number>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Normalized values ready for the model. */
  values: RawInput;
}

/** Validate a payload against a specific condition's field set. */
export function validateInput(
  fields: FieldSpec[],
  payload: Record<string, unknown>,
): ValidationResult {
  const errors: string[] = [];
  const values: RawInput = {};

  for (const field of fields) {
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
