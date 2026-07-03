import { jsonUret, type YapayZekaAyarlari } from "@/lib/ai";
import type { IslemTuru } from "@/types/database";

export const FIS_CIKARIM_SEMASI = {
  type: "object",
  properties: {
    tutar: { type: "number", description: "Fişteki toplam tutar, sadece sayı" },
    tarih: { type: "string", description: "YYYY-MM-DD formatında tarih" },
    aciklama: { type: "string", description: "Fişin kısa açıklaması (işletme adı / ne alındığı)" },
    kategori: { type: "string", description: "Kısa kategori adı (örn. Kırtasiye, Elektrik, Nakliye)" },
    tur: { type: "string", enum: ["gelir", "gider"], description: "Bu fiş gelir mi gider mi" },
  },
  required: ["tutar", "tarih", "aciklama", "tur"],
} as const;

const FIS_PROMPT =
  "Bu bir fiş veya fatura görseli. İçindeki toplam tutarı, tarihi, kısa bir açıklamayı, " +
  "uygun bir kategoriyi ve bunun bir gelir mi yoksa gider mi olduğunu (fişler genelde gider olur) " +
  "çıkar. Tarihi YYYY-MM-DD formatında ver. Emin olamadığın alanı en makul tahminle doldur.";

export type FisCikarimSonucu = {
  tutar?: number;
  tarih?: string;
  aciklama?: string;
  kategori?: string;
  tur: IslemTuru;
};

export async function fisVerisiCikar(
  ayarlar: YapayZekaAyarlari,
  base64: string,
  mimeType: string
): Promise<FisCikarimSonucu> {
  const cikarim = await jsonUret(ayarlar, FIS_PROMPT, FIS_CIKARIM_SEMASI, { base64, mimeType });

  return {
    tutar: typeof cikarim.tutar === "number" ? cikarim.tutar : undefined,
    tarih: typeof cikarim.tarih === "string" ? cikarim.tarih : undefined,
    aciklama: typeof cikarim.aciklama === "string" ? cikarim.aciklama : undefined,
    kategori: typeof cikarim.kategori === "string" ? cikarim.kategori : undefined,
    tur: cikarim.tur === "gelir" || cikarim.tur === "gider" ? cikarim.tur : "gider",
  };
}
