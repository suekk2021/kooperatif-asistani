import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telegramMesajGonder, telegramDosyaIndir, chatIdListesiCikar, telegramGondereniBul } from "@/lib/telegram";
import { jsonUret, sesiMetneCevir, type YapayZekaAyarlari } from "@/lib/ai";
import { bugunIstanbul } from "@/lib/tarih";
import { rolBilgisi, aliciAdi } from "@/lib/roller";
import { notBildirimiGonder } from "@/lib/not-bildirimi";
import { MEDYA_ETIKETI, medyaBilgisiCikar, medyaBuyukMu, medyayiSakla, megabayt, MEDYA_KOVASI, type MedyaBilgisi, type TelegramMedyaMesaji } from "@/lib/telegram-medya";
import { GRUP_ROLLERI, GRUP_ACIKLAMASI, aliciCoz, kimeIsteginiOku, type KimeIstegi } from "@/lib/telegram-alici";
import type { KullaniciRolu } from "@/types/database";

const KURUM_ADI = "Suluova Üreten Eller Kadın Kooperatifi";
const KARSILAMA = `Merhaba! Ben ${KURUM_ADI}'nin sanal asistanıyım. Size nasıl yardımcı olabilirim?\n\nBana şunları yapabilirsiniz:\n• "özet" yazıp genel durumu sorabilirsiniz\n• Bir hatırlatıcıyı yazılı ya da sesli olarak söyleyebilirsiniz ("15 Temmuz'da kira ödemesi hatırlat" gibi)\n• Serbest bir not bırakabilirsiniz\n• Not ya da hatırlatıcıyı başkalarına yönlendirebilirsiniz ("yarın sayım var, depocu arkadaşlar erken gelsin" ya da "Fatih Bey'e not: ..." gibi)\n• Fotoğraf, video ya da dosya gönderebilirsiniz: Notlar\'a kaydedilir; açıklamasına "depocu arkadaşlara" gibi yazarsanız o kişilere iletilir (en fazla 20 MB). Fatura ve fiş kaydı Telegram\'dan yapılmaz, web panelinden girilir`;

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
  `5) SESLİ MESAJ: hatırlatıcı ve notları sesli mesajdan da anlarsın. Fotoğraf, video ve dosyaları not olarak kaydeder, açıklamasında söylenen kişi ya da gruba iletirsin (en fazla 20 MB). Fatura/fiş kaydını Telegram'dan yapmazsın; o web panelinden girilir, sorulursa bunu söyle.\n\n` +
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

/** Alıcı çözülemediğinde (metin/hatırlatıcıda) kullanıcıya dönen mesaj: hiçbir şey kaydedilmez. */
const kaydedilmediMesaji = (h: { hata: string; yetkisiz?: boolean }) =>
  h.hata + (h.yetkisiz ? "\n\nKaydetmedim." : "\n\nKaydetmedim. İsmi tam söyleyerek ya da grubu belirterek tekrar dener misiniz?");

// Başkalarına yönlendirilen not/hatırlatıcı için alıcıları kişi listesine çevirir. Emin olunamayan
// her durumda (yetki yok, isim belirsiz/bulunamadı) hiçbir şey kaydedilmez, sebep söylenir.
async function hedefleriBelirle(
  supabase: ReturnType<typeof createAdminClient>,
  istek: KimeIstegi,
  profil: GonderenProfil | null,
  gondereniHaricTut: boolean
): Promise<{ hata: string; yetkisiz?: boolean } | { idler: string[]; adlar: string[] }> {
  if (!profil || !rolBilgisi(profil.rol)?.yazar) {
    return {
      hata: "Başkalarına not ya da hatırlatıcı göndermek için sistemde kayıt girme yetkisi olan bir kişi olarak kayıtlı olmanız gerekir.",
      yetkisiz: true,
    };
  }
  const coz = await aliciCoz(supabase, istek, gondereniHaricTut ? profil.id : undefined);
  if (coz.sorunlar.length > 0) {
    return {
      hata: "Kime gideceğinden emin olamadım:\n" + coz.sorunlar.map((x) => "• " + kacis(x)).join("\n"),
    };
  }
  if (coz.idler.length === 0) {
    return { hata: "Gönderilecek kimse kalmadı (kendinize yönlendirmiş olabilirsiniz)." };
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
      if ("hata" in hedef) return kaydedilmediMesaji(hedef);
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
    if ("hata" in hedef) return kaydedilmediMesaji(hedef);
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

// Telegram'dan gelen fotoğraf/video/dosya fiş olarak değil NOT olarak kaydedilir (fatura ve fiş web panelinden girilir).
// Açıklamasında "depocu arkadaşlara" gibi bir kime ifadesi varsa o kişilere iletilir. Medya kaybolmasın diye alıcı
// anlaşılamazsa genel not olarak kaydedilir ve gönderene söylenir; yalnız yetkisiz gönderen ve 20 MB üstü genel dosya kaydedilmez.
async function medyaNotuOlustur(
  supabase: ReturnType<typeof createAdminClient>,
  botToken: string,
  yzAyarlari: YapayZekaAyarlari | null,
  ozelPrompt: string | null | undefined,
  medya: MedyaBilgisi,
  gonderenIsim: string,
  gelenChatId: string
): Promise<string> {
  const etiket = MEDYA_ETIKETI[medya.tur];
  const kucukEtiket = etiket.toLocaleLowerCase("tr-TR");
  const { data: profil } = await supabase
    .from("profiller")
    .select("id, rol")
    .eq("telegram_chat_id", gelenChatId)
    .limit(1)
    .maybeSingle();
  const gonderenProfil = (profil as GonderenProfil | null) ?? null;
  const buyuk = medyaBuyukMu(medya);
  const uyarilar: string[] = [];

  let icerik = medya.aciklama;
  let istek: KimeIstegi | null = null;
  if (medya.aciklama && yzAyarlari) {
    try {
      const cikarim = await jsonUret(yzAyarlari, asistanPromptOlustur(medya.aciklama, ozelPrompt), ASISTAN_SEMASI);
      istek = kimeIsteginiOku(cikarim);
      if (cikarim.niyet === "not" && cikarim.not_icerik) icerik = String(cikarim.not_icerik);
    } catch {
      uyarilar.push("Açıklamadaki kime ifadesini anlayamadım (yapay zekâ yanıt vermedi); genel not olarak kaydettim.");
    }
  } else if (medya.aciklama && !yzAyarlari) {
    uyarilar.push("Yapay zekâ ayarlı olmadığı için açıklamadaki kime ifadesi okunamadı; genel not olarak kaydettim.");
  }

  let hedef: { idler: string[]; adlar: string[] } | null = null;
  if (istek) {
    const sonuc = await hedefleriBelirle(supabase, istek, gonderenProfil, true);
    if ("hata" in sonuc) {
      if (sonuc.yetkisiz) return `${sonuc.hata}\n\nKaydetmedim.`;
      uyarilar.push(`${sonuc.hata}\nGenel not olarak kaydettim; kimseye gitmedi. Kişiye iletmek için ismi tam yazarak tekrar gönderin.`);
    } else {
      hedef = sonuc;
    }
  }

  if (buyuk && !hedef) {
    return (
      `⚠️ Bu ${kucukEtiket} ${megabayt(medya.boyut ?? 0)}; Telegram botu en fazla 20 MB'lık dosyaları alabiliyor, bu yüzden kaydedemedim. ` +
      `Lütfen kısaltıp tekrar gönderin. (Bir kişiye göstermek istiyorsanız dosyayı doğrudan Telegram'dan o kişiye de gönderebilirsiniz.)` +
      (uyarilar.length ? `\n\n${uyarilar.map(kacis).join("\n")}` : "")
    );
  }

  let yol: string | null = null;
  if (!buyuk) {
    try {
      yol = await medyayiSakla(supabase, botToken, medya);
    } catch (e) {
      uyarilar.push(`${etiket} panele kaydedilemedi (${e instanceof Error ? e.message : "bilinmeyen hata"}); not metni kaydedildi.`);
    }
  }

  const { error } = await supabase.from("notlar").insert({
    icerik: icerik || `(${kucukEtiket})`,
    kaynak: "telegram",
    olusturan: gonderenProfil?.id ?? null,
    telegram_gonderen: gonderenIsim,
    hedef_kullanici_id: hedef?.idler[0] ?? null,
    hedef_kullanici_idler: hedef?.idler ?? [],
    medya_tur: medya.tur,
    medya_yol: yol,
    medya_dosya_id: medya.dosyaId,
    medya_adi: medya.ad,
    medya_boyut: medya.boyut,
  });
  if (error) {
    if (yol) await supabase.storage.from(MEDYA_KOVASI).remove([yol]);
    throw new Error(error.message);
  }

  const yanit: string[] = [];
  if (hedef) {
    const sonuc = await notBildirimiGonder(supabase, botToken, hedef.idler, icerik || `(${kucukEtiket})`, gonderenIsim, {
      tur: medya.tur,
      dosyaId: medya.dosyaId,
    });
    yanit.push(`📝 ${etiket} not olarak kaydedildi.`, `📨 Telegram'dan iletildi: ${kacis(sonuc.gitti.join(", ") || "—")}`);
    if (sonuc.numarasiz.length > 0) {
      yanit.push(`⚠️ Telegram numarası kayıtlı olmadığı için iletilemedi (notu panelde görürler): ${kacis(sonuc.numarasiz.join(", "))}`);
    }
  } else {
    yanit.push(`📝 ${etiket} not olarak kaydedildi (Notlar sayfasında görünür).`);
  }
  if (buyuk) {
    yanit.push(`⚠️ Dosya ${megabayt(medya.boyut ?? 0)}; 20 MB sınırının üstünde olduğu için panelde görünmez, yalnız Telegram'dan iletildi.`);
  }
  uyarilar.forEach((u) => yanit.push(`⚠️ ${kacis(u)}`));
  return yanit.join("\n");
}

type TelegramGuncelleme = {
  message?: TelegramMedyaMesaji & {
    chat: { id: number };
    text?: string;
    voice?: { file_id: string };
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
    .select("ad_soyad, rol")
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

  const gonderenIsim = (profil ? aliciAdi(profil) : null) ?? telegramGondereniBul(ayarlar.telegram_chat_id, gelenChatId) ?? gelenChatId;
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

    // Fotoğraf, video ve dosya fiş değil not olarak kaydedilir (bkz. medyaNotuOlustur).
    const medya = medyaBilgisiCikar(mesaj);
    if (medya) {
      await telegramMesajGonder(
        botToken,
        chatId,
        await medyaNotuOlustur(supabase, botToken, yzAyarlari, ayarlar.asistan_promptu, medya, gonderenIsim, gelenChatId)
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
