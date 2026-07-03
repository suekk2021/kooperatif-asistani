"use server";

import { createClient } from "@/lib/supabase/server";
import { fisVerisiCikar } from "@/lib/fis";
import type { IslemTuru } from "@/types/database";

export type FisOkumaSonucu = {
  hata?: string;
  tutar?: number;
  tarih?: string;
  aciklama?: string;
  kategori?: string;
  tur?: IslemTuru;
  fisGorselUrl?: string;
};

export async function fisiOku(formData: FormData): Promise<FisOkumaSonucu> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hata: "Giriş yapmanız gerekiyor." };
  }

  const dosya = formData.get("fis") as File | null;
  if (!dosya || dosya.size === 0) {
    return { hata: "Bir fiş fotoğrafı seçmelisin." };
  }

  const { data: ayarlar } = await supabase
    .from("ayarlar")
    .select("ocr_saglayici, gemini_api_key, openai_api_key")
    .eq("id", true)
    .single();

  const saglayici = ayarlar?.ocr_saglayici ?? "gemini";
  const apiKey = saglayici === "gemini" ? ayarlar?.gemini_api_key : ayarlar?.openai_api_key;

  if (!apiKey) {
    return {
      hata: `${saglayici === "gemini" ? "Gemini" : "OpenAI"} API anahtarı ayarlanmamış. Ayarlar sayfasından ekleyin.`,
    };
  }

  const arrayBuffer = await dosya.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = dosya.type || "image/jpeg";

  // Fis gorselini Supabase Storage'a yukle - onaylandiktan sonra islemler tablosuna baglanacak.
  const dosyaYolu = `${user.id}/${Date.now()}-${dosya.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error: yuklemeHatasi } = await supabase.storage
    .from("fisler")
    .upload(dosyaYolu, arrayBuffer, { contentType: mimeType });

  let fisGorselUrl: string | undefined;
  if (!yuklemeHatasi) {
    const { data: imzaliUrl } = await supabase.storage
      .from("fisler")
      .createSignedUrl(dosyaYolu, 60 * 60 * 24 * 365);
    fisGorselUrl = imzaliUrl?.signedUrl;
  }

  try {
    const cikarim = await fisVerisiCikar({ saglayici, apiKey }, base64, mimeType);
    return { ...cikarim, fisGorselUrl };
  } catch (e) {
    return { hata: e instanceof Error ? e.message : "Fiş okunamadı, elle giriş yapabilirsin." };
  }
}
