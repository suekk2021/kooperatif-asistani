"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji, metin } from "@/lib/imece";
import type { StokTuru } from "@/types/database";
import type { FormSonucu } from "./cariler";

const ANA_KODLAR = ["150", "151", "152", "153"];
// Ana kod -> seçilebilecek türler (veritabanındaki kontrolle aynı)
const ANA_KOD_TURLERI: Record<string, StokTuru[]> = {
  "150": ["hammadde", "ambalaj", "yardimci"],
  "151": ["yari_mamul"],
  "152": ["mamul"],
  "153": ["ticari_mal"],
};

export async function stokGrubuEkle(formData: FormData): Promise<FormSonucu> {
  const anaKod = metin(formData, "ana_kod");
  const grupKodu = metin(formData, "grup_kodu");
  const ad = metin(formData, "ad");
  const tur = metin(formData, "tur") as StokTuru | null;
  if (!anaKod || !ANA_KODLAR.includes(anaKod)) return { hata: "Ana hesap seçilmedi." };
  if (!grupKodu || !/^[0-9]{2}$/.test(grupKodu)) return { hata: "Grup kodu tam 2 rakam olmalı (örn. 10)." };
  if (!ad) return { hata: "Grup adı zorunlu." };
  if (!tur || !ANA_KOD_TURLERI[anaKod].includes(tur)) return { hata: "Tür bu ana hesapla uyuşmuyor." };

  const supabase = await createClient();
  const { error } = await supabase.from("stok_gruplari").insert({ ana_kod: anaKod, grup_kodu: grupKodu, ad, tur });
  if (error) return { hata: hataMesaji(error, `${anaKod}${grupKodu} kodlu bir grup zaten var.`) };

  revalidatePath("/stok", "layout");
  return { basarili: `${anaKod}${grupKodu} · ${ad} grubu eklendi.` };
}

// Kod ve ana hesap değişmez; tür, grupta kart varsa değişmez (veritabanı da engeller).
export async function stokGrubuGuncelle(id: string, formData: FormData): Promise<FormSonucu> {
  const ad = metin(formData, "ad");
  const aktif = formData.get("aktif") === "on";
  if (!ad) return { hata: "Grup adı zorunlu." };

  const supabase = await createClient();
  const { error } = await supabase.from("stok_gruplari").update({ ad, aktif }).eq("id", id);
  if (error) return { hata: hataMesaji(error, "Bu ada sahip bir grup zaten var.") };

  revalidatePath("/stok", "layout");
  return { basarili: "Kaydedildi." };
}
