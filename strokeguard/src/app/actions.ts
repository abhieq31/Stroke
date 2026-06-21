"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { deletePrediction } from "@/lib/predictions";

export async function signOut() {
  if (!isSupabaseConfigured) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deletePredictionAction(formData: FormData) {
  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await deletePrediction(id);
    revalidatePath("/history");
  }
}
