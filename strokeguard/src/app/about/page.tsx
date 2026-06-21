import type { Metadata } from "next";
import Link from "next/link";
import { BookText, ExternalLink, FlaskConical, Scale } from "lucide-react";
import metrics from "@/lib/ml/metrics.json";

export const metadata: Metadata = {
  title: "The Science — StrokeGuard AI",
  description:
    "Methodology, model performance, explainability approach, and the published research behind StrokeGuard AI.",
};

const strokeClass = metrics.classification_report["1"];
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
        The science behind StrokeGuard
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        StrokeGuard is built on a transparent, reproducible machine-learning pipeline.
        This page explains how the model works, how well it performs, and how every
        prediction is made interpretable.
      </p>

      {/* Published research */}
      <section className="mt-12">
        <SectionHeading icon={<BookText className="h-5 w-5" />}>
          Published research
        </SectionHeading>
        <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
            IEEE · ICONAT 2023
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Machine Learning Approach for Estimation and Novel Design of Stroke Disease
            Predictions using Numerical and Categorical Features
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            S. K. Satapathy, A. Patel, P. Yadav, Y. Thacker, D. Vaniya, and D. Parmar.
            <em>
              {" "}
              2023 International Conference for Advancement in Technology (ICONAT)
            </em>
            , IEEE, 2023.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            The peer-reviewed study this product is based on. It analyzes ~5,000 patient
            records and shows that elevated glucose and advancing age are among the
            strongest predictors of stroke — findings the live model reproduces.
          </p>
          <a
            href="https://doi.org/10.1109/ICONAT57137.2023.10080722"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            Read on IEEE Xplore (DOI: 10.1109/ICONAT57137.2023.10080722)
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* Methodology */}
      <section className="mt-12">
        <SectionHeading icon={<FlaskConical className="h-5 w-5" />}>
          How the model is built
        </SectionHeading>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            <strong className="text-slate-800">Data &amp; cleaning.</strong> The model is
            trained on the public{" "}
            <a
              href="https://www.kaggle.com/fedesoriano/stroke-prediction-dataset"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:underline"
            >
              Stroke Prediction Dataset
            </a>
            . Missing BMI values are imputed with the median, and the &ldquo;unknown&rdquo;
            smoking category is kept as a real signal rather than discarded.
          </p>
          <p>
            <strong className="text-slate-800">Encoding &amp; pipeline.</strong> Numeric
            features are standardized and categorical features one-hot encoded inside a
            single scikit-learn <code className="rounded bg-slate-100 px-1">Pipeline</code>
            , so the exact same transformation is applied at training and inference — no
            drift.
          </p>
          <p>
            <strong className="text-slate-800">Model selection &amp; tuning.</strong>{" "}
            Logistic Regression, Random Forest, and Histogram Gradient Boosting are
            compared with 5-fold cross-validation on ROC-AUC, with{" "}
            <em>balanced class weights</em> for the rare-event problem. On this dataset
            all three land within ~0.01 AUC of each other, so the transparent{" "}
            <strong>Logistic Regression</strong> is chosen and grid-tuned
            (C&nbsp;=&nbsp;{(metrics.best_params as { C: number }).C}).
          </p>
          <p>
            <strong className="text-slate-800">Probability calibration.</strong> Balanced
            training inflates raw scores, so the model is{" "}
            <em>Platt-calibrated</em>: predicted probabilities are mapped to true stroke
            prevalence. The result is honest numbers — an average person reads ≈
            {pct(metrics.population_risk)}, matching the real base rate — plus an
            intuitive &ldquo;N× the average person&apos;s risk&rdquo; readout.
          </p>
          <p>
            <strong className="text-slate-800">Native, verified inference.</strong> The
            trained model is exported to JSON and re-implemented in TypeScript so it runs
            directly in the app with no Python service. The port is verified to match
            scikit-learn&apos;s output to within 1e-6.
          </p>
        </div>
      </section>

      {/* Performance */}
      <section className="mt-12">
        <SectionHeading icon={<Scale className="h-5 w-5" />}>Performance</SectionHeading>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <Row label="Best model">
                <span className="capitalize">{metrics.best_model.replace("_", " ")}</span>
              </Row>
              <Row label="ROC-AUC (held-out test)">{pct(metrics.test_roc_auc)}</Row>
              <Row label="PR-AUC (held-out test)">{pct(metrics.test_pr_auc)}</Row>
              <Row label="Sensitivity / recall (screening point)">
                {pct(strokeClass.recall)}
              </Row>
              <Row label="Precision (screening point)">{pct(strokeClass.precision)}</Row>
              <Row label="Stroke prevalence in data">{pct(metrics.positive_rate)}</Row>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          ROC-AUC and PR-AUC are threshold-free. Recall/precision are reported at a
          screening operating point (chosen by Youden&apos;s J) that deliberately favors
          catching at-risk cases — so recall is high and precision is low, which is the
          right trade-off for a first-line screen.
        </p>

        <div className="mt-5 rounded-2xl bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
          <strong>Why we don&apos;t lead with &ldquo;accuracy.&rdquo;</strong> Only{" "}
          {pct(metrics.positive_rate)} of records are positive stroke cases. A model that
          always predicts &ldquo;no stroke&rdquo; would score about{" "}
          {pct(1 - (metrics.positive_rate as number))} accuracy while catching{" "}
          <em>zero</em> real cases. That is why StrokeGuard is tuned for ROC-AUC and
          recall instead — to actually identify at-risk people, not to chase a
          misleading headline number.
        </div>
      </section>

      {/* Explainability */}
      <section className="mt-12">
        <SectionHeading icon={<BookText className="h-5 w-5" />}>
          How explanations work
        </SectionHeading>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            For a linear model, each feature&apos;s push on the log-odds is exactly{" "}
            <code className="rounded bg-slate-100 px-1">
              coefficient × (your value − average value)
            </code>
            . Summed together with the baseline, these reproduce the model&apos;s output
            precisely — so the breakdown you see is the <em>actual</em> reasoning, not a
            post-hoc approximation. This is the closed-form Shapley decomposition for a
            linear model.
          </p>
          <p>
            On the result screen, green bars are factors lowering your risk and red bars
            are factors raising it, sized by how much they moved the score relative to an
            average person.
          </p>
        </div>
        <div className="mt-6">
          <Link
            href="/predict"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Try the risk check
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
        {icon}
      </span>
      {children}
    </h2>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="bg-slate-50/50 px-5 py-3 font-medium text-slate-600">{label}</td>
      <td className="px-5 py-3 text-right font-semibold text-slate-900">{children}</td>
    </tr>
  );
}
