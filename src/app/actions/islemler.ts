"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { IslemTuru } from "@/types/database";

export async function islemEkle(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Giriş yapmanız gerekiyor.");
  }

  const tur = String(formData.get("tur") ?? "") as IslemTuru;
  const tutar = Number(formData.get("tutar"));
  const tarih = String(formData.get("tarih") ?? "");
  const aciklama = String(formData.get("aciklama") ?? "").trim();
  const kategori = String(formData.get("kategori") ?? "").trim() || null;
  const fisGorselUrl = String(formData.get("fis_gorsel_url") ?? "").trim() || null;

  if ((tur !== "gelir" && tur !== "gider") || !Number.isFinite(tutar) || tutar <= 0 || !tarih || !aciklama) {
    throw new Error("Tutar, tarih, açıklama ve tür zorunlu; tutar sıfırdan büyük olmalı.");
  }

  const { error } = await supabase.from("islemler").insert({
    tur,
    tutar,
    tarih,
    aciklama,
    kategori,
    fis_gorsel_url: fisGorselUrl,
    ocr_ham_metin: null,
    olusturan: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/islemler");
  revalidatePath("/dashboard");
}

export type IslemGuncelleGirdi = {
  tur: IslemTuru;
  tutar: number;
  tarih: string;
  aciklama: string;
  kategori: string | null;
};

export async function islemGuncelle(id: string, girdi: IslemGuncelleGirdi): Promise<void> {
  if (
    (girdi.tur !== "gelir" && girdi.tur !== "gider") ||
    !Number.isFinite(girdi.tutar) ||
    girdi.tutar <= 0 ||
    !girdi.tarih ||
    !girdi.aciklama.trim()
  ) {
    throw new Error("Tutar, tarih, açıklama ve tür zorunlu; tutar sıfırdan büyük olmalı.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("islemler")
    .update({
      tur: girdi.tur,
      tutar: girdi.tutar,
      tarih: girdi.tarih,
      aciklama: girdi.aciklama.trim(),
      kategori: girdi.kategori?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/islemler");
  revalidatePath("/dashboard");
}

export async function islemSil(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("islemler").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/islemler");
  revalidatePath("/dashboard");
}
