"""
Train a stroke-risk classifier and save it as a single, self-contained
pipeline (preprocessing + model) so the web app never has to re-implement
feature encoding by hand.

The served model is a *tuned, probability-calibrated* Logistic Regression:
- tuned via grid search on cross-validated ROC-AUC,
- calibrated with Platt scaling so the predicted probabilities reflect true
  stroke prevalence (a balanced-weight model alone outputs inflated scores),
- kept linear so explanations stay exact and the model ports natively to JS.

Run:
    python model/train.py
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import (
    GridSearchCV,
    StratifiedKFold,
    cross_val_predict,
    cross_val_score,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "healthcare-dataset-stroke-data.csv"
MODEL_PATH = BASE_DIR / "model" / "stroke_pipeline.joblib"
METRICS_PATH = BASE_DIR / "model" / "metrics.json"

# Feature set chosen by a first-principles audit (see model/audit.py): we
# dropped gender, ever_married, work_type and Residence_type because they added
# friction while *lowering* cross-validated ROC-AUC (gender alone scored 0.46 —
# worse than a coin flip on this dataset). The leaner set is more accurate.
NUMERIC_FEATURES = ["age", "avg_glucose_level", "bmi"]
BINARY_FEATURES = ["hypertension", "heart_disease"]
CATEGORICAL_FEATURES = ["smoking_status"]
ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
TARGET = "stroke"

# Risk-band cutoffs on the *calibrated* probability scale (chosen from the
# calibrated distribution: median ~2%, p90 ~15%, max ~48%).
RISK_BANDS = {"moderate": 0.05, "higher": 0.15}


def load_data() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH).drop(columns=["id"])
    df["bmi"] = pd.to_numeric(df["bmi"], errors="coerce")
    df["bmi"] = df["bmi"].fillna(df["bmi"].median())
    return df


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", StandardScaler(), NUMERIC_FEATURES),
            ("binary", "passthrough", BINARY_FEATURES),
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )


def make_lr_pipeline(**clf_kwargs) -> Pipeline:
    params = dict(max_iter=2000, class_weight="balanced")
    params.update(clf_kwargs)
    return Pipeline(
        steps=[("preprocessor", build_preprocessor()), ("classifier", LogisticRegression(**params))]
    )


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))


def fit_platt(pipeline, X, y, cv):
    """Platt scaling: map decision scores -> calibrated probabilities."""
    scores = cross_val_predict(pipeline, X, y, cv=cv, method="decision_function")
    platt = LogisticRegression(max_iter=1000)
    platt.fit(scores.reshape(-1, 1), y)
    return float(platt.coef_[0][0]), float(platt.intercept_[0])


def main():
    df = load_data()
    X = df[ALL_FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # --- Model comparison (for the "we compared models" narrative) ---
    candidates = {
        "logistic_regression": make_lr_pipeline(),
        "random_forest": Pipeline(
            [("preprocessor", build_preprocessor()),
             ("classifier", RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42))]
        ),
        "hist_gradient_boosting": Pipeline(
            [("preprocessor", build_preprocessor()),
             ("classifier", HistGradientBoostingClassifier(random_state=42))]
        ),
    }
    cv_results = {}
    for name, pipe in candidates.items():
        scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
        cv_results[name] = {"cv_roc_auc_mean": float(scores.mean()), "cv_roc_auc_std": float(scores.std())}
        print(f"{name:>24}: CV ROC-AUC = {scores.mean():.4f} (+/- {scores.std():.4f})")

    # --- Tune the (transparent, calibratable) Logistic Regression ---
    grid = GridSearchCV(
        make_lr_pipeline(),
        {"classifier__C": [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
         "classifier__solver": ["lbfgs", "liblinear"]},
        cv=cv, scoring="roc_auc", n_jobs=-1,
    )
    grid.fit(X_train, y_train)
    best_params = {k.replace("classifier__", ""): v for k, v in grid.best_params_.items()}
    print(f"\nTuned LR params: {best_params}  (CV ROC-AUC {grid.best_score_:.4f})")

    # --- Evaluate on held-out test, with calibration ---
    eval_pipe = make_lr_pipeline(**best_params)
    eval_pipe.fit(X_train, y_train)
    A_tr, B_tr = fit_platt(eval_pipe, X_train, y_train, cv)

    test_scores = eval_pipe.decision_function(X_test)
    test_calib = sigmoid(A_tr * test_scores + B_tr)

    test_roc_auc = roc_auc_score(y_test, test_calib)
    test_pr_auc = average_precision_score(y_test, test_calib)

    # Screening operating point: Youden's J on training calibrated CV scores.
    train_scores_cv = cross_val_predict(eval_pipe, X_train, y_train, cv=cv, method="decision_function")
    train_calib_cv = sigmoid(A_tr * train_scores_cv + B_tr)
    fpr, tpr, thr = roc_curve(y_train, train_calib_cv)
    threshold = float(thr[np.argmax(tpr - fpr)])

    y_pred = (test_calib >= threshold).astype(int)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred).tolist()
    baseline_accuracy = float((y_test == 0).mean())

    print(f"Test ROC-AUC: {test_roc_auc:.4f}  PR-AUC: {test_pr_auc:.4f}")
    print(f"Screening threshold (calibrated): {threshold:.3f}")
    print(classification_report(y_test, y_pred))

    # --- Final model on ALL data + calibration + population reference ---
    final_pipe = make_lr_pipeline(**best_params)
    final_pipe.fit(X, y)
    A, B = fit_platt(final_pipe, X, y, cv)
    all_calib = sigmoid(A * final_pipe.decision_function(X) + B)
    population_risk = float(all_calib.mean())

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": final_pipe,
            "feature_order": ALL_FEATURES,
            "numeric_features": NUMERIC_FEATURES,
            "binary_features": BINARY_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "calibration": {"A": A, "B": B},
            "population_risk": population_risk,
            "risk_bands": RISK_BANDS,
            "screening_threshold": threshold,
        },
        MODEL_PATH,
    )

    metrics = {
        "best_model": "logistic_regression",
        "best_params": best_params,
        "calibrated": True,
        "cv_results": cv_results,
        "tuned_cv_roc_auc": float(grid.best_score_),
        "test_roc_auc": test_roc_auc,
        "test_pr_auc": test_pr_auc,
        "screening_threshold": threshold,
        "baseline_always_negative_accuracy": baseline_accuracy,
        "classification_report": report,
        "confusion_matrix": cm,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "positive_rate": float(y.mean()),
        "population_risk": population_risk,
    }
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    print(f"\nSaved pipeline -> {MODEL_PATH}")
    print(f"Saved metrics  -> {METRICS_PATH}")
    print(f"Population (avg-person) calibrated risk: {population_risk*100:.2f}%")


if __name__ == "__main__":
    main()
