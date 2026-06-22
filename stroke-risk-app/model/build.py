"""
Config-driven model factory. For each condition in conditions.py it:
  trains + tunes Logistic Regression, Platt-calibrates it, evaluates,
  saves the pipeline, and exports a portable JSON the web app runs natively
  in TypeScript — self-checked against scikit-learn to < 1e-6.

Run:  python model/build.py            # all conditions
      python model/build.py stroke     # one condition
"""
import json
import sys
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

from conditions import CONDITIONS

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
MODEL = BASE / "model"


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-z))


def load(cfg):
    df = pd.read_csv(DATA / cfg["csv"])
    if cfg["drop_cols"]:
        df = df.drop(columns=cfg["drop_cols"])
    for c in cfg["zero_as_missing"]:
        df[c] = df[c].replace(0, np.nan)
    for c in cfg["median_impute"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
        df[c] = df[c].fillna(df[c].median())
    return df


def preprocessor(cfg):
    transformers = [("numeric", StandardScaler(), cfg["numeric"])]
    if cfg["binary"]:
        transformers.append(("binary", "passthrough", cfg["binary"]))
    if cfg["categorical"]:
        transformers.append(
            ("categorical", OneHotEncoder(handle_unknown="ignore"), cfg["categorical"])
        )
    return ColumnTransformer(transformers)


def lr(cfg, **kw):
    params = dict(max_iter=2000, class_weight="balanced")
    params.update(kw)
    return Pipeline([("preprocessor", preprocessor(cfg)), ("classifier", LogisticRegression(**params))])


def platt(pipe, X, y, cv):
    scores = cross_val_predict(pipe, X, y, cv=cv, method="decision_function")
    p = LogisticRegression(max_iter=1000).fit(scores.reshape(-1, 1), y)
    return float(p.coef_[0][0]), float(p.intercept_[0])


def build(cid):
    cfg = CONDITIONS[cid]
    feats = cfg["numeric"] + cfg["binary"] + cfg["categorical"]
    df = load(cfg)
    X, y = df[feats], df[cfg["target"]]

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    cv_results = {}
    for name, clf in {
        "logistic_regression": lr(cfg),
        "random_forest": Pipeline([("preprocessor", preprocessor(cfg)),
                                   ("classifier", RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=42))]),
        "hist_gradient_boosting": Pipeline([("preprocessor", preprocessor(cfg)),
                                            ("classifier", HistGradientBoostingClassifier(random_state=42))]),
    }.items():
        s = cross_val_score(clf, Xtr, ytr, cv=cv, scoring="roc_auc", n_jobs=-1)
        cv_results[name] = {"cv_roc_auc_mean": float(s.mean()), "cv_roc_auc_std": float(s.std())}

    grid = GridSearchCV(lr(cfg), {"classifier__C": [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
                                  "classifier__solver": ["lbfgs", "liblinear"]},
                        cv=cv, scoring="roc_auc", n_jobs=-1).fit(Xtr, ytr)
    best = {k.replace("classifier__", ""): v for k, v in grid.best_params_.items()}

    eval_pipe = lr(cfg, **best).fit(Xtr, ytr)
    A_tr, B_tr = platt(eval_pipe, Xtr, ytr, cv)
    calib_te = sigmoid(A_tr * eval_pipe.decision_function(Xte) + B_tr)
    roc, pr = roc_auc_score(yte, calib_te), average_precision_score(yte, calib_te)

    cv_scores = cross_val_predict(eval_pipe, Xtr, ytr, cv=cv, method="decision_function")
    calib_cv = sigmoid(A_tr * cv_scores + B_tr)
    fpr, tpr, thr = roc_curve(ytr, calib_cv)
    threshold = float(thr[np.argmax(tpr - fpr)])
    ypred = (calib_te >= threshold).astype(int)
    report = classification_report(yte, ypred, output_dict=True)

    # final model on ALL data
    final = lr(cfg, **best).fit(X, y)
    A, B = platt(final, X, y, cv)
    population_risk = float(sigmoid(A * final.decision_function(X) + B).mean())

    joblib.dump({"pipeline": final, "feature_order": feats, "numeric_features": cfg["numeric"],
                 "binary_features": cfg["binary"], "categorical_features": cfg["categorical"],
                 "calibration": {"A": A, "B": B}, "population_risk": population_risk,
                 "risk_bands": cfg["risk_bands"], "screening_threshold": threshold},
                MODEL / f"{cid}_pipeline.joblib")

    metrics = {"condition": cid, "name": cfg["name"], "best_model": "logistic_regression",
               "best_params": best, "calibrated": True, "cv_results": cv_results,
               "tuned_cv_roc_auc": float(grid.best_score_), "test_roc_auc": roc, "test_pr_auc": pr,
               "screening_threshold": threshold, "classification_report": report,
               "confusion_matrix": confusion_matrix(yte, ypred).tolist(),
               "n_train": int(len(Xtr)), "n_test": int(len(Xte)),
               "positive_rate": float(y.mean()), "population_risk": population_risk,
               "n_inputs": len(feats)}
    (MODEL / f"{cid}.metrics.json").write_text(json.dumps(metrics, indent=2))

    export_web(cid, final, feats, cfg, df, A, B, population_risk)
    print(f"  {cid:10} ROC-AUC {roc:.4f}  inputs {len(feats)}  avg-risk {population_risk*100:.1f}%  ({cfg['name']})")


def export_web(cid, pipeline, feats, cfg, df, A, B, population_risk):
    pre = pipeline.named_steps["preprocessor"]
    clf = pipeline.named_steps["classifier"]
    Xt = pre.transform(df[feats])
    if hasattr(Xt, "toarray"):
        Xt = Xt.toarray()
    means = np.asarray(Xt).mean(axis=0)
    out_features = list(pre.get_feature_names_out())
    coef = np.asarray(clf.coef_).flatten()
    num = pre.named_transformers_["numeric"]
    cat = pre.named_transformers_["categorical"] if cfg["categorical"] else None

    model = {
        "model_type": "logistic_regression",
        "intercept": float(clf.intercept_[0]),
        "calibration": {"A": A, "B": B},
        "population_risk": population_risk,
        "risk_bands": cfg["risk_bands"],
        "raw_feature_order": feats,
        "numeric_features": cfg["numeric"],
        "binary_features": cfg["binary"],
        "categorical_features": cfg["categorical"],
        "scaler": {f: {"mean": float(num.mean_[i]), "scale": float(num.scale_[i])}
                   for i, f in enumerate(cfg["numeric"])},
        "categories": {f: list(cat.categories_[i]) for i, f in enumerate(cfg["categorical"])} if cat else {},
        "features": [{"name": n, "coef": float(coef[i]), "mean": float(means[i])}
                     for i, n in enumerate(out_features)],
    }
    (MODEL / f"{cid}.model.web.json").write_text(json.dumps(model, indent=2))

    # self-check vs sklearn
    row = df[feats].iloc[0].to_dict()
    logit = model["intercept"]
    for feat in model["features"]:
        kind, rest = feat["name"].split("__", 1)
        if kind == "numeric":
            sc = model["scaler"][rest]
            x = (row[rest] - sc["mean"]) / sc["scale"]
        elif kind == "binary":
            x = float(row[rest])
        else:
            field = next(f for f in cfg["categorical"] if rest == f or rest.startswith(f + "_"))
            x = 1.0 if str(row[field]) == rest[len(field) + 1:] else 0.0
        logit += feat["coef"] * x
    manual, sk = sigmoid(logit), float(pipeline.predict_proba(df[feats].iloc[[0]])[0, 1])
    assert abs(manual - sk) < 1e-6, f"{cid}: native inference diverges ({manual} vs {sk})"


if __name__ == "__main__":
    ids = sys.argv[1:] or list(CONDITIONS)
    print("Building conditions:")
    for cid in ids:
        build(cid)
    print("OK — all native ports match scikit-learn within 1e-6")
