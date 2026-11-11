"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { izKaydet } from "@/lib/iz";
import { anahtarGecerliMi } from "@/lib/ai";
import { yoneticiMi } from "@/lib/rol";
import { teknikYetkiliMi } from "@/lib/roller";
import type { KullaniciRolu, OcrSaglayici } from "@/types/database";

export type AyarlarSonuc = { hata?: string; basarili?: string };

// Client'a asla ham anahtar donmez - sadece hangi saglayicinin secili oldugu
// ve anahtarin girilip girilmedigi (has-key) bilgisi doner.
export async function ayarDurumuGetir() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Anahtar sütunları tarayıcıya kapalı (migration 20261110230000); sadece sunucu servis
  // anahtarıyla okur, dışarıya yalnızca "girilmiş mi" bilgisi döner.
  const { data } = await createAdminClient()
    .from("ayarlar")
    .select(
      "ocr_saglayici, gemini_api_key, openai_api_key, telegram_bot_token, telegram_chat_id, muhasebeci_email, kurum_adi, logo_url, asistan_promptu"
    )
    .eq("id", true)
    .single();
  if (!user) {
    return {
      ocrSaglayici: "gemini" as OcrSaglayici,
      geminiAnahtarVar: false,
      openaiAnahtarVar: false,
      telegramAyarliMi: false,
      telegramChatIdler: "",
      muhasebeciEmail: "",
      kurumAdi: "Suluova Üreten Eller Kadın Kooperatifi",
      logoUrl: null,
      asistanPromptu: "",
    };
  }

  return {
    ocrSaglayici: (data?.ocr_saglayici ?? "gemini") as OcrSaglayici,
    geminiAnahtarVar: Boolean(data?.gemini_api_key),
    openaiAnahtarVar: Boolean(data?.openai_api_key),
    telegramAyarliMi: Boolean(data?.telegram_bot_token && data?.telegram_chat_id),
    telegramChatIdler: data?.telegram_chat_id ?? "",
    muhasebeciEmail: data?.muhasebeci_email ?? "",
    kurumAdi: data?.kurum_adi ?? "Suluova Üreten Eller Kadın Kooperatifi",
    logoUrl: data?.logo_url ?? null,
    asistanPromptu: data?.asistan_promptu ?? "",
  };
}

export async function ayarKaydet(formData: FormData): Promise<AyarlarSonuc> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hata: "Giriş yapmanız gerekiyor." };
  }

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!yoneticiMi((profil?.rol as KullaniciRolu) ?? null)) {
    return { hata: "Bu ayarları sadece Başkan veya Operasyon yöneticisi değiştirebilir." };
  }

  // Fiş okuma, API anahtarları, Telegram bildirimi ve asistan ayarlarını yalnızca teknik destek değiştirir
  // (kullanıcı kararı, 11 Kas 2026); Başkan ve Operasyon yöneticisi kurum kimliği ile mali müşavir e-postasını değiştirir.
  const destek = teknikYetkiliMi(profil?.rol as KullaniciRolu | undefined);
  const ocrSaglayici = String(formData.get("ocr_saglayici") ?? "gemini") as OcrSaglayici;
  const geminiKey = String(formData.get("gemini_api_key") ?? "").trim();
  const openaiKey = String(formData.get("openai_api_key") ?? "").trim();
  const telegramChatIdler = String(formData.get("telegram_chat_id") ?? "").trim();
  const muhasebeciEmail = String(formData.get("muhasebeci_email") ?? "").trim();
  const kurumAdi = String(formData.get("kurum_adi") ?? "").trim();
  const asistanPromptu = String(formData.get("asistan_promptu") ?? "").trim();
  const geminiSil = formData.get("gemini_api_key_sil") === "1";
  const openaiSil = formData.get("openai_api_key_sil") === "1";

  // Yanlislikla baska bir sifre/deger yapistirilmasini onlemek icin, kaydetmeden once
  // anahtari gercek bir API istegiyle test ediyoruz - "kayitli" gorunup calismamasi riskini
  // (yesil isaret yanilticiydi) ortadan kaldirir.
  if (destek && geminiKey) {
    const sonuc = await anahtarGecerliMi("gemini", geminiKey);
    if (!sonuc.gecerli) {
      return { hata: `Gemini anahtarı geçersiz görünüyor, kaydedilmedi: ${sonuc.mesaj}` };
    }
  }
  if (destek && openaiKey) {
    const sonuc = await anahtarGecerliMi("openai", openaiKey);
    if (!sonuc.gecerli) {
      return { hata: `OpenAI anahtarı geçersiz görünüyor, kaydedilmedi: ${sonuc.mesaj}` };
    }
  }

  const guncelleme: Record<string, unknown> = {};
  if (destek) {
    guncelleme.ocr_saglayici = ocrSaglayici;
    // Bu alanlar tam gorunur/duzenlenebilir oldugu icin (sifre gibi maskelenmiyor),
    // bos birakilirsa gercekten temizlenmesi istenmis demektir.
    guncelleme.telegram_chat_id = telegramChatIdler || null;
    guncelleme.asistan_promptu = asistanPromptu || null;
  }
  // Diger alanlar (anahtarlar) icin: bos birakilan alan mevcut degeri SILMEZ,
  // sadece ilgili "sil" kutusu isaretliyse temizlenir.
  if (destek && geminiSil) {
    guncelleme.gemini_api_key = null;
  } else if (destek && geminiKey) {
    guncelleme.gemini_api_key = geminiKey;
  }
  if (destek && openaiSil) {
    guncelleme.openai_api_key = null;
  } else if (destek && openaiKey) {
    guncelleme.openai_api_key = openaiKey;
  }
  if (muhasebeciEmail) guncelleme.muhasebeci_email = muhasebeciEmail;
  if (kurumAdi) guncelleme.kurum_adi = kurumAdi;

  const dosya = formData.get("logo") as File | null;
  if (dosya && dosya.size > 0) {
    const uzanti = dosya.name.split(".").pop() ?? "png";
    const yol = `logo-${Date.now()}.${uzanti}`;
    const { error: yuklemeHatasi } = await supabase.storage
      .from("kurum")
      .upload(yol, await dosya.arrayBuffer(), { contentType: dosya.type || "image/png", upsert: true });

    if (yuklemeHatasi) {
      return { hata: `Logo yüklenemedi: ${yuklemeHatasi.message}` };
    }

    const { data: publicUrl } = supabase.storage.from("kurum").getPublicUrl(yol);
    guncelleme.logo_url = publicUrl.publicUrl;
  }

  const { data: onceki } = await createAdminClient()
    .from("ayarlar")
    .select("ocr_saglayici, telegram_chat_id, asistan_promptu, kurum_adi, muhasebeci_email")
    .eq("id", true)
    .single();

  const { error } = await supabase.from("ayarlar").update(guncelleme).eq("id", true);

  if (error) {
    return { hata: error.message };
  }

  // İşlem Geçmişi için özet: anahtar, e-posta ve numara değerleri yazılmaz, yalnızca "değiştirildi".
  const ozet: string[] = [];
  if (destek) {
    if (onceki?.ocr_saglayici !== ocrSaglayici) ozet.push(`fiş okuma sağlayıcısı: ${onceki?.ocr_saglayici ?? "—"} → ${ocrSaglayici}`);
    if (geminiSil) ozet.push("Gemini anahtarı silindi");
    else if (geminiKey) ozet.push("Gemini anahtarı değiştirildi");
    if (openaiSil) ozet.push("OpenAI anahtarı silindi");
    else if (openaiKey) ozet.push("OpenAI anahtarı değiştirildi");
    if ((onceki?.telegram_chat_id ?? "") !== telegramChatIdler) ozet.push("Telegram bildirim listesi değiştirildi");
    if ((onceki?.asistan_promptu ?? "") !== asistanPromptu) ozet.push("asistan kişiliği değiştirildi");
  }
  if (kurumAdi && kurumAdi !== onceki?.kurum_adi) ozet.push(`kooperatif adı: ${onceki?.kurum_adi ?? "—"} → ${kurumAdi}`);
  if (muhasebeciEmail && muhasebeciEmail !== onceki?.muhasebeci_email) ozet.push("mali müşavir e-postası değiştirildi");
  if (dosya && dosya.size > 0) ozet.push("logo değiştirildi");
  if (ozet.length) await izKaydet({ tablo: "ayarlar", kayit: null, kullanici: user.id, yeni: { fiil: "değiştirdi", hedef: "Ayarlar", ozet } });

  revalidatePath("/ayarlar");
  revalidatePath("/", "layout");
  return { basarili: "Ayarlar kaydedildi." };
}
