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
