import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Teknik destek ve yönetim işlemlerini (kişi ekleme/silme, rol-görev-Telegram değişikliği, şifre sıfırlama,
 * Ayarlar değişikliği) İşlem Geçmişi'ne yazar. Hassas değerler (şifre, API anahtarı, Telegram numarası) ASLA yazılmaz;
 * yalnızca "değiştirildi" gibi bir özet yazılır. Service role auth.uid() bilmediği için işlemi yapan kişi açıkça verilir.
 * Kayıt yazılamazsa asıl işlem bozulmaz.
 */
export async function izKaydet(k: { tablo: string; kayit: string | null; kullanici: string; yeni: { fiil: string; hedef: string; ozet?: string[] } }) {
  try {
    const { error } = await createAdminClient()
      .from("degisiklik_kaydi")
      .insert({ tablo: k.tablo, kayit: k.kayit, islem: "UPDATE", eski: null, yeni: { teknik: true, ...k.yeni }, kullanici: k.kullanici });
    if (error) console.error("İşlem geçmişine yazılamadı:", error.message);
  } catch (e) {
    console.error("İşlem geçmişine yazılamadı:", e);
  }
}
