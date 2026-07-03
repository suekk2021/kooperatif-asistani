"use server";

import { createClient } from "@/lib/supabase/server";

export type HesapSonuc = { hata?: string; basarili?: string };

export async function ePostaGuncelle(formData: FormData): Promise<HesapSonuc> {
  const yeniEposta = String(formData.get("eposta") ?? "").trim();

  if (!yeniEposta || !yeniEposta.includes("@")) {
    return { hata: "Geçerli bir e-posta adresi gir." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: yeniEposta });

  if (error) {
    return { hata: error.message };
  }

  return {
    basarili:
      "Onay bağlantısı hem eski hem yeni e-posta adresine gönderildi. Değişikliğin tamamlanması için ikisindeki linke de tıklaman gerekiyor.",
  };
}

export async function sifreGuncelle(formData: FormData): Promise<HesapSonuc> {
  const yeniSifre = String(formData.get("yeni_sifre") ?? "");
  const yeniSifreTekrar = String(formData.get("yeni_sifre_tekrar") ?? "");

  if (yeniSifre.length < 6) {
    return { hata: "Şifre en az 6 karakter olmalı." };
  }

  if (yeniSifre !== yeniSifreTekrar) {
    return { hata: "Şifreler eşleşmiyor." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: yeniSifre });

  if (error) {
    return { hata: error.message };
  }

  return { basarili: "Şifren güncellendi." };
}
