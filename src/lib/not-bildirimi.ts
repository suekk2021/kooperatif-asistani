import { telegramMesajGonder } from "@/lib/telegram";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type Veritabani = ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>;

/**
 * Notu seçilen kişilerden Telegram numarası kayıtlı olanlara bildirir. Bir kişiye gitmezse
 * (bot engellenmiş vb.) diğerlerine yine gider. Hangi kişilere gittiğini ve kimin numarası
 * olmadığını döndürür (Telegram'dan söylenen notta kullanıcıya geri bildirim için).
 */
export async function notBildirimiGonder(
  supabase: Veritabani,
  botToken: string,
  hedefIdler: string[],
  icerik: string,
  gonderenAdi: string
): Promise<{ gitti: string[]; numarasiz: string[] }> {
  const sonuc = { gitti: [] as string[], numarasiz: [] as string[] };
  if (hedefIdler.length === 0) return sonuc;

  const { data: kisiler } = await supabase.from("profiller").select("ad_soyad, telegram_chat_id").in("id", hedefIdler);
  const metin = `📝 <b>Senin için bir not var</b>\n${gonderenAdi} sana not bıraktı:\n\n${icerik}`;

  await Promise.all(
    (kisiler ?? []).map(async (k) => {
      const chatId = k.telegram_chat_id?.trim();
      if (!chatId) {
        sonuc.numarasiz.push(k.ad_soyad);
        return;
      }
      try {
        await telegramMesajGonder(botToken, chatId, metin);
        sonuc.gitti.push(k.ad_soyad);
      } catch {
        sonuc.numarasiz.push(k.ad_soyad);
      }
    })
  );
  return sonuc;
}
