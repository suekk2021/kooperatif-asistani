/**
 * "123456789:Başkan Eyüp\n987654321:Ön Muhasebe Ayşe" gibi, her satirda opsiyonel
 * bir isim etiketi tasiyabilen serbest metni { chatId, isim } listesine cevirir.
 * Etiket verilmemisse isim null kalir.
 */
function chatIdSatirlariniAyristir(metin: string | null | undefined): Array<{ chatId: string; isim: string | null }> {
  if (!metin) return [];
  return metin
    .split(/[\n,]/)
    .map((satir) => satir.trim())
    .filter((satir) => satir.length > 0)
    .map((satir) => {
      const ikiNoktaIndex = satir.indexOf(":");
      if (ikiNoktaIndex === -1) return { chatId: satir, isim: null };
      const chatId = satir.slice(0, ikiNoktaIndex).trim();
      const isim = satir.slice(ikiNoktaIndex + 1).trim();
      return { chatId, isim: isim || null };
    });
}

/** "123, 456:İsim\n789" gibi serbest yazilmis bir metinden gecerli chat ID listesini cikarir. */
export function chatIdListesiCikar(metin: string | null | undefined): string[] {
  return chatIdSatirlariniAyristir(metin).map((s) => s.chatId);
}

/** Verilen chat ID'nin Ayarlar'da bir isim etiketiyle kayitli olup olmadigini bulur. */
export function telegramGondereniBul(metin: string | null | undefined, chatId: string): string | null {
  const eslesen = chatIdSatirlariniAyristir(metin).find((s) => s.chatId === chatId);
  return eslesen?.isim ?? null;
}

export async function telegramMesajGonder(botToken: string, chatId: string, metin: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: metin, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const govde = await res.text();
    throw new Error(`Telegram mesajı gönderilemedi: ${govde}`);
  }
}

/** Telegram'dan gelen bir file_id'yi indirip base64 + mime type olarak dondurur. */
export async function telegramDosyaIndir(
  botToken: string,
  fileId: string
): Promise<{ base64: string; mimeType: string }> {
  const dosyaBilgisiRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const dosyaBilgisi = await dosyaBilgisiRes.json();
  const filePath: string | undefined = dosyaBilgisi?.result?.file_path;

  if (!filePath) {
    throw new Error("Telegram dosya bilgisi alınamadı.");
  }

  const indirmeRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  const arrayBuffer = await indirmeRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const uzanti = filePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeType =
    uzanti === "oga" || uzanti === "ogg"
      ? "audio/ogg"
      : uzanti === "jpg" || uzanti === "jpeg"
        ? "image/jpeg"
        : uzanti === "png"
          ? "image/png"
          : "application/octet-stream";

  return { base64, mimeType };
}

export type MedyaTuru = "foto" | "video" | "video_notu" | "animasyon" | "belge";

const MEDYA_UCLARI: Record<MedyaTuru, { uc: string; alan: string }> = {
  foto: { uc: "sendPhoto", alan: "photo" },
  video: { uc: "sendVideo", alan: "video" },
  video_notu: { uc: "sendVideoNote", alan: "video_note" },
  animasyon: { uc: "sendAnimation", alan: "animation" },
  belge: { uc: "sendDocument", alan: "document" },
};

/**
 * Daha önce Telegram'a ulaşmış bir dosyayı başka bir sohbete iletir. Telegram'ın dosya numarası
 * (file_id) yeterlidir: dosya indirilmez, bu yüzden 20 MB sınırı iletmeyi etkilemez.
 * Not: video notu (yuvarlak video) açıklama (caption) taşıyamaz, metni ayrıca gönderin.
 */
export async function telegramMedyaGonder(
  botToken: string,
  chatId: string,
  tur: MedyaTuru,
  dosyaId: string,
  aciklama?: string
) {
  const { uc, alan } = MEDYA_UCLARI[tur];
  const govde: Record<string, unknown> = { chat_id: chatId, [alan]: dosyaId };
  if (aciklama && tur !== "video_notu") {
    govde.caption = aciklama.slice(0, 1000);
    govde.parse_mode = "HTML";
  }
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${uc}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (!res.ok) {
    throw new Error(`Telegram dosyası iletilemedi: ${await res.text()}`);
  }
}

const UZANTI_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska",
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain", csv: "text/csv",
};

/** Telegram dosyasını ham bayt olarak indirir (en fazla 20 MB; daha büyüğünde Telegram hata verir). */
export async function telegramDosyaBayt(
  botToken: string,
  fileId: string
): Promise<{ veri: Buffer; uzanti: string; mimeType: string }> {
  const bilgiRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const bilgi = await bilgiRes.json();
  const filePath: string | undefined = bilgi?.result?.file_path;
  if (!filePath) throw new Error("Telegram dosya bilgisi alınamadı.");

  const indirmeRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!indirmeRes.ok) throw new Error("Telegram dosyası indirilemedi.");
  const veri = Buffer.from(await indirmeRes.arrayBuffer());
  const uzanti = filePath.split(".").pop()?.toLowerCase() ?? "";
  return { veri, uzanti, mimeType: UZANTI_MIME[uzanti] ?? "application/octet-stream" };
}
