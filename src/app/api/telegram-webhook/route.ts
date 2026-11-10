import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, telegramDosyaIndir, chatIdListesiCikar, telegramGondereniBul } from "@/lib/telegram";
import { jsonUret, sesiMetneCevir, type YapayZekaAyarlari } from "@/lib/ai";
import { bugunIstanbul } from "@/lib/tarih";

const KURUM_ADI = "Suluova Üreten Eller Kadın Kooperatifi";
const KARSILAMA = `Merhaba! Ben ${KURUM_ADI}'nin sanal asistanıyım. Size nasıl yardımcı olabilirim?\n\nBana şunları yapabilirsiniz:\n• "özet" yazıp genel durumu sorabilirsiniz\n• Bir hatırlatıcıyı yazılı ya da sesli olarak söyleyebilirsiniz ("15 Temmuz'da kira ödemesi hatırlat" gibi)\n• Serbest bir not bırakabilirsiniz\n• (Yakında) fatura fotoğrafı gönderip alış kaydı oluşturabileceksiniz`;

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
        "Kullanıcıya verilecek cevap. Sıcak ama SOMUT ve BİLGİLENDİRİCİ ol - 'nasıl yardımcı olabilirim' gibi " +
        "muğlak, geri sorulu cümlelerle geçiştirme. 'Sen kimsin/ne yapabilirsin' gibi bir soruya kim olduğunu " +
        "ve tam olarak hangi 4 şeyi yapabildiğini (özet, hatırlatıcı, not, sesli mesaj) somut örneklerle anlat. " +
        "Asla sayısal mali veri (tutar, bakiye vb.) UYDURMA - onları sen değil sistem ekler.",
    },
  },
  required: ["niyet", "cevap"],
} as const;

const ASISTAN_KIMLIGI =
  `Sen ${KURUM_ADI}'nin Telegram üzerinden çalışan kişisel asistanısın. Başkan ve Ön Muhasebe Sorumlusu ` +
  `seninle kendi Telegram hesaplarından doğrudan konuşuyor. Sıcak ama net, öz ve kendinden emin bir üslubun var - ` +
  `belirsiz, geçiştirici, "nasıl yardımcı olabilirim" tarzı boş cümleler kurmazsın; ne yapabildiğini somut olarak bilirsin.\n\n` +
  `Yapabildiklerin:\n` +
  `1) ÖZET: "özet" veya "durum" yazınca kayıtlı kart sayılarını ve yaklaşan hatırlatıcıları anında verirsin.\n` +
  `2) HATIRLATICI: "15 Temmuz'da kira ödemesi hatırlat" gibi tarihli bir talebi otomatik kaydedersin, günü gelince Telegram'dan haber verirsin.\n` +
  `3) NOT: tarihsiz, serbest bir bilgiyi not olarak kaydedersin.\n` +
  `4) SESLİ MESAJ: hatırlatıcı ve notları sesli mesajdan da anlarsın. Fatura fotoğrafından alış kaydı yakında açılacak; şu an fotoğraf işlemezsin, sorulursa bunu dürüstçe söyle.\n\n` +
  `"Sen kimsin", "ne yapabilirsin", "yeteneklerin ne" gibi bir soru geldiğinde bu dört maddeyi somut, kısa örneklerle ` +
  `anlat - genel geçer bir "asistanım, size yardımcı olurum" cevabı verme.`;

function asistanPromptOlustur(girdiMetni: string, ozelPrompt: string | null | undefined) {
  const ekTalimat = ozelPrompt?.trim()
    ? `\n\nBaşkan'ın senin için verdiği ek talimat (buna öncelik ver): "${ozelPrompt.trim()}"`
    : "";
  return (
    `${ASISTAN_KIMLIGI}${ekTalimat}\n\n` +
    `Bugünün tarihi ${bugunIstanbul()} (YYYY-MM-DD, İstanbul saatiyle). Kullanıcının mesajını sınıflandır ve ` +
    `uygun alanları doldur. Kullanıcının mesajı: "${girdiMetni}"`
  );
}

// İMECE geçişi: para/stok özeti Kasa ve Alış ekranları bitince eklenecek; şimdilik
// kayıtlı kart sayıları ve hatırlatıcılar.
async function ozetMetniOlustur(supabase: ReturnType<typeof createAdminClient>) {
  const say = (tablo: string, tur?: string) => {
    const sorgu = supabase.from(tablo).select("id", { count: "exact", head: true }).eq("aktif", true);
    return (tur ? sorgu.eq("tur", tur) : sorgu).then((r) => r.count ?? 0);
  };
  const [musteri, tedarikci, stokKarti, { data: yaklasanHatirlaticilar }] = await Promise.all([
    say("cariler", "musteri"),
    say("cariler", "tedarikci"),
    say("stok_kartlari"),
    supabase
      .from("hatirlaticilar")
      .select("baslik, hatirlatma_tarihi")
      .eq("tamamlandi", false)
      .order("hatirlatma_tarihi", { ascending: true })
      .limit(5),
  ]);

  const hatirlaticiSatirlari = (yaklasanHatirlaticilar ?? [])
    .map((h) => `• ${h.baslik} (${h.hatirlatma_tarihi})`)
    .join("\n");

  return (
    `📊 <b>İMECE Özet</b>\n` +
    `Müşteri: ${musteri} · Tedarikçi: ${tedarikci} · Stok kartı: ${stokKarti}\n` +
    `Kasa, alacak ve fire özeti yeni ekranlar tamamlanınca burada olacak.\n\n` +
    `🔔 <b>Yaklaşan Hatırlatıcılar</b>\n` +
    (hatirlaticiSatirlari || "Yaklaşan hatırlatıcı yok.")
  );
}

async function siniflandirmaSonucunuIsle(
  supabase: ReturnType<typeof createAdminClient>,
  cikarim: Record<string, unknown>,
  gonderenIsim: string,
  gelenChatId: string
): Promise<string> {
  const niyet = cikarim.niyet;
  const cevap = typeof cikarim.cevap === "string" ? cikarim.cevap : "Anladım.";

  if (niyet === "ozet") {
    return ozetMetniOlustur(supabase);
  }

  if (niyet === "hatirlatici" && cikarim.hatirlatici_baslik && cikarim.hatirlatici_tarihi) {
    // Söyleyen kişinin profili varsa hatırlatıcı ona bağlanır; yoksa geldiği sohbete döner.
    const { data: profil } = await supabase
      .from("profiller")
      .select("id")
      .eq("telegram_chat_id", gelenChatId)
      .limit(1)
      .maybeSingle();
    await supabase.from("hatirlaticilar").insert({
      baslik: String(cikarim.hatirlatici_baslik),
      hatirlatma_tarihi: String(cikarim.hatirlatici_tarihi),
      tamamlandi: false,
      olusturan: profil?.id ?? null,
      hedef_kullanici_id: profil?.id ?? null,
      kaynak_chat_id: gelenChatId,
      telegram_gonderen: gonderenIsim,
    });
    return cevap;
  }

  if (niyet === "not" && cikarim.not_icerik) {
    await supabase.from("notlar").insert({
      icerik: String(cikarim.not_icerik),
      kaynak: "telegram",
      olusturan: null,
      telegram_gonderen: gonderenIsim,
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
  let guncelleme: TelegramGuncelleme;
  try {
    guncelleme = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const mesaj = guncelleme.message;

  if (!mesaj) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createAdminClient();
  const { data: ayarlar } = await supabase
    .from("ayarlar")
    .select("telegram_bot_token, telegram_chat_id, ocr_saglayici, gemini_api_key, openai_api_key, asistan_promptu, telegram_webhook_secret")
    .eq("id", true)
    .single();

  // İstek gerçekten Telegram'dan mı? setWebhook'ta verilen sır her istekte bu başlıkla gelir.
  // Sır tanımlıysa ve tutmuyorsa sahte istektir; hiçbir şey işlenmez.
  if (ayarlar?.telegram_webhook_secret && request.headers.get("x-telegram-bot-api-secret-token") !== ayarlar.telegram_webhook_secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!ayarlar?.telegram_bot_token) {
    return NextResponse.json({ ok: true });
  }

  // Güvenlik: yalnızca kayıtlı kişilere cevap verilir — Ayarlar'daki liste ya da
  // Kişiler ekranında profiline Telegram numarası yazılmış biri.
  const gelenChatId = String(mesaj.chat.id);
  const { data: profil } = await supabase
    .from("profiller")
    .select("ad_soyad")
    .eq("telegram_chat_id", gelenChatId)
    .limit(1)
    .maybeSingle();
  const listede = chatIdListesiCikar(ayarlar.telegram_chat_id).includes(gelenChatId);
  if (!profil && !listede) {
    // Tanınmayan kişiye sadece kendi numarasını söyler (başka bilgi vermez); yönetici bu
    // numarayı Ayarlar → Kişiler'de profiline yazınca bot onu tanır.
    if (mesaj.text) {
      try {
        await telegramMesajGonder(
          ayarlar.telegram_bot_token,
          gelenChatId,
          `Bu bot ${KURUM_ADI} çalışanları içindir.\n\nTelegram numaranız: <code>${gelenChatId}</code>\n\nBu numarayı teknik desteğe iletin; İMECE'de profilinize eklendiğinde bot size cevap vermeye başlar.`
        );
      } catch {
        // Cevap gitmese de sorun değil.
      }
    }
    return NextResponse.json({ ok: true });
  }

  const botToken = ayarlar.telegram_bot_token;
  const chatId = gelenChatId;

  const gonderenIsim = profil?.ad_soyad ?? telegramGondereniBul(ayarlar.telegram_chat_id, gelenChatId) ?? gelenChatId;
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

      const cikarim = await jsonUret(
        yzAyarlari,
        asistanPromptOlustur(mesaj.text, ayarlar.asistan_promptu),
        ASISTAN_SEMASI
      );
      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim, gonderenIsim, gelenChatId));
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
          asistanPromptOlustur("(sesli mesaj - ekli ses dosyasını dinleyip anla)", ayarlar.asistan_promptu),
          ASISTAN_SEMASI,
          { base64, mimeType }
        );
      } else {
        const metin = await sesiMetneCevir(yzAyarlari.apiKey, base64, mimeType);
        cikarim = await jsonUret(yzAyarlari, asistanPromptOlustur(metin, ayarlar.asistan_promptu), ASISTAN_SEMASI);
      }

      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim, gonderenIsim, gelenChatId));
      return NextResponse.json({ ok: true });
    }

    // Eski gelir/gider kaydı kaldırıldı; fatura fotoğrafı Alış ekranı bitince
    // "alış taslağı"na dönüşecek.
    if (mesaj.photo && mesaj.photo.length > 0) {
      await telegramMesajGonder(
        botToken,
        chatId,
        "📷 Fatura fotoğrafından kayıt, yeni Alış ekranı tamamlanınca açılacak. Şimdilik faturayı web panelinden girebilirsiniz."
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
