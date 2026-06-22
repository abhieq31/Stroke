import type { Metadata } from "next";
import { PredictPanel } from "@/components/predict-panel";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CONDITION_LIST, conditionMeta } from "@/lib/ml/conditions";

export const metadata: Metadata = {
  title: "Risk Check — StrokeGuard AI",
  description:
    "Enter routine health indicators to get an explained risk estimate across conditions.",
};

export default async function PredictPage() {
  const user = await getCurrentUser();
  const conditions = CONDITION_LIST.map(conditionMeta);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
          Health risk assessment
        </h1>
        <p className="mt-3 text-slate-600">
          Pick a condition and fill in a few indicators. Same engine every time —
          a transparent model gives you a risk score <em>and</em> the exact reasons
          behind it.
        </p>
      </div>

      <PredictPanel
        conditions={conditions}
        authEnabled={isSupabaseConfigured}
        signedIn={Boolean(user)}
      />

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-slate-400">
        Educational and research use only. Not a medical device and not a diagnosis.
        Models are trained on public datasets. Always consult a qualified healthcare
        professional about your health.
      </p>
    </div>
  );
}
