import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { OcrSaglayici } from "@/types/database";

export type MedyaParcasi = { base64: string; mimeType: string };

export type YapayZekaAyarlari = {
  saglayici: OcrSaglayici;
  apiKey: string;
};

/**
 * Verilen prompt (+ opsiyonel gorsel/ses) icin JSON semasina uyan bir yanit uretir.
 * Hem Gemini hem OpenAI icin ayni arayuzu saglar - OCR ve Telegram asistani ortak kullanir.
 */
export async function jsonUret(
  ayarlar: YapayZekaAyarlari,
  prompt: string,
  sema: Record<string, unknown>,
  medya?: MedyaParcasi
): Promise<Record<string, unknown>> {
  if (ayarlar.saglayici === "gemini") {
    const ai = new GoogleGenAI({ apiKey: ayarlar.apiKey });
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];
    if (medya) parts.push({ inlineData: { data: medya.base64, mimeType: medya.mimeType } });
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: { responseMimeType: "application/json", responseSchema: sema },
    });

    const metin = response.text;
    if (!metin) throw new Error("Gemini boş yanıt döndürdü.");
    return JSON.parse(metin);
  }

  // OpenAI: ses girisi desteklenmiyor, sadece metin/gorsel. Ses icin once Whisper ile
  // metne cevrilip buraya duz metin olarak gonderilmeli (bkz. telegram-webhook route'u).
  const client = new OpenAI({ apiKey: ayarlar.apiKey });
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: prompt }];
  if (medya) {
    content.push({ type: "image_url", image_url: { url: `data:${medya.mimeType};base64,${medya.base64}` } });
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content }],
    response_format: {
      type: "json_schema",
      json_schema: { name: "cikarim", schema: sema, strict: true },
    },
  });

  const metin = response.choices[0]?.message?.content;
  if (!metin) throw new Error("OpenAI boş yanıt döndürdü.");
  return JSON.parse(metin);
}

/**
 * Bir API anahtarinin gercekten calisip calismadigini, ucuz/kucuk bir gercek istekle test eder.
 * Ayarlar formunda "kaydedildi" gorunup aslinda gecersiz olan anahtarlari (ör. yanlislikla
 * yapistirilmis baska bir sifre) kaydetmeden once yakalamak icin kullanilir.
 */
export async function anahtarGecerliMi(
  saglayici: OcrSaglayici,
  apiKey: string
): Promise<{ gecerli: boolean; mesaj?: string }> {
  try {
    if (saglayici === "gemini") {
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "merhaba" }] }],
      });
      return { gecerli: true };
    }

    const client = new OpenAI({ apiKey });
    await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "merhaba" }],
      max_tokens: 5,
    });
    return { gecerli: true };
  } catch (e) {
    return { gecerli: false, mesaj: e instanceof Error ? e.message : "bilinmeyen hata" };
  }
}

/** Sadece ses -> metin (OpenAI icin Whisper; Gemini ses anlama zaten jsonUret icinde dogrudan yapilabiliyor). */
export async function sesiMetneCevir(apiKey: string, base64: string, mimeType: string): Promise<string> {
  const client = new OpenAI({ apiKey });
  const buffer = Buffer.from(base64, "base64");
  const dosyaAdi = mimeType.includes("ogg") ? "ses.ogg" : "ses.mp3";
  const dosya = new File([buffer], dosyaAdi, { type: mimeType });

  const sonuc = await client.audio.transcriptions.create({
    file: dosya,
    model: "whisper-1",
    language: "tr",
  });

  return sonuc.text;
}
