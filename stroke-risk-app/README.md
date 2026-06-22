# Stroke model — training & export pipeline

The Python side of [StrokeGuard](../strokeguard). It trains the model, calibrates
it, and exports it to a portable JSON the web app runs natively in TypeScript.
There is **no web server here** — inference happens inside the Next.js app, so
this folder is purely the model factory.

## One command

```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

./build_model.sh                   # train → calibrate → export → verify → sync
```

`build_model.sh` runs the whole pipeline and copies the result straight into
`../strokeguard/src/lib/ml/`. No manual copying.

## What it does

| Step | File | Output |
| --- | --- | --- |
| Train, tune, calibrate | `model/train.py` | `stroke_pipeline.joblib`, `metrics.json` |
| Export portable model | `model/export_web.py` | `model.web.json` (+ self-check vs sklearn, `< 1e-6`) |
| Sync into the app | `build_model.sh` | copies `model.json` + `metrics.json` to the web app |

## Design decisions

- **Six inputs, chosen by data, not opinion.** A feature audit measured how much
  each input moves cross-validated ROC-AUC. Gender, marital status, work type and
  residence type *lowered* accuracy (noise), so they were dropped. Final inputs:
  age, hypertension, heart disease, average glucose, BMI, smoking status.
- **Logistic Regression**, tuned and **Platt-calibrated** so probabilities match
  true stroke prevalence. Linear ⇒ explanations are exact (closed-form Shapley).
- **Imbalance-aware:** ~5% of records are positive, so the model uses balanced
  class weights and is selected on ROC-AUC / recall, never raw accuracy.

## Data

[Kaggle Stroke Prediction Dataset](https://www.kaggle.com/fedesoriano/stroke-prediction-dataset)
(`data/healthcare-dataset-stroke-data.csv`). BMI gaps imputed with the median;
"Unknown" smoking kept as a real category.
