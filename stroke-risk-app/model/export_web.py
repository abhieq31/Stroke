"""
Export the trained scikit-learn pipeline to a portable JSON file so the
exact same model can run natively in TypeScript (no Python service needed
at inference time).

Because the production model is Logistic Regression, inference is a linear
forward pass and per-feature explanations are *exact* (not approximations):
each feature's contribution to the log-odds is coef * (x - mean), which is
the closed-form Shapley value for a linear model with the dataset mean as
the reference.

Run:
    python model/export_web.py
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "model" / "stroke_pipeline.joblib"
DATA_PATH = BASE_DIR / "data" / "healthcare-dataset-stroke-data.csv"
OUT_PATH = BASE_DIR / "model" / "model.web.json"

bundle = joblib.load(MODEL_PATH)
pipeline = bundle["pipeline"]
pre = pipeline.named_steps["preprocessor"]
clf = pipeline.named_steps["classifier"]

assert type(clf).__name__ == "LogisticRegression", (
    "export_web.py assumes a linear model for exact explanations; "
    f"got {type(clf).__name__}"
)

# Reload + clean data exactly like training so the baseline means match.
df = pd.read_csv(DATA_PATH).drop(columns=["id"])
df["bmi"] = pd.to_numeric(df["bmi"], errors="coerce")
df["bmi"] = df["bmi"].fillna(df["bmi"].median())
X = df[bundle["feature_order"]]

transformed = pre.transform(X)
if hasattr(transformed, "toarray"):
    transformed = transformed.toarray()
feature_means = np.asarray(transformed).mean(axis=0)

out_features = list(pre.get_feature_names_out())
coef = np.asarray(clf.coef_).flatten()
intercept = float(clf.intercept_[0])

# Derive feature groups straight from the trained bundle so this script
# never goes stale when the feature set changes.
numeric_features = bundle["numeric_features"]
binary_features = bundle["binary_features"]
categorical_features = bundle["categorical_features"]

num = pre.named_transformers_["numeric"]
cat = pre.named_transformers_["categorical"]

model = {
    "model_type": "logistic_regression",
    "intercept": intercept,
    # Platt calibration applied to the raw logit: p = sigmoid(A*logit + B).
    "calibration": bundle["calibration"],
    "population_risk": bundle["population_risk"],
    "risk_bands": bundle["risk_bands"],
    "raw_feature_order": bundle["feature_order"],
    "numeric_features": numeric_features,
    "binary_features": binary_features,
    "categorical_features": categorical_features,
    "scaler": {
        f: {"mean": float(num.mean_[i]), "scale": float(num.scale_[i])}
        for i, f in enumerate(numeric_features)
    },
    "categories": {
        f: list(cat.categories_[i]) for i, f in enumerate(categorical_features)
    },
    # coef + baseline mean per transformed column, keyed by output name.
    "features": [
        {
            "name": name,
            "coef": float(coef[i]),
            "mean": float(feature_means[i]),
        }
        for i, name in enumerate(out_features)
    ],
}

OUT_PATH.write_text(json.dumps(model, indent=2))
print(f"Wrote {OUT_PATH}")

# --- self-check: reproduce sklearn predict_proba in pure python ---
def predict_proba_manual(row: dict) -> float:
    logit = intercept
    for feat in model["features"]:
        name = feat["name"]
        kind, rest = name.split("__", 1)
        if kind == "numeric":
            sc = model["scaler"][rest]
            x = (row[rest] - sc["mean"]) / sc["scale"]
        elif kind == "binary":
            x = float(row[rest])
        else:  # categorical one-hot column "field_Category"
            field = next(
                f for f in model["categorical_features"]
                if rest == f or rest.startswith(f + "_")
            )
            category = rest[len(field) + 1:]
            x = 1.0 if str(row[field]) == category else 0.0
        logit += feat["coef"] * x
    return 1.0 / (1.0 + np.exp(-logit))

sample = X.iloc[0].to_dict()
manual = predict_proba_manual(sample)
sk = float(pipeline.predict_proba(X.iloc[[0]])[0, 1])
print(f"self-check  manual={manual:.6f}  sklearn={sk:.6f}  diff={abs(manual-sk):.2e}")
assert abs(manual - sk) < 1e-6, "manual inference diverges from sklearn!"
print("OK: native inference matches sklearn within 1e-6")
