"use client";

import { useActionState, useState } from "react";
import { ayarKaydet, type AyarlarSonuc } from "@/app/actions/ayarlar";
import type { OcrSaglayici } from "@/types/database";

const bosSonuc: AyarlarSonuc = {};

export function AyarlarFormu({
  mevcutSaglayici,
  geminiAnahtarVar,
  openaiAnahtarVar,
  telegramChatIdler,
  muhasebeciEmail,
  kurumAdi,
  logoUrl,
  asistanPromptu,
  baskanMi,
}: {
  mevcutSaglayici: OcrSaglayici;
  geminiAnahtarVar: boolean;
  openaiAnahtarVar: boolean;
  telegramChatIdler: string;
  muhasebeciEmail: string;
  kurumAdi: string;
  logoUrl: string | null;
  asistanPromptu: string;
  baskanMi: boolean;
}) {
  const [saglayici, setSaglayici] = useState<OcrSaglayici>(mevcutSaglayici);
  const [sonuc, action, bekliyor] = useActionState(
    async (_onceki: AyarlarSonuc, formData: FormData) => ayarKaydet(formData),
    bosSonuc
  );

  // Kayit basarili olup sunucudan guncel deger geldiginde ekrani onunla senkronla -
  // aksi halde form, az once kaydedilen degeri degil eski state'i gostermeye devam eder.
  const [oncekiMevcutSaglayici, setOncekiMevcutSaglayici] = useState(mevcutSaglayici);
  if (mevcutSaglayici !== oncekiMevcutSaglayici) {
    setOncekiMevcutSaglayici(mevcutSaglayici);
    setSaglayici(mevcutSaglayici);
  }

  if (!baskanMi) {
    return (
      <p className="text-sm text-ink-soft">
        Bu ayarları sadece Başkan değiştirebilir. Şu an kullanılan OCR sağlayıcısı:{" "}
        <strong>{mevcutSaglayici === "gemini" ? "Google Gemini" : "OpenAI"}</strong>.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">Kurum Kimliği</p>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ayarlar formunda hemen onizleme icin yeterli
            <img src={logoUrl} alt={kurumAdi} className="h-14 w-14 rounded-full border border-line object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-paper text-2xl">
              🧺
            </div>
          )}
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-ink-soft">Logo (değiştirmek için seç)</label>
            <input
              name="logo"
              type="file"
              accept="image/*"
              className="w-full text-xs text-ink-soft"
            />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-ink-soft">Kooperatif Adı</label>
          <input
            name="kurum_adi"
            defaultValue={kurumAdi}
            className="w-full rounded-md border border-line px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">Fiş okuma için hangi model kullanılsın?</p>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ocr_saglayici"
              value="gemini"
              checked={saglayici === "gemini"}
              onChange={() => setSaglayici("gemini")}
            />
            Google Gemini {geminiAnahtarVar && <span className="text-income">(anahtar kayıtlı)</span>}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="ocr_saglayici"
              value="openai"
              checked={saglayici === "openai"}
              onChange={() => setSaglayici("openai")}
            />
            OpenAI {openaiAnahtarVar && <span className="text-income">(anahtar kayıtlı)</span>}
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-ink-soft">Gemini API Anahtarı</label>
        <input
          name="gemini_api_key"
          type="password"
          placeholder={geminiAnahtarVar ? "•••••••• (değiştirmek için yeni değer gir)" : "AIza... veya AQ...."}
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
        {geminiAnahtarVar && (
          <label className="flex items-center gap-2 pt-1 text-xs text-ink-soft">
            <input type="checkbox" name="gemini_api_key_sil" value="1" />
            Kayıtlı Gemini anahtarını sil
          </label>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-ink-soft">OpenAI API Anahtarı</label>
        <input
          name="openai_api_key"
          type="password"
          placeholder={openaiAnahtarVar ? "•••••••• (değiştirmek için yeni değer gir)" : "sk-..."}
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
        {openaiAnahtarVar && (
          <label className="flex items-center gap-2 pt-1 text-xs text-ink-soft">
            <input type="checkbox" name="openai_api_key_sil" value="1" />
            Kayıtlı OpenAI anahtarını sil
          </label>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">Telegram Bildirimi</p>
        <p className="mb-3 text-xs text-ink-soft">
          Hatırlatıcı günü geldiğinde ve &quot;özet&quot; yazınca bilgi alacak kişilerin Telegram Chat ID&apos;leri.
          Her satıra bir kişi yaz, opsiyonel olarak isim etiketiyle (<code>chat_id:İsim</code>) — hepsi bota kendi
          Telegram&apos;ından yazabilir, isim etiketi verilirse o kişinin eklediği kayıtlarda (fiş, hatırlatıcı, not)
          kim tarafından eklendiği görünür.
        </p>
        <textarea
          name="telegram_chat_id"
          rows={3}
          defaultValue={telegramChatIdler}
          placeholder={"123456789:Başkan Eyüp\n987654321:Ön Muhasebe Ayşe"}
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">Asistan Kişiliği (opsiyonel)</p>
        <p className="mb-3 text-xs text-ink-soft">
          Telegram asistanının nasıl davranmasını istediğinizi buraya yazın (ör. &quot;daha resmi konuş&quot;,
          &quot;kısa cevaplar ver&quot;, &quot;şu konularda da bilgi ver&quot;). Boş bırakılırsa varsayılan üslup kullanılır.
        </p>
        <textarea
          name="asistan_promptu"
          rows={3}
          defaultValue={asistanPromptu}
          placeholder="Örn: Cevaplarında daha resmi bir dil kullan, kısa ve öz konuş."
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-medium text-ink-soft">Mali Müşavir</p>
        <p className="mb-3 text-xs text-ink-soft">
          Aylık rapor hazır olduğunda gönderileceği e-posta adresi (rapor formatı netleşince aktif olacak).
        </p>
        <input
          name="muhasebeci_email"
          type="email"
          defaultValue={muhasebeciEmail}
          placeholder="muhasebeci@ornek.com"
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={bekliyor}
        className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
      >
        {bekliyor ? "Kaydediliyor..." : "Kaydet"}
      </button>

      {sonuc.hata && <p className="rounded-md bg-expense/10 px-3 py-2 text-sm text-expense">{sonuc.hata}</p>}
      {sonuc.basarili && (
        <p className="rounded-md bg-income/10 px-3 py-2 text-sm text-income">{sonuc.basarili}</p>
      )}
    </form>
  );
}
