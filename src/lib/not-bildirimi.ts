import { telegramMesajGonder } from "@/lib/telegram";
import { aliciAdi } from "@/lib/roller";
import type { KullaniciRolu } from "@/types/database";
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

  const { data: kisiler } = await supabase.from("profiller").select("ad_soyad, rol, telegram_chat_id").in("id", hedefIdler);
  const metin = `📝 <b>Senin için bir not var</b>\n${gonderenAdi} sana not bıraktı:\n\n${icerik}`;

  await Promise.all(
    ((kisiler ?? []) as { ad_soyad: string; rol: KullaniciRolu | null; telegram_chat_id: string | null }[]).map(async (k) => {
      const chatId = k.telegram_chat_id?.trim();
      if (!chatId) {
        sonuc.numarasiz.push(aliciAdi(k));
        return;
      }
      try {
        await telegramMesajGonder(botToken, chatId, metin);
        sonuc.gitti.push(aliciAdi(k));
      } catch {
        sonuc.numarasiz.push(aliciAdi(k));
      }
    })
  );
  return sonuc;
}
