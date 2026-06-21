# StrokeGuard AI

A production-grade, **explainable** stroke-risk screening app.

- **Next.js 16** (App Router, React 19, TypeScript, Turbopack)
- **Tailwind CSS v4** UI
- **Supabase** auth + Postgres (with row-level security) for saved history — _optional_
- **scikit-learn** model trained in Python, **exported to JSON and run natively in TypeScript** so predictions happen in-app with no Python service at runtime

Based on the peer-reviewed paper: S. K. Satapathy, A. Patel, P. Yadav, Y. Thacker,
D. Vaniya, D. Parmar, _"Machine Learning Approach for Estimation and Novel Design of
Stroke Disease Predictions using Numerical and Categorical Features,"_ 2023
International Conference for Advancement in Technology (ICONAT), IEEE, 2023.
DOI: [10.1109/ICONAT57137.2023.10080722](https://doi.org/10.1109/ICONAT57137.2023.10080722).

---

## Why this is "explainable"

The production model is **Logistic Regression**, so each feature's contribution to the
log-odds is exactly `coef × (value − mean)` — the closed-form Shapley decomposition for
a linear model. The result screen shows this exact breakdown (green = lowers risk,
red = raises risk). It is the model's actual reasoning, not a post-hoc approximation.
The TypeScript port is verified to match scikit-learn's output to within `1e-6`.

## Quick start

```bash
cd strokeguard
npm install
npm run dev
```

Open the printed URL. **No configuration needed** — the predictor works immediately.

### Enable accounts + history (optional)

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   in the Supabase SQL editor (creates the `predictions` table + RLS policies).
3. Copy `.env.example` to `.env.local` and fill in your project URL + anon key
   (Supabase dashboard → Settings → API).
4. Restart `npm run dev`. Sign-in, sign-up, and saved history light up automatically.

When the env vars are absent, all auth/history UI gracefully hides itself.

## Project structure

```
strokeguard/
├── src/
│   ├── app/
│   │   ├── page.tsx            # Landing
│   │   ├── predict/            # Risk checker
│   │   ├── about/              # Methodology, metrics, IEEE paper
│   │   ├── history/            # Saved assessments (Supabase)
│   │   ├── login/              # Auth
│   │   ├── auth/callback/      # OAuth / email confirmation
│   │   ├── api/predict/        # Prediction + persistence endpoint
│   │   └── actions.ts          # Server Actions (sign out, delete)
│   ├── components/             # Navbar, form, gauge, explanation, footer
│   ├── lib/
│   │   ├── ml/                 # model.json, schema, inference + explanation
│   │   └── supabase/           # client / server / proxy helpers
│   └── proxy.ts                # Session refresh (Next.js 16 renamed middleware → proxy)
└── supabase/migrations/        # SQL schema + RLS
```

## Retraining / re-exporting the model

The model lives in the sibling `../stroke-risk-app` project (Python). To retrain and
refresh the JSON the web app uses:

```bash
cd ../stroke-risk-app
source .venv/bin/activate
python model/train.py          # retrain + pick best model
python model/export_web.py     # export model.web.json (+ self-check vs sklearn)
cp model/model.web.json   ../strokeguard/src/lib/ml/model.json
cp model/metrics.json     ../strokeguard/src/lib/ml/metrics.json
```

## Deploy

Deploys cleanly to **Vercel**. Add the two `NEXT_PUBLIC_SUPABASE_*` environment
variables in the Vercel project settings if you want auth/history; otherwise it just
works. The model runs in the app itself, so there is no separate ML service to host.

## Disclaimer

Educational and research use only. Not a medical device; not a substitute for
professional medical advice, diagnosis, or treatment.
