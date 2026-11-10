"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function hatirlaticiEkle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Giriş yapmanız gerekiyor.");
  }

  const baslik = String(formData.get("baslik") ?? "").trim();
  const hatirlatma_tarihi = String(formData.get("hatirlatma_tarihi") ?? "");
  const hedef_kullanici_id = String(formData.get("hedef_kullanici_id") ?? "").trim() || null;

  if (!baslik || !hatirlatma_tarihi) {
    throw new Error("Başlık ve tarih zorunlu.");
  }

  const { error } = await supabase.from("hatirlaticilar").insert({
    baslik,
    hatirlatma_tarihi,
    tamamlandi: false,
    olusturan: user.id,
    hedef_kullanici_id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/hatirlaticilar");
  revalidatePath("/panel");
}

export async function hatirlaticiTamamlandiDegistir(id: string, tamamlandi: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("hatirlaticilar").update({ tamamlandi }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/hatirlaticilar");
  revalidatePath("/panel");
}

export async function hatirlaticiGuncelle(
  id: string,
  baslik: string,
  hatirlatma_tarihi: string,
  hedef_kullanici_id: string | null
): Promise<void> {
  if (!baslik.trim() || !hatirlatma_tarihi) {
    throw new Error("Başlık ve tarih zorunlu.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hatirlaticilar")
    .update({ baslik: baslik.trim(), hatirlatma_tarihi, hedef_kullanici_id: hedef_kullanici_id || null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/hatirlaticilar");
  revalidatePath("/panel");
}

export async function hatirlaticiSil(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("hatirlaticilar").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/hatirlaticilar");
  revalidatePath("/panel");
}
