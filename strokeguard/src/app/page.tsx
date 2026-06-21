import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  ShieldCheck,
  Eye,
  Database,
  LineChart,
  Lock,
} from "lucide-react";
import metrics from "@/lib/ml/metrics.json";

const rocAuc = Math.round((metrics.test_roc_auc as number) * 1000) / 10;
const recall =
  Math.round((metrics.classification_report["1"].recall as number) * 1000) / 10;
const nSamples = (metrics.n_train as number) + (metrics.n_test as number);

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero-glow text-white">
        <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-brand-100">
            <BrainCircuit className="h-3.5 w-3.5" />
            Explainable ML · IEEE-published methodology
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            Understand your{" "}
            <span className="bg-gradient-to-r from-brand-400 to-brand-100 bg-clip-text text-transparent">
              stroke risk
            </span>{" "}
            — and exactly why.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            StrokeGuard AI estimates stroke risk from routine health indicators using a
            transparent machine-learning model — then shows you the precise contribution
            of every factor. No black box.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/predict"
              className="group flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-sm font-semibold text-[#042f2e] shadow-lg shadow-brand-500/25 transition hover:bg-brand-400"
            >
              Check my risk
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/about"
              className="rounded-xl border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              How it works
            </Link>
          </div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <Stat value={`${rocAuc}%`} label="ROC-AUC" />
            <Stat value={`${recall}%`} label="Stroke recall" />
            <Stat value={nSamples.toLocaleString()} label="Patient records" />
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Eye className="h-6 w-6" />}
            title="Explainable by design"
            body="Every prediction comes with an exact, per-factor breakdown — built on the model's own coefficients, not a guess. You see what raised and lowered the score."
          />
          <Feature
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Honest about imbalance"
            body="Stroke cases are rare (~5% of data), so raw accuracy is misleading. We optimize for ROC-AUC and recall with balanced class weights to actually catch at-risk cases."
          />
          <Feature
            icon={<Lock className="h-6 w-6" />}
            title="Your data, your history"
            body="Optional accounts (Supabase auth) let you securely save assessments over time with row-level security — or use it instantly with no sign-up."
          />
        </div>
      </section>

      {/* How it works strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              A transparent pipeline, end to end
            </h2>
            <p className="mt-3 text-slate-500">
              From raw clinical data to an explained prediction in your browser.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <Step
              n={1}
              icon={<Database className="h-5 w-5" />}
              title="Clean & encode"
              body="Median-impute BMI, keep 'unknown' smoking as a real category, scale and one-hot encode in one pipeline."
            />
            <Step
              n={2}
              icon={<LineChart className="h-5 w-5" />}
              title="Train & select"
              body="Compare Logistic Regression, Random Forest and Gradient Boosting by cross-validated ROC-AUC."
            />
            <Step
              n={3}
              icon={<BrainCircuit className="h-5 w-5" />}
              title="Export to the edge"
              body="The winning model is exported to JSON and runs natively in the app — verified identical to scikit-learn."
            />
            <Step
              n={4}
              icon={<Eye className="h-5 w-5" />}
              title="Explain"
              body="Each factor's exact contribution is decomposed and shown as a diverging chart anyone can read."
            />
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Try it now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold text-brand-400 sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          {icon}
        </span>
        <span className="text-sm font-bold text-slate-300">0{n}</span>
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
