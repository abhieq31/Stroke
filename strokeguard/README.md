# StrokeGuard AI

Six questions. One minute. A calibrated stroke-risk number — and the exact math
behind it. No black box, no Python at runtime.

<img src="../docs/result.png" alt="Calibrated risk with an exact, per-factor explanation" width="420"/>

## What it is

- **Next.js 16** (App Router, React 19, TypeScript, Turbopack), **Tailwind v4**
- **Supabase** auth + Postgres (row-level security) for saved history — optional
- A scikit-learn model **exported to JSON and run natively in TypeScript**.
  Verified identical to scikit-learn to `< 1e-6`. Nothing leaves the page.

## Why it's built this way

**Honest before clever.** The dataset caps near 0.84 ROC-AUC; chasing higher is
overfitting. Stroke is ~5% of rows, so accuracy is meaningless — we optimize
ROC-AUC/recall and **calibrate** probabilities to true prevalence, then show
risk as *"N× the average person."*

**No black box.** The model is linear, so each factor's contribution is exactly
`coef × (value − mean)` — the closed-form Shapley value. The breakdown on screen
is the real reasoning, not a guess.

**Six inputs, not ten.** We measured each input's contribution to ROC-AUC and
deleted the four that *lowered* it (gender scored 0.46 standalone — worse than
chance). The leaner model is more accurate and the form fits one screen.

## Run

```bash
npm install
npm run dev
```

Works immediately — predictor needs no config.

### Optional: accounts + history

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in the SQL editor.
3. Copy `.env.example` → `.env.local`, add your URL + anon key.
4. Restart. Auth UI hides itself entirely when these are absent.

## Structure

```
src/
├── app/                page · predict · about · history · login · auth/callback
│   ├── api/predict/    prediction + persistence endpoint
│   └── actions.ts      Server Actions (sign out, delete)
├── components/         field-controls (sliders, BMI calc, toggles) · form · gauge · explanation
├── lib/ml/             model.json · schema · inference + exact explanation
├── lib/supabase/       client · server · proxy
└── proxy.ts            session refresh (Next 16 renamed middleware → proxy)
```

## Model

The model is built in [`../stroke-risk-app`](../stroke-risk-app). One command
retrains, calibrates, exports, self-checks vs scikit-learn, and syncs the JSON
back into `src/lib/ml/`:

```bash
../stroke-risk-app/build_model.sh
```

## Deploy

Vercel. Monorepo, so set **Root Directory → `strokeguard`**. Add
`NEXT_PUBLIC_SUPABASE_*` for auth/history, or don't — the model ships inside the
app, so there's no separate service to host.

---

**Not a medical device.** Research/education only. Having a stroke? Call
emergency services, not a website.
