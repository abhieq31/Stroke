# StrokeGuard AI

A stroke-risk screening web app: a real, reproducible ML pipeline served
behind a Flask API with a clean, single-page UI.

This rebuild replaces the original `BRAIN STROKE MODEL` prototype, which had
a broken serving path (the trained model expected scaled, one-hot-encoded
features including `gender`; the deployed form sent 9 raw, unscaled fields
with no `gender` and a hardcoded Windows file path to a model that no longer
exists on disk). Here, preprocessing and the model are bundled into a single
scikit-learn `Pipeline`, so what's trained is exactly what's served.

## Project structure

```
stroke-risk-app/
├── app.py                  # Flask app: serves the UI + /api/predict
├── model/
│   ├── train.py            # Training pipeline (run to retrain)
│   ├── stroke_pipeline.joblib   # Saved preprocessing + model bundle
│   └── metrics.json         # Evaluation metrics, regenerated on training
├── data/
│   └── healthcare-dataset-stroke-data.csv
├── templates/index.html
├── static/css/style.css
├── static/js/main.js
├── requirements.txt
└── Procfile                 # For Heroku/Render-style platforms
```

## Run it locally

```bash
cd stroke-risk-app
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open the printed local URL in a browser. Note: macOS's AirPlay Receiver
sometimes squats on port 5000 — if you can't connect, run
`app.run(port=5050)` instead, or `flask run -p 5050`.

## Retrain the model

```bash
python model/train.py
```

This loads `data/healthcare-dataset-stroke-data.csv`, compares Logistic
Regression, Random Forest, and Histogram Gradient Boosting via 5-fold
cross-validation on ROC-AUC, refits the best one on the full dataset, and
overwrites `model/stroke_pipeline.joblib` and `model/metrics.json`.

## Why ROC-AUC/recall instead of accuracy

Only ~4.9% of records in this dataset are positive stroke cases. A model
that always predicts "no stroke" already scores ~95% accuracy while
catching zero real cases — which is exactly the trap the original
project's "94.53% accuracy" badge fell into. This pipeline instead:

- balances class weights during training,
- selects the model by cross-validated **ROC-AUC**,
- and reports **recall** and **precision** on the positive class so the
  tradeoff is visible instead of hidden behind a single number.

Current held-out test performance is logged to `model/metrics.json` and
surfaced live on the site itself (see the "How the model works" section).

## Deploying

Any platform that runs a Python web service works (Render, Railway,
Fly.io, PythonAnywhere, a VPS). The `Procfile` assumes `gunicorn`:

```
web: gunicorn app:app
```

Make sure `model/stroke_pipeline.joblib` and `model/metrics.json` are
committed/deployed alongside the code — the app loads them at startup and
will fail to boot without them.

## Disclaimer

This is an academic project for educational purposes. It is **not** a
medical device and must not be used as a substitute for professional
medical advice.
