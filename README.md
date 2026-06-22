<div align="center">

# StrokeGuard&nbsp;AI

**A stroke-risk model that tells you the number — and shows its work.**
Six questions. One minute. No black box. No server. No nonsense.

<img src="docs/hero.png" alt="StrokeGuard AI" width="820"/>

<img alt="ROC-AUC" src="https://img.shields.io/badge/ROC--AUC-0.842-0d9488"/>
<img alt="inputs" src="https://img.shields.io/badge/inputs-6%20(down%20from%2010)-0d9488"/>
<img alt="runtime" src="https://img.shields.io/badge/python%20at%20runtime-0-0d9488"/>
<img alt="parity" src="https://img.shields.io/badge/vs%20scikit--learn-%3C1e--6-0d9488"/>
<img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs"/>
<img alt="Supabase" src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase"/>

</div>

---

## First principles

A stroke screen has exactly one job: separate higher-risk people from lower-risk
people, and be honest about how sure it is. Everything else is decoration.

Two facts decide the design:

1. **This dataset caps out around 0.84 ROC-AUC.** Tuned logistic regression,
   random forest, gradient boosting — all land within 0.01 of each other. Anyone
   advertising "99% accurate stroke AI" on these 5,110 rows is overfitting or
   lying. We didn't chase the number. We made the number *honest*.
2. **Stroke is rare (~5% of rows).** So "accuracy" is a trap — predict "no
   stroke" every time and you're 95% accurate and 100% useless. We optimize for
   ROC-AUC and recall, and we *calibrate* the probabilities.

Everything below follows from those two facts.

## The engineering algorithm (applied, in order)

> Question requirements → delete → simplify → accelerate → automate.
> The most common mistake is optimizing something that should not exist.

### 1 · Question every requirement
We asked: does each of the 10 inputs actually earn its place? Measured, not
guessed — CV ROC-AUC as we strip inputs away:

| Inputs | ROC-AUC |
| --- | --- |
| All 10 | 0.8375 |
| − gender, married, work, residence | 0.8407 |
| **Final 6** | **0.842** |
| Age *alone* | 0.834 |

Standalone, **`gender` scored 0.46 — worse than a coin flip.** Marital status and
work type are just age in a trench coat.

### 2 · Delete
- Cut those **4 inputs**. The model got *more* accurate and you answer **40%
  fewer questions**.
- Cut the **entire Flask server**. The model runs in the browser now, so a
  Python service was a part that didn't need to exist. The best part is no part.

### 3 · Simplify
Six inputs, one screen, no scroll. Sliders that show the normal range and label
your value live. A built-in BMI calculator so nobody has to do arithmetic.

### 4 · Accelerate
The model is exported to JSON and runs natively in TypeScript — **zero Python at
runtime, nothing leaves the page.** Verified identical to scikit-learn to
**`< 1e-6`**.

### 5 · Automate
One command — `./stroke-risk-app/build_model.sh` — trains, calibrates, exports,
self-checks against scikit-learn, and syncs into the app. No manual copying.

## No black box

The model is linear, so each factor's contribution to your risk is *exactly*
`coef × (your value − average)` — the closed-form Shapley value, not a bolted-on
guess. Green lowered your risk, red raised it. That's the actual math, on screen.

<div align="center">
<img src="docs/form.png" alt="Six inputs, sliders, live ranges, BMI calculator" width="49%"/>
&nbsp;
<img src="docs/result.png" alt="Calibrated risk, N-times-average, exact factor breakdown" width="42%"/>
</div>

## The numbers (held-out test set)

| Metric | Value |
| --- | --- |
| ROC-AUC | **0.842** |
| Recall on stroke cases (screening point) | ~84% |
| Inputs | 6 |
| Probabilities | Platt-calibrated to true prevalence (~5%) |
| Native-inference parity vs scikit-learn | < 1e-6 |
| Python processes at runtime | 0 |

Risk is shown the way a human reads it: **"3.8× the average person,"** not a
decontextualized percentage.

## Run it

```bash
cd strokeguard && npm install && npm run dev
```

Works immediately. Accounts + saved history are optional (drop in Supabase keys).
Retrain the model end-to-end with one command:

```bash
./stroke-risk-app/build_model.sh
```

## Repo

| Folder | What |
| --- | --- |
| **[`strokeguard/`](./strokeguard)** | The app — Next.js 16 + React 19 + Supabase |
| **[`stroke-risk-app/`](./stroke-risk-app)** | The model factory — train, calibrate, export (Python) |
| `BRAIN STROKE MODEL/`, `index.html` | Original prototype, kept for history |

**Deploy:** the app is in `strokeguard/`, so set Vercel **Root Directory →
`strokeguard`**. Nothing else to host — the model ships inside the app.

## Built on published research

> S. K. Satapathy, **A. Patel**, P. Yadav, Y. Thacker, D. Vaniya, D. Parmar,
> *"Machine Learning Approach for Estimation and Novel Design of Stroke Disease
> Predictions using Numerical and Categorical Features,"* ICONAT 2023, IEEE.
> DOI: [10.1109/ICONAT57137.2023.10080722](https://doi.org/10.1109/ICONAT57137.2023.10080722)

---

<div align="center">

**This is not a medical device.** It's a research demo. If you think you're
having a stroke, call emergency services — not a website.

Built by **Abhi Patel**

</div>
