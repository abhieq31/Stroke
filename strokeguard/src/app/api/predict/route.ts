import { NextResponse } from "next/server";
import { predict } from "@/lib/ml/engine";
import { validateInput } from "@/lib/ml/schema";
import { getCondition } from "@/lib/ml/conditions";
import { savePrediction } from "@/lib/predictions";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["Invalid request body."] }, { status: 400 });
  }

  const condition = getCondition(payload.condition as string);
  if (!condition) {
    return NextResponse.json({ errors: ["Unknown condition."] }, { status: 400 });
  }

  const { ok, errors, values } = validateInput(condition.fields, payload);
  if (!ok) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const result = predict(condition.model, condition.fields, values);

  let savedId: string | null = null;
  try {
    savedId = await savePrediction(values, result);
  } catch (e) {
    console.error("save failed:", e);
  }

  return NextResponse.json({ ...result, savedId });
}
