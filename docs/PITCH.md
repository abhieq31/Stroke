# StrokeGuard → an explainable risk-engine platform

**One-line:** We don't sell a stroke model. We sell the *factory* that turns any
clinical risk score into a calibrated, self-explaining, zero-infra product — and
ships a new disease in a day.

---

## The insight (first principles)

A disease-risk model trained on a public dataset is a **commodity** — anyone can
build it, it caps at ~0.84 AUC, and age alone gets you most of the way. Selling
*the model* is a losing game.

What's actually hard — and what regulated health companies pay for — is
everything *around* the model:

- **Explainability** they can show a regulator/clinician (not a SHAP afterthought — exact math).
- **Calibration** so the probability means something actuarially.
- **Speed**: a new condition without a 6-month ML project.
- **No infra / no data leaving the device** — privacy and cost.

We built that. The stroke model is just the first thing we ran through it.

## Proof it's a platform, not a demo

| | |
|---|---|
| Conditions live | **2** (stroke, diabetes) — added via config, not code |
| Time to add a condition | dataset → live, **one command** (`build_model.sh`) |
| Explanations | **exact** per-factor contribution (closed-form Shapley), not approximations |
| Calibration | Platt-scaled to true prevalence; risk shown as "N× average" |
| Runtime infra | **zero** — model runs natively in the browser, verified vs scikit-learn to `<1e-6` |
| Inputs per condition | 4–6, chosen by a data audit that deletes noise |

## Who buys, and the line on their P&L

| Buyer | Their pain | What we sell them |
|---|---|---|
| **Health insurers / wellness** | Find high-risk members → cheap intervention now → avoid a $50k stroke | Risk stratification + audit-ready explanations |
| **Pharmacy / telehealth** | Need a trustworthy patient front-door that converts to consults/tests | Embeddable explainable screener |
| **Pharma** | Disease awareness + patient identification | Branded, multi-condition screening tool |
| **EHR / care-management** | Explainable risk inside the clinician workflow | The inference + explanation engine (SDK) |

## Why now / why us

- Regulators (FDA SaMD, EU AI Act) are making **explainability mandatory**. Most ML
  teams bolt it on. Ours is exact and native.
- Edge inference means **no PHI leaves the device** — the cheapest way to be
  compliant is to not hold the data.
- Backed by peer-reviewed research (IEEE ICONAT 2023).

## The honest part (so we don't get caught overselling)

- Current models are trained on **public datasets** and are **not FDA-cleared**.
  They are screening signals, not diagnoses.
- The moat is **execution + the validation/data loop**, not the public model.
  Step one with any serious buyer is validating the engine on *their* data.

## The ask

Pick the wedge:

1. **Pilot** — validate the engine on a partner's de-identified data for one
   condition. 30 days, fixed fee.
2. **License** — embed the explainable risk-widget (white-label) in a
   patient-facing product. Per-seat / per-call.
3. **Acqui-hire / build** — the fastest way to own this is to own the people who
   built it.

*Contact: Abhi Patel.*
