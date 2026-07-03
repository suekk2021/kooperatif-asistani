import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, telegramDosyaIndir, chatIdListesiCikar } from "@/lib/telegram";
import { jsonUret, sesiMetneCevir, type YapayZekaAyarlari } from "@/lib/ai";
import { fisVerisiCikar } from "@/lib/fis";
import { bugunIstanbul, ayBasiIstanbul } from "@/lib/tarih";

const KURUM_ADI = "Suluova Üreten Eller Kadın Kooperatifi";
const KARSILAMA = `Merhaba! Ben ${KURUM_ADI}'nin sanal asistanıyım. Size nasıl yardımcı olabilirim?\n\nBana şunları yapabilirsiniz:\n• "özet" yazıp bu ayın durumunu sorabilirsiniz\n• Bir hatırlatıcıyı yazılı ya da sesli olarak söyleyebilirsiniz ("15 Temmuz'da kira ödemesi hatırlat" gibi)\n• Serbest bir not bırakabilirsiniz\n• Bir fiş/fatura fotoğrafı gönderip otomatik kaydettirebilirsiniz`;

function formatTL(tutar: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
}

const ASISTAN_SEMASI = {
  type: "object",
  properties: {
    niyet: {
      type: "string",
      enum: ["ozet", "hatirlatici", "not", "sohbet"],
      description:
        "ozet: kullanıcı mali durumu soruyor. hatirlatici: belirli bir tarihte yapılacak/hatırlanacak bir şey söylüyor. not: tarihsiz, serbest bir not/bilgi bırakıyor. sohbet: bunların hiçbiri değil, genel bir soru/selamlaşma.",
    },
    hatirlatici_baslik: { type: "string", description: "niyet=hatirlatici ise, hatırlatıcının kısa başlığı" },
    hatirlatici_tarihi: {
      type: "string",
      description: "niyet=hatirlatici ise YYYY-MM-DD formatında tarih (göreceli tarihleri bugüne göre hesapla)",
    },
    not_icerik: { type: "string", description: "niyet=not ise, notun içeriği" },
    cevap: {
      type: "string",
      description:
        "Kullanıcıya verilecek doğal, sıcak, kısa cevap. Asla sayısal mali veri (tutar, bakiye vb.) UYDURMA - onları sen değil sistem ekler.",
    },
  },
  required: ["niyet", "cevap"],
} as const;

function asistanPromptOlustur(girdiMetni: string) {
  return (
    `Sen ${KURUM_ADI}'nin Telegram üzerinden çalışan sanal asistanısın. Sıcak, kısa, saygılı bir üslupla ` +
    `Türkçe konuş. Bugünün tarihi ${bugunIstanbul()} (YYYY-MM-DD, İstanbul saatiyle). Kullanıcının mesajını ` +
    `sınıflandır ve uygun alanları doldur. Kullanıcının mesajı: "${girdiMetni}"`
  );
}

async function ozetMetniOlustur(supabase: ReturnType<typeof createAdminClient>) {
  const ayBasiStr = ayBasiIstanbul();
  const [{ data: buAyIslemler }, { data: yaklasanHatirlaticilar }] = await Promise.all([
    supabase.from("islemler").select("tur, tutar").gte("tarih", ayBasiStr),
    supabase
      .from("hatirlaticilar")
      .select("baslik, hatirlatma_tarihi")
      .eq("tamamlandi", false)
      .order("hatirlatma_tarihi", { ascending: true })
      .limit(5),
  ]);

  const gelir = (buAyIslemler ?? []).filter((i) => i.tur === "gelir").reduce((t, i) => t + i.tutar, 0);
  const gider = (buAyIslemler ?? []).filter((i) => i.tur === "gider").reduce((t, i) => t + i.tutar, 0);
  const net = gelir - gider;

  const hatirlaticiSatirlari = (yaklasanHatirlaticilar ?? [])
    .map((h) => `• ${h.baslik} (${h.hatirlatma_tarihi})`)
    .join("\n");

  return (
    `📊 <b>Bu Ay Özet</b>\n` +
    `Gelir: ${formatTL(gelir)}\n` +
    `Gider: ${formatTL(gider)}\n` +
    `Net: ${formatTL(net)}\n\n` +
    `🔔 <b>Yaklaşan Hatırlatıcılar</b>\n` +
    (hatirlaticiSatirlari || "Yaklaşan hatırlatıcı yok.")
  );
}

async function siniflandirmaSonucunuIsle(
  supabase: ReturnType<typeof createAdminClient>,
  cikarim: Record<string, unknown>
): Promise<string> {
  const niyet = cikarim.niyet;
  const cevap = typeof cikarim.cevap === "string" ? cikarim.cevap : "Anladım.";

  if (niyet === "ozet") {
    return ozetMetniOlustur(supabase);
  }

  if (niyet === "hatirlatici" && cikarim.hatirlatici_baslik && cikarim.hatirlatici_tarihi) {
    await supabase.from("hatirlaticilar").insert({
      baslik: String(cikarim.hatirlatici_baslik),
      hatirlatma_tarihi: String(cikarim.hatirlatici_tarihi),
      tamamlandi: false,
      olusturan: null,
    });
    return cevap;
  }

  if (niyet === "not" && cikarim.not_icerik) {
    await supabase.from("notlar").insert({
      icerik: String(cikarim.not_icerik),
      kaynak: "telegram",
      olusturan: null,
    });
    return cevap;
  }

  return cevap;
}

type TelegramGuncelleme = {
  message?: {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
    photo?: Array<{ file_id: string }>;
  };
};

// Telegram'ın gönderdiği her mesajda bu adres tetiklenir (bkz. setWebhook kurulumu).
export async function POST(request: NextRequest) {
  const guncelleme: TelegramGuncelleme = await request.json();
  const mesaj = guncelleme.message;

  if (!mesaj) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { data: ayarlar } = await supabase
    .from("ayarlar")
    .select("telegram_bot_token, telegram_chat_id, ocr_saglayici, gemini_api_key, openai_api_key")
    .eq("id", true)
    .single();

  const izinliChatIdler = chatIdListesiCikar(ayarlar?.telegram_chat_id);

  if (!ayarlar?.telegram_bot_token || izinliChatIdler.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Guvenlik: sadece ayarlarda kayitli kisilerin sohbetlerinden gelen mesajlara yanit ver.
  const gelenChatId = String(mesaj.chat.id);
  if (!izinliChatIdler.includes(gelenChatId)) {
    return NextResponse.json({ ok: true });
  }

  const botToken = ayarlar.telegram_bot_token;
  const chatId = gelenChatId;
  const yzAyarlari: YapayZekaAyarlari | null =
    ayarlar.ocr_saglayici === "gemini" && ayarlar.gemini_api_key
      ? { saglayici: "gemini", apiKey: ayarlar.gemini_api_key }
      : ayarlar.ocr_saglayici === "openai" && ayarlar.openai_api_key
        ? { saglayici: "openai", apiKey: ayarlar.openai_api_key }
        : null;

  try {
    if (mesaj.text === "/start") {
      await telegramMesajGonder(botToken, chatId, KARSILAMA);
      return NextResponse.json({ ok: true });
    }

    if (mesaj.text) {
      const metin = mesaj.text.trim().toLocaleLowerCase("tr-TR");
      // Ozet/durum sorgusu icin AI'ye gerek yok, dogrudan gercek verilerle cevapliyoruz.
      if (metin.includes("özet") || metin.includes("ozet") || metin.includes("durum")) {
        await telegramMesajGonder(botToken, chatId, await ozetMetniOlustur(supabase));
        return NextResponse.json({ ok: true });
      }

      if (!yzAyarlari) {
        await telegramMesajGonder(
          botToken,
          chatId,
          "Bu isteği anlamak için yapay zekâ ayarlanmamış. Ayarlar sayfasından Gemini veya OpenAI anahtarı ekleyin. Şimdilik sadece \"özet\" yazabilirsiniz."
        );
        return NextResponse.json({ ok: true });
      }

      const cikarim = await jsonUret(yzAyarlari, asistanPromptOlustur(mesaj.text), ASISTAN_SEMASI);
      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim));
      return NextResponse.json({ ok: true });
    }

    if (mesaj.voice) {
      if (!yzAyarlari) {
        await telegramMesajGonder(botToken, chatId, "Sesli mesajları anlamak için Ayarlar'dan bir API anahtarı eklemelisiniz.");
        return NextResponse.json({ ok: true });
      }

      const { base64, mimeType } = await telegramDosyaIndir(botToken, mesaj.voice.file_id);

      let cikarim: Record<string, unknown>;
      if (yzAyarlari.saglayici === "gemini") {
        // Gemini sesi dogrudan anlayabiliyor - tek istekte transkript + siniflandirma.
        cikarim = await jsonUret(
          yzAyarlari,
          asistanPromptOlustur("(sesli mesaj - ekli ses dosyasını dinleyip anla)"),
          ASISTAN_SEMASI,
          { base64, mimeType }
        );
      } else {
        const metin = await sesiMetneCevir(yzAyarlari.apiKey, base64, mimeType);
        cikarim = await jsonUret(yzAyarlari, asistanPromptOlustur(metin), ASISTAN_SEMASI);
      }

      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim));
      return NextResponse.json({ ok: true });
    }

    if (mesaj.photo && mesaj.photo.length > 0) {
      if (!yzAyarlari) {
        await telegramMesajGonder(botToken, chatId, "Fiş okumak için Ayarlar'dan bir API anahtarı eklemelisiniz.");
        return NextResponse.json({ ok: true });
      }

      // Telegram ayni fotografi birden fazla cozunurlukte gonderir, sonuncusu (en buyugu) alinir.
      const enBuyukFoto = mesaj.photo[mesaj.photo.length - 1];
      const { base64, mimeType } = await telegramDosyaIndir(botToken, enBuyukFoto.file_id);
      const fis = await fisVerisiCikar(yzAyarlari, base64, mimeType);

      if (!fis.tutar || !fis.tarih || !fis.aciklama) {
        await telegramMesajGonder(botToken, chatId, "Fişi okuyamadım, tutarı/tarihi net seçemedim. Web panelinden elle girer misiniz?");
        return NextResponse.json({ ok: true });
      }

      await supabase.from("islemler").insert({
        tur: fis.tur,
        tutar: fis.tutar,
        tarih: fis.tarih,
        aciklama: fis.aciklama,
        kategori: fis.kategori ?? null,
        fis_gorsel_url: null,
        ocr_ham_metin: null,
        olusturan: null,
      });

      await telegramMesajGonder(
        botToken,
        chatId,
        `✅ Fişi kaydettim.\n${fis.tur === "gelir" ? "Gelir" : "Gider"}: ${formatTL(fis.tutar)}\nTarih: ${fis.tarih}\nAçıklama: ${fis.aciklama}${
          fis.kategori ? `\nKategori: ${fis.kategori}` : ""
        }`
      );
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    await telegramMesajGonder(
      botToken,
      chatId,
      `Bir hata oldu, tekrar deneyebilir misiniz? (${e instanceof Error ? e.message : "bilinmeyen hata"})`
    );
  }

  return NextResponse.json({ ok: true });
}
