import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, telegramDosyaIndir, chatIdListesiCikar, telegramGondereniBul } from "@/lib/telegram";
import { jsonUret, sesiMetneCevir, type YapayZekaAyarlari } from "@/lib/ai";
import { bugunIstanbul } from "@/lib/tarih";
import { rolBilgisi } from "@/lib/roller";
import { notBildirimiGonder } from "@/lib/not-bildirimi";
import { GRUP_ROLLERI, GRUP_ACIKLAMASI, aliciCoz, kimeIsteginiOku, type KimeIstegi } from "@/lib/telegram-alici";
import type { KullaniciRolu } from "@/types/database";

const KURUM_ADI = "Suluova Üreten Eller Kadın Kooperatifi";
const KARSILAMA = `Merhaba! Ben ${KURUM_ADI}'nin sanal asistanıyım. Size nasıl yardımcı olabilirim?\n\nBana şunları yapabilirsiniz:\n• "özet" yazıp genel durumu sorabilirsiniz\n• Bir hatırlatıcıyı yazılı ya da sesli olarak söyleyebilirsiniz ("15 Temmuz'da kira ödemesi hatırlat" gibi)\n• Serbest bir not bırakabilirsiniz\n• Not ya da hatırlatıcıyı başkalarına yönlendirebilirsiniz ("yarın sayım var, depocu arkadaşlar erken gelsin" ya da "Fatih Bey'e not: ..." gibi)\n• (Yakında) fatura fotoğrafı gönderip alış kaydı oluşturabileceksiniz`;

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
    not_icerik: {
      type: "string",
      description:
        "niyet=not ise, notun içeriği. 'X'e not bırak/ilet' gibi yönlendirme komutunu çıkar, iletilecek mesajı yaz.",
    },
    kime_herkes: {
      type: "boolean",
      description: "niyet=not/hatirlatici ve kullanıcı 'herkese', 'tüm ekibe', 'hepsine' diyorsa true.",
    },
    kime_gruplar: {
      type: "array",
      items: { type: "string", enum: GRUP_ROLLERI },
      description:
        "niyet=not/hatirlatici ve kullanıcı bir iş grubuna yönlendiriyorsa (ör. 'depocu arkadaşlar', 'ön muhasebeci'): ilgili rol(ler). Roller: " +
        GRUP_ACIKLAMASI +
        ". Rol adından ve açıklamasından en uygun olanı seç; emin değilsen boş bırak.",
    },
    kime_kisiler: {
      type: "array",
      items: { type: "string" },
      description:
        "niyet=not/hatirlatici ve kullanıcı belirli kişilere yönlendiriyorsa o kişilerin adları, söylendiği gibi (ör. 'Fatih', 'Nagihan Hanım'). Başkasına yönlendirme yoksa boş bırak.",
    },
    cevap: {
      type: "string",
      description:
        "Kullanıcıya verilecek cevap. Sıcak ama SOMUT ve BİLGİLENDİRİCİ ol - 'nasıl yardımcı olabilirim' gibi " +
        "muğlak, geri sorulu cümlelerle geçiştirme. 'Sen kimsin/ne yapabilirsin' gibi bir soruya kim olduğunu " +
        "ve tam olarak hangi 5 şeyi yapabildiğini (özet, hatırlatıcı, not, başkalarına yönlendirme, sesli mesaj) somut örneklerle anlat. " +
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
  `4) KİME: not ya da hatırlatıcıyı başkalarına yönlendirebilirsin ("yarın sayım var, depocu arkadaşlar erken gelsin", "ön muhasebeciye not: yarın denetim var", "Fatih Bey'e hatırlatıcı"). Alıcıyı kime_herkes / kime_gruplar / kime_kisiler alanlarına yaz; yönlendirme yoksa bu alanları boş bırak.\n` +
  `5) SESLİ MESAJ: hatırlatıcı ve notları sesli mesajdan da anlarsın. Fatura fotoğrafından alış kaydı yakında açılacak; şu an fotoğraf işlemezsin, sorulursa bunu dürüstçe söyle.\n\n` +
  `"Sen kimsin", "ne yapabilirsin", "yeteneklerin ne" gibi bir soru geldiğinde bu maddeleri somut, kısa örneklerle ` +
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

const kacis = (m: string) => m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type GonderenProfil = { id: string; rol: KullaniciRolu | null };

// Başkalarına yönlendirilen not/hatırlatıcı için alıcıları kişi listesine çevirir. Emin olunamayan
// her durumda (yetki yok, isim belirsiz/bulunamadı) hiçbir şey kaydedilmez, sebep söylenir.
async function hedefleriBelirle(
  supabase: ReturnType<typeof createAdminClient>,
  istek: KimeIstegi,
  profil: GonderenProfil | null,
  gondereniHaricTut: boolean
): Promise<{ hata: string } | { idler: string[]; adlar: string[] }> {
  if (!profil || !rolBilgisi(profil.rol)?.yazar) {
    return {
      hata: "Başkalarına not ya da hatırlatıcı göndermek için sistemde kayıt girme yetkisi olan bir kişi olarak kayıtlı olmanız gerekir. Kaydetmedim.",
    };
  }
  const coz = await aliciCoz(supabase, istek, gondereniHaricTut ? profil.id : undefined);
  if (coz.sorunlar.length > 0) {
    return {
      hata:
        "Kime gideceğinden emin olamadığım için kaydetmedim:\n" +
        coz.sorunlar.map((x) => "• " + kacis(x)).join("\n") +
        "\n\nİsmi tam söyleyerek ya da grubu belirterek tekrar dener misiniz?",
    };
  }
  if (coz.idler.length === 0) {
    return { hata: "Gönderilecek kimse kalmadı (kendinize yönlendirmiş olabilirsiniz). Kaydetmedim." };
  }
  return { idler: coz.idler, adlar: coz.adlar };
}

async function siniflandirmaSonucunuIsle(
  supabase: ReturnType<typeof createAdminClient>,
  cikarim: Record<string, unknown>,
  gonderenIsim: string,
  gelenChatId: string,
  botToken: string
): Promise<string> {
  const niyet = cikarim.niyet;
  const cevap = typeof cikarim.cevap === "string" ? cikarim.cevap : "Anladım.";

  if (niyet === "ozet") {
    return ozetMetniOlustur(supabase);
  }

  // Söyleyen kişinin profili varsa kayıt ona bağlanır; yoksa geldiği sohbete döner.
  const { data: profil } = await supabase
    .from("profiller")
    .select("id, rol")
    .eq("telegram_chat_id", gelenChatId)
    .limit(1)
    .maybeSingle();
  const gonderenProfil = (profil as GonderenProfil | null) ?? null;
  const istek = kimeIsteginiOku(cikarim);

  if (niyet === "hatirlatici" && cikarim.hatirlatici_baslik && cikarim.hatirlatici_tarihi) {
    const baslik = String(cikarim.hatirlatici_baslik);
    const tarih = String(cikarim.hatirlatici_tarihi);
    let hedefIdler = gonderenProfil ? [gonderenProfil.id] : [];
    let adlar: string[] = [];
    if (istek) {
      // Hatırlatıcıda söyleyen kişi de seçildiyse (ör. "herkes") alıcıdır.
      const hedef = await hedefleriBelirle(supabase, istek, gonderenProfil, false);
      if ("hata" in hedef) return hedef.hata;
      hedefIdler = hedef.idler;
      adlar = hedef.adlar;
    }
    await supabase.from("hatirlaticilar").insert({
      baslik,
      hatirlatma_tarihi: tarih,
      tamamlandi: false,
      olusturan: gonderenProfil?.id ?? null,
      hedef_kullanici_id: hedefIdler[0] ?? null,
      hedef_kullanici_idler: hedefIdler,
      kaynak_chat_id: gelenChatId,
      telegram_gonderen: gonderenIsim,
    });
    if (!istek) return cevap;
    return `🔔 Hatırlatıcı kuruldu: ${kacis(baslik)} (${tarih})\n📨 Günü gelince hatırlatılacak: ${kacis(adlar.join(", "))}`;
  }

  if (niyet === "not" && cikarim.not_icerik) {
    const icerik = String(cikarim.not_icerik);
    if (!istek) {
      await supabase.from("notlar").insert({ icerik, kaynak: "telegram", olusturan: null, telegram_gonderen: gonderenIsim });
      return cevap;
    }
    const hedef = await hedefleriBelirle(supabase, istek, gonderenProfil, true);
    if ("hata" in hedef) return hedef.hata;
    await supabase.from("notlar").insert({
      icerik,
      kaynak: "telegram",
      olusturan: gonderenProfil?.id ?? null,
      telegram_gonderen: gonderenIsim,
      hedef_kullanici_id: hedef.idler[0] ?? null,
      hedef_kullanici_idler: hedef.idler,
    });
    const sonuc = await notBildirimiGonder(supabase, botToken, hedef.idler, icerik, gonderenIsim);
    let yanit = `📝 Not kaydedildi.\n📨 Telegram'dan iletildi: ${kacis(sonuc.gitti.join(", ") || "—")}`;
    if (sonuc.numarasiz.length > 0) {
      yanit += `\n⚠️ Telegram numarası kayıtlı olmadığı için bildirim gitmedi (notu panelde görürler): ${kacis(sonuc.numarasiz.join(", "))}`;
    }
    return yanit;
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
      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim, gonderenIsim, gelenChatId, botToken));
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

      await telegramMesajGonder(botToken, chatId, await siniflandirmaSonucunuIsle(supabase, cikarim, gonderenIsim, gelenChatId, botToken));
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
