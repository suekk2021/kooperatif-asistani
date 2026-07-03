/** "123, 456\n789" gibi serbest yazilmis bir metinden gecerli chat ID listesini cikarir. */
export function chatIdListesiCikar(metin: string | null | undefined): string[] {
  if (!metin) return [];
  return metin
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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
