import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, chatIdListesiCikar } from "@/lib/telegram";
import { bugunIstanbul } from "@/lib/tarih";

// Vercel Cron bu adresi gunluk cagirir (bkz. vercel.json). Gunu gelmis ve
// henuz bildirilmemis hatirlaticilar icin Telegram mesaji gonderir.
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

  const aliciListesi = chatIdListesiCikar(ayarlar?.telegram_chat_id);

  if (!ayarlar?.telegram_bot_token || aliciListesi.length === 0) {
    return NextResponse.json({ mesaj: "Telegram ayarlanmamış, gönderilecek bir şey yok." });
  }

  const bugun = bugunIstanbul();
  const { data: hatirlaticilar } = await supabase
    .from("hatirlaticilar")
    .select("id, baslik, hatirlatma_tarihi")
    .eq("tamamlandi", false)
    .eq("telegram_gonderildi", false)
    .lte("hatirlatma_tarihi", bugun);

  if (!hatirlaticilar || hatirlaticilar.length === 0) {
    return NextResponse.json({ mesaj: "Bugün gönderilecek hatırlatıcı yok." });
  }

  for (const h of hatirlaticilar) {
    const metin = `🔔 <b>Hatırlatıcı</b>\n${h.baslik}\nTarih: ${h.hatirlatma_tarihi}`;
    for (const chatId of aliciListesi) {
      await telegramMesajGonder(ayarlar.telegram_bot_token, chatId, metin);
    }
    await supabase.from("hatirlaticilar").update({ telegram_gonderildi: true }).eq("id", h.id);
  }

  return NextResponse.json({ gonderilen: hatirlaticilar.length, alici_sayisi: aliciListesi.length });
}
