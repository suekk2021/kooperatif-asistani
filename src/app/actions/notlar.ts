"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function notGuncelle(id: string, icerik: string): Promise<void> {
  if (!icerik.trim()) {
    throw new Error("Not boş olamaz.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notlar").update({ icerik: icerik.trim() }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notlar");
}

export async function notSil(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notlar").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notlar");
}
