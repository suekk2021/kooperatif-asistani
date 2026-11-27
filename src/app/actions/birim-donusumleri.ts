"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STOK_BIRIMLERI, hataMesaji, metin, ondalik } from "@/lib/imece";
import type { StokBirimi } from "@/types/database";
import type { FormSonucu } from "./cariler";

function yenile(kartId: string) {
  revalidatePath(`/stok/${kartId}`);
  revalidatePath("/satis/yeni");
}

export async function birimDonusumuEkle(kartId: string, formData: FormData): Promise<FormSonucu> {
  const birim = metin(formData, "birim") as StokBirimi | null;
  const katsayi = ondalik(formData, "katsayi");
  if (!birim || !STOK_BIRIMLERI.includes(birim)) return { hata: "Birim seçilmedi." };
  if (katsayi === null || katsayi <= 0) return { hata: "Ana birim karşılığı sıfırdan büyük bir sayı olmalı (ör. 0,410)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("birim_donusumleri")
    .insert({ stok_karti_id: kartId, birim, katsayi: Math.round(katsayi * 10000) / 10000 });
  if (error) return { hata: hataMesaji(error, `Bu kartta "${birim}" birimi zaten tanımlı; listeden değiştirin.`) };
  yenile(kartId);
  return { basarili: `1 ${birim} eklendi.` };
}

/** Katsayı değişirse yalnız bundan sonraki satışlar etkilenir; geçmiş satışlar ana birimle kayıtlı. */
export async function birimDonusumuGuncelle(id: string, kartId: string, formData: FormData): Promise<FormSonucu> {
  const katsayi = ondalik(formData, "katsayi");
  if (katsayi === null || katsayi <= 0) return { hata: "Ana birim karşılığı sıfırdan büyük bir sayı olmalı." };
  const aktif = formData.get("aktif") === "on";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("birim_donusumleri")
    .update({ katsayi: Math.round(katsayi * 10000) / 10000, aktif })
    .eq("id", id)
    .select("id");
  if (error) return { hata: hataMesaji(error, "") };
  if (!data || data.length === 0) return { hata: "Kaydedilemedi: bu kartı değiştirme yetkiniz yok." };
  yenile(kartId);
  return { basarili: aktif ? "Kaydedildi." : "Kaydedildi; birim kapatıldı (satışta seçilemez)." };
}
