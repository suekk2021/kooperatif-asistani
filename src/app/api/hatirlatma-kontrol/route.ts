import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, chatIdListesiCikar } from "@/lib/telegram";
import { bugunIstanbul } from "@/lib/tarih";
import { hatirlaticiAlicilari } from "@/lib/hatirlatici-alici";

// Bu adres, gunu gelmis ve henuz tamamlanmamis hatirlaticilar icin Telegram mesaji gonderir.
// Vercel Cron (Hobby planda gunde 1 kez, bkz. vercel.json) ve/veya harici bir cron servisi
// (ör. cron-job.org, 2 saatte bir) bu adresi cagirabilir. Kasitli olarak "tek seferlik" degil:
// Baskan hatirlaticiyi uygulamadan "tamamlandi" isaretleyene kadar her cagrida tekrar gonderilir -
// yogunluktan unutulan bir hatirlaticinin sessizce kaybolmamasi icin.
export async function GET(request: NextRequest) {
  const yetki = request.headers.get("authorization");
  if (yetki !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: ayarlar } = await supabase
    .from("ayarlar")
    .select("telegram_bot_token, telegram_chat_id")
    .eq("id", true)
    .single();

  const genelListe = chatIdListesiCikar(ayarlar?.telegram_chat_id);

  if (!ayarlar?.telegram_bot_token) {
    return NextResponse.json({ mesaj: "Telegram ayarlanmamış, gönderilecek bir şey yok." });
  }

  const bugun = bugunIstanbul();
  const { data: hatirlaticilar } = await supabase
    .from("hatirlaticilar")
    .select("id, baslik, hatirlatma_tarihi, hedef_kullanici_id, olusturan, kaynak_chat_id")
    .eq("tamamlandi", false)
    .lte("hatirlatma_tarihi", bugun);

  if (!hatirlaticilar || hatirlaticilar.length === 0) {
    return NextResponse.json({ mesaj: "Gönderilecek hatırlatıcı yok." });
  }

  const { data: profiller } = await supabase
    .from("profiller")
    .select("id, telegram_chat_id")
    .not("telegram_chat_id", "is", null);
  const profilChatIdleri = new Map(
    (profiller ?? []).filter((p) => p.telegram_chat_id?.trim()).map((p) => [p.id, p.telegram_chat_id!.trim()])
  );

  let mesajSayisi = 0;
  for (const h of hatirlaticilar) {
    const alicilar = hatirlaticiAlicilari(h, profilChatIdleri, genelListe);
    if (alicilar.length === 0) continue;
    const metin = `🔔 <b>Hatırlatıcı</b>\n${h.baslik}\nTarih: ${h.hatirlatma_tarihi}\n\nTamamlandığında uygulamadan işaretlemeyi unutmayın, aksi halde hatırlatmaya devam edilir.`;
    for (const chatId of alicilar) {
      try {
        await telegramMesajGonder(ayarlar.telegram_bot_token, chatId, metin);
        mesajSayisi++;
      } catch {
        // Bir kişiye gitmezse (bot engellenmiş vb.) diğer hatırlatıcılar yine gitsin.
      }
    }
    await supabase.from("hatirlaticilar").update({ telegram_gonderildi: true }).eq("id", h.id);
  }

  return NextResponse.json({ hatirlatici: hatirlaticilar.length, mesaj: mesajSayisi });
}
