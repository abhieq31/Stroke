import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2, Clock, FileText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listPredictions } from "@/lib/predictions";
import { deletePredictionAction } from "@/app/actions";

export const metadata: Metadata = {
  title: "History — StrokeGuard AI",
};

const BAND_CHIP: Record<string, string> = {
  Lower: "bg-emerald-50 text-emerald-700",
  Moderate: "bg-amber-50 text-amber-700",
  Higher: "bg-rose-50 text-rose-700",
};

export default async function HistoryPage() {
  if (!isSupabaseConfigured) {
    return (
      <Notice
        title="History is unavailable"
        body="This deployment doesn't have Supabase configured, so saved history is disabled."
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const predictions = await listPredictions();

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Your assessment history
          </h1>
          <p className="mt-2 text-slate-600">Signed in as {user.email}</p>
        </div>
        <Link
          href="/predict"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New check
        </Link>
      </div>

      {predictions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No saved assessments yet.</p>
          <Link
            href="/predict"
            className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Run your first check
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {predictions.map((p) => {
            const topFactor = p.factors?.find((f) => f.direction === "increases");
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-slate-50">
                    <span className="text-lg font-extrabold text-slate-900">
                      {p.percent}%
                    </span>
                  </div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        BAND_CHIP[p.risk_band] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.risk_band} risk
                    </span>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(p.created_at).toLocaleString()}
                    </div>
                    {topFactor && (
                      <p className="mt-1 text-sm text-slate-500">
                        Top factor:{" "}
                        <span className="font-medium text-slate-700">
                          {topFactor.label}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <form action={deletePredictionAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Delete assessment"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-slate-600">{body}</p>
      <Link
        href="/predict"
        className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Go to the risk check
      </Link>
    </div>
  );
}
