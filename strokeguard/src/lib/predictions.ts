import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PredictionResult } from "@/lib/ml/predict";
import type { RawInput } from "@/lib/ml/schema";

export interface SavedPrediction {
  id: string;
  created_at: string;
  inputs: RawInput;
  probability: number;
  percent: number;
  risk_band: string;
  factors: PredictionResult["factors"];
}

/** Persist a prediction for the signed-in user. Silently no-ops if Supabase
 *  isn't configured or no user is signed in. Returns the new row id or null. */
export async function savePrediction(
  inputs: RawInput,
  result: PredictionResult,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("predictions")
    .insert({
      user_id: user.id,
      inputs,
      probability: result.probability,
      percent: result.percent,
      risk_band: result.riskBand,
      factors: result.factors,
    })
    .select("id")
    .single();

  if (error) {
    console.error("savePrediction error:", error.message);
    return null;
  }
  return data.id;
}

/** List the signed-in user's saved predictions, newest first. */
export async function listPredictions(): Promise<SavedPrediction[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("listPredictions error:", error.message);
    return [];
  }
  return (data ?? []) as SavedPrediction[];
}

export async function deletePrediction(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = await createClient();
  await supabase.from("predictions").delete().eq("id", id);
}
