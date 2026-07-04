import { createClient } from "@/lib/supabase/server";
import { ayarDurumuGetir } from "@/app/actions/ayarlar";
import { kullanicilariGetir } from "@/app/actions/kullanicilar";
import { AyarlarFormu } from "@/components/AyarlarFormu";
import { KullanicilarYonetimi } from "@/components/KullanicilarYonetimi";

export default async function AyarlarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiller")
    .select("rol")
    .eq("id", user?.id ?? "")
    .single();

  const durum = await ayarDurumuGetir();
  const kullanicilar = await kullanicilariGetir();
  const buradaBaskanMi = profil?.rol === "baskan";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-1 text-lg font-semibold text-ink">Ayarlar</h1>
        <p className="mb-4 text-sm text-ink-soft">
          Fiş okuma (OCR) sağlayıcısı, Telegram bildirimi ve kullanıcı yönetimi.
        </p>
        <div className="rounded-xl border border-line bg-card p-6">
          <AyarlarFormu
            mevcutSaglayici={durum.ocrSaglayici}
            geminiAnahtarVar={durum.geminiAnahtarVar}
            openaiAnahtarVar={durum.openaiAnahtarVar}
            telegramChatIdler={durum.telegramChatIdler}
            muhasebeciEmail={durum.muhasebeciEmail}
            kurumAdi={durum.kurumAdi}
            logoUrl={durum.logoUrl}
            asistanPromptu={durum.asistanPromptu}
            baskanMi={buradaBaskanMi}
          />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-6">
        <KullanicilarYonetimi
          kullanicilar={kullanicilar}
          kendiId={user?.id ?? ""}
          baskanMi={buradaBaskanMi}
        />
      </div>
    </div>
  );
}
