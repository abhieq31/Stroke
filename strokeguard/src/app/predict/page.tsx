import type { Metadata } from "next";
import { PredictionForm } from "@/components/prediction-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Risk Check — StrokeGuard AI",
  description:
    "Enter routine health indicators to get an explained stroke-risk estimate.",
};

export default async function PredictPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-4xl font-medium tracking-tight text-slate-900 sm:text-5xl">
          Stroke risk assessment
        </h1>
        <p className="mt-3 text-slate-600">
          Fill in the health indicators below. Everything runs on a transparent model —
          you&apos;ll get a risk score <em>and</em> a full breakdown of what drove it.
        </p>
      </div>

      <PredictionForm authEnabled={isSupabaseConfigured} signedIn={Boolean(user)} />

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-slate-400">
        This tool is for educational and research purposes only. It is not a medical
        device and does not provide a diagnosis. Always consult a qualified healthcare
        professional about your health.
      </p>
    </div>
  );
}
