import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "stroke_pipeline.joblib"
METRICS_PATH = BASE_DIR / "model" / "metrics.json"

app = Flask(__name__)

_bundle = joblib.load(MODEL_PATH)
PIPELINE = _bundle["pipeline"]
FEATURE_ORDER = _bundle["feature_order"]
METRICS = json.loads(METRICS_PATH.read_text())

NUMERIC_RANGES = {
    "age": (0, 120),
    "avg_glucose_level": (40, 400),
    "bmi": (10, 70),
}
VALID_CHOICES = {
    "gender": {"Male", "Female", "Other"},
    "ever_married": {"Yes", "No"},
    "work_type": {"Private", "Self-employed", "Govt_job", "children", "Never_worked"},
    "Residence_type": {"Urban", "Rural"},
    "smoking_status": {"never smoked", "formerly smoked", "smokes", "Unknown"},
}
BINARY_FIELDS = ["hypertension", "heart_disease"]

# Human-readable labels for the explanation panel.
FRIENDLY_LABELS = {
    "age": "Age",
    "avg_glucose_level": "Average glucose level",
    "bmi": "BMI",
    "hypertension": "Hypertension",
    "heart_disease": "Heart disease",
    "gender": "Gender",
    "ever_married": "Marital history",
    "work_type": "Work type",
    "Residence_type": "Residence type",
    "smoking_status": "Smoking status",
}


def parse_and_validate(payload: dict):
    errors = []
    row = {}

    for field, (lo, hi) in NUMERIC_RANGES.items():
        raw = payload.get(field)
        try:
            value = float(raw)
        except (TypeError, ValueError):
            errors.append(f"{FRIENDLY_LABELS[field]} must be a number.")
            continue
        if not (lo <= value <= hi):
            errors.append(f"{FRIENDLY_LABELS[field]} must be between {lo} and {hi}.")
        row[field] = value

    for field in BINARY_FIELDS:
        raw = payload.get(field)
        if str(raw) not in {"0", "1"}:
            errors.append(f"{FRIENDLY_LABELS[field]} must be Yes or No.")
        else:
            row[field] = int(raw)

    for field, choices in VALID_CHOICES.items():
        raw = payload.get(field)
        if raw not in choices:
            errors.append(f"{FRIENDLY_LABELS[field]} is missing or invalid.")
        else:
            row[field] = raw

    return row, errors


def risk_band(probability: float) -> str:
    if probability < 0.10:
        return "Lower"
    if probability < 0.25:
        return "Moderate"
    return "Higher"


def explain_prediction(row: dict, transformed: np.ndarray) -> list:
    """Best-effort explanation of which inputs pushed risk up the most.

    Uses the linear model's coefficients when available (logistic
    regression); otherwise falls back to flagging well-known clinical risk
    factors so the UI always has something meaningful to show.
    """
    classifier = PIPELINE.named_steps["classifier"]
    preprocessor = PIPELINE.named_steps["preprocessor"]

    if hasattr(classifier, "coef_"):
        feature_names = preprocessor.get_feature_names_out()
        contributions = transformed.flatten() * classifier.coef_.flatten()
        ranked = sorted(
            zip(feature_names, contributions), key=lambda x: x[1], reverse=True
        )
        factors = []
        for name, contribution in ranked:
            if contribution <= 0:
                continue
            remainder = name.split("__", 1)[-1]
            # Match the longest known field name that prefixes this column,
            # since one-hot columns look like "work_type_Self-employed".
            base_field = max(
                (f for f in FRIENDLY_LABELS if remainder == f or remainder.startswith(f + "_")),
                key=len,
                default=remainder,
            )
            label = FRIENDLY_LABELS.get(base_field, base_field)
            if label not in factors:
                factors.append(label)
            if len(factors) == 3:
                break
        if factors:
            return factors

    # Fallback: simple clinical heuristics.
    flags = []
    if row["age"] >= 65:
        flags.append("Age")
    if row["hypertension"] == 1:
        flags.append("Hypertension")
    if row["heart_disease"] == 1:
        flags.append("Heart disease")
    if row["avg_glucose_level"] >= 140:
        flags.append("Average glucose level")
    if row["bmi"] >= 30:
        flags.append("BMI")
    if row["smoking_status"] in {"smokes", "formerly smoked"}:
        flags.append("Smoking status")
    return flags[:3]


@app.route("/")
def home():
    report = METRICS["classification_report"]
    model_stats = {
        "model_name": METRICS["best_model"].replace("_", " ").title(),
        "roc_auc": round(METRICS["test_roc_auc"] * 100, 1),
        "recall": round(report["1"]["recall"] * 100, 1),
        "precision": round(report["1"]["precision"] * 100, 1),
        "n_samples": METRICS["n_train"] + METRICS["n_test"],
        "positive_rate": round(METRICS["positive_rate"] * 100, 1),
    }
    return render_template("index.html", stats=model_stats)


@app.route("/api/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or request.form
    row, errors = parse_and_validate(payload)
    if errors:
        return jsonify({"errors": errors}), 400

    input_df = pd.DataFrame([row])[FEATURE_ORDER]
    probability = float(PIPELINE.predict_proba(input_df)[0, 1])
    transformed = PIPELINE.named_steps["preprocessor"].transform(input_df)
    transformed = np.asarray(transformed.todense()) if hasattr(transformed, "todense") else transformed

    return jsonify(
        {
            "probability": round(probability, 4),
            "risk_band": risk_band(probability),
            "top_factors": explain_prediction(row, transformed),
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
