import { NextResponse } from "next/server";
import { predict } from "@/lib/ml/predict";
import { validateInput } from "@/lib/ml/schema";
import { savePrediction } from "@/lib/predictions";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["Invalid request body."] }, { status: 400 });
  }

  const { ok, errors, values } = validateInput(payload);
  if (!ok) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const result = predict(values);

  // Best-effort persistence: saves only if the user is signed in and
  // Supabase is configured; never blocks the prediction response.
  let savedId: string | null = null;
  try {
    savedId = await savePrediction(values, result);
  } catch (e) {
    console.error("save failed:", e);
  }

  return NextResponse.json({ ...result, savedId });
}
