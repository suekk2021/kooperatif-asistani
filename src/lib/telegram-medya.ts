import { randomUUID } from "node:crypto";
import { telegramDosyaBayt, type MedyaTuru } from "@/lib/telegram";
import type { createAdminClient } from "@/lib/supabase/admin";

/** Telegram botlarının indirebildiği en büyük dosya (getFile sınırı). */
export const MEDYA_LIMIT_BAYT = 20 * 1024 * 1024;
export const MEDYA_KOVASI = "not-medya";

export type TelegramMedyaMesaji = {
  caption?: string;
  photo?: Array<{ file_id: string; file_size?: number }>;
  video?: { file_id: string; file_size?: number; file_name?: string };
  video_note?: { file_id: string; file_size?: number };
  animation?: { file_id: string; file_size?: number; file_name?: string };
  document?: { file_id: string; file_size?: number; file_name?: string };
};

export type MedyaBilgisi = {
  tur: MedyaTuru;
  dosyaId: string;
  boyut: number | null;
  ad: string | null;
  aciklama: string;
};

/** Gelen mesajdaki fotoğraf/video/dosyayı tek tipte toplar; medya yoksa null. Fotoğrafta en büyük boyut seçilir. */
export function medyaBilgisiCikar(m: TelegramMedyaMesaji): MedyaBilgisi | null {
  const aciklama = m.caption?.trim() ?? "";
  if (m.photo && m.photo.length > 0) {
    const p = m.photo[m.photo.length - 1];
    return { tur: "foto", dosyaId: p.file_id, boyut: p.file_size ?? null, ad: null, aciklama };
  }
  if (m.video) return { tur: "video", dosyaId: m.video.file_id, boyut: m.video.file_size ?? null, ad: m.video.file_name ?? null, aciklama };
  if (m.video_note) return { tur: "video_notu", dosyaId: m.video_note.file_id, boyut: m.video_note.file_size ?? null, ad: null, aciklama };
  if (m.animation) return { tur: "animasyon", dosyaId: m.animation.file_id, boyut: m.animation.file_size ?? null, ad: m.animation.file_name ?? null, aciklama };
  if (m.document) return { tur: "belge", dosyaId: m.document.file_id, boyut: m.document.file_size ?? null, ad: m.document.file_name ?? null, aciklama };
  return null;
}

export const MEDYA_ETIKETI: Record<MedyaTuru, string> = {
  foto: "Fotoğraf",
  video: "Video",
  video_notu: "Video mesajı",
  animasyon: "Animasyon",
  belge: "Dosya",
};

export const megabayt = (bayt: number) => `${(bayt / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

export function medyaBuyukMu(m: MedyaBilgisi): boolean {
  return m.boyut !== null && m.boyut > MEDYA_LIMIT_BAYT;
}

/** Dosyayı Telegram'dan indirip özel depolama alanına kaydeder; kaydedilen yolu döndürür. */
export async function medyayiSakla(
  supabase: ReturnType<typeof createAdminClient>,
  botToken: string,
  m: MedyaBilgisi
): Promise<string> {
  const { veri, uzanti, mimeType } = await telegramDosyaBayt(botToken, m.dosyaId);
  const guvenliUzanti = uzanti.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const yol = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${guvenliUzanti}`;
  const { error } = await supabase.storage.from(MEDYA_KOVASI).upload(yol, veri, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Depolamaya kaydedilemedi: ${error.message}`);
  return yol;
}
