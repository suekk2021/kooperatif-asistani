"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function girisYap(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const sifre = String(formData.get("sifre") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });

  if (error) {
    redirect(`/giris?hata=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function cikisYap() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
