import { telegramMesajGonder, telegramMedyaGonder, type MedyaTuru } from "@/lib/telegram";
import { aliciAdi } from "@/lib/roller";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { KullaniciRolu } from "@/types/database";

type Veritabani = ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;

const kacis = (m: string) => m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Notu seçilen kişilerden Telegram numarası kayıtlı olanlara bildirir. Bir kişiye gitmezse
 * (bot engellenmiş vb.) diğerlerine yine gider. Hangi kişilere gittiğini ve kimin numarası
 * olmadığını döndürür (Telegram'dan söylenen notta kullanıcıya geri bildirim için).
 * `medya` verilirse fotoğraf/video/dosya da aynı kişilere iletilir (Telegram dosya numarasıyla).
 */
export async function notBildirimiGonder(
  supabase: Veritabani,
  botToken: string,
  hedefIdler: string[],
  icerik: string,
  gonderenAdi: string,
  medya?: { tur: MedyaTuru; dosyaId: string }
): Promise<{ gitti: string[]; numarasiz: string[] }> {
  const sonuc = { gitti: [] as string[], numarasiz: [] as string[] };
  if (hedefIdler.length === 0) return sonuc;

  const { data: kisiler } = await supabase.from("profiller").select("ad_soyad, rol, telegram_chat_id").in("id", hedefIdler);
  const metin = `📝 <b>Senin için bir not var</b>\n${kacis(gonderenAdi)} sana not bıraktı:\n\n${kacis(icerik)}`;

  await Promise.all(
    ((kisiler ?? []) as { ad_soyad: string; rol: KullaniciRolu | null; telegram_chat_id: string | null }[]).map(async (k) => {
      const chatId = k.telegram_chat_id?.trim();
      if (!chatId) {
        sonuc.numarasiz.push(aliciAdi(k));
        return;
      }
      try {
        if (medya) {
          await telegramMedyaGonder(botToken, chatId, medya.tur, medya.dosyaId, metin);
          // Video mesajı açıklama taşıyamaz; metni ayrıca gönder.
          if (medya.tur === "video_notu") await telegramMesajGonder(botToken, chatId, metin);
        } else {
          await telegramMesajGonder(botToken, chatId, metin);
        }
        sonuc.gitti.push(aliciAdi(k));
      } catch {
        sonuc.numarasiz.push(aliciAdi(k));
      }
    })
  );
  return sonuc;
}
