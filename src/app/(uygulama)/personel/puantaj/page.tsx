import Link from "next/link";
import { PuantajTablosu } from "@/components/personel/PuantajTablosu";
import { ayAdi } from "@/lib/raporlar/tipler";
import { DURUM_ADI, MAAS_YETKI_NOTU, ayKaydir, ayinGunleri } from "@/lib/personel";
import { mevcutRol } from "@/lib/rol";
import { maasGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { Personel, PersonelEkOdemesi, PersonelUcreti, PuantajGunu } from "@/types/database";

export default async function PuantajPage({ searchParams }: { searchParams: Promise<{ ay?: string; p?: string }> }) {
  const rol = await mevcutRol();
  if (!maasGorurMu(rol)) {
    return (
      <div className="kart kart-ic">
        <p className="not">{MAAS_YETKI_NOTU}</p>
      </div>
    );
  }
  const q = await searchParams;
  const ay = q.ay && /^\d{4}-\d{2}$/.test(q.ay) ? q.ay : bugunIstanbul().slice(0, 7);
  const ayBas = `${ay}-01`;
  const ayaGore = (hedef: string) => `/personel/puantaj?ay=${hedef}${q.p ? `&p=${q.p}` : ""}`;

  const supabase = await createClient();
  const { data: pv } = await supabase.from("personeller").select("*").order("ad_soyad");
  const tumu = (pv ?? []) as Personel[];
  // Ayrılanlar yalnız ayrıldığı aya kadar listede kalır.
  const personeller = tumu.filter((p) => p.durum !== "ayrildi" || (p.ayrilis ?? "") >= ayBas);
  const secili = personeller.find((p) => p.id === q.p) ?? null;

  let icerik: React.ReactNode = <p className="bos">Puantajını girmek istediğiniz kişiyi yukarıdan seçin.</p>;
  if (secili) {
    const sonGun = ayinGunleri(ay).at(-1)!;
    const [{ data: uv }, { data: ev }, { data: gv }] = await Promise.all([
      supabase.from("personel_ucretleri").select("*").eq("personel_id", secili.id),
      supabase.from("personel_ek_odemeleri").select("*").eq("personel_id", secili.id),
      supabase.from("puantaj").select("*").eq("personel_id", secili.id).gte("tarih", ayBas).lte("tarih", sonGun),
    ]);
    icerik = (
      <PuantajTablosu
        key={`${secili.id}-${ay}`}
        personelId={secili.id}
        ay={ay}
        ucretler={(uv ?? []) as PersonelUcreti[]}
        ekler={(ev ?? []) as PersonelEkOdemesi[]}
        gunler={(gv ?? []) as PuantajGunu[]}
      />
    );
  }

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Puantaj · {ayAdi(ay)}</h1>
          <p>
            Her güne çalıştığı gün sayısını (günlük ücretli) ya da saati (saatlik ücretli) yazın. Fazla mesaili güne 2, yarım güne 0,5.
            Resmi tatil ücretli ise o güne 1, ücretsiz ise 0 yazın ve türünü seçin.
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={ayaGore(ayKaydir(ay, -1))} className="btn btn-cizgi" aria-label="Önceki ay">
            ‹
          </Link>
          <Link href={ayaGore(ayKaydir(ay, 1))} className="btn btn-cizgi" aria-label="Sonraki ay">
            ›
          </Link>
          <Link href={`/personel/ozet?ay=${ay}`} className="btn btn-cizgi">
            Aylık özet
          </Link>
          <Link href="/personel" className="btn btn-cizgi">
            ← Personel
          </Link>
        </div>
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-ic" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {personeller.length === 0 && <span className="soluk">Önce Personel sayfasından personel ekleyin.</span>}
          {personeller.map((p) => (
            <Link
              key={p.id}
              href={`/personel/puantaj?ay=${ay}&p=${p.id}`}
              className={`btn ${p.id === secili?.id ? "btn-ana" : "btn-cizgi"}`}
              title={DURUM_ADI[p.durum]}
            >
              {p.ad_soyad}
              {p.durum !== "calisiyor" && <span className="soluk"> ({DURUM_ADI[p.durum].toLocaleLowerCase("tr")})</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className="kart">
        {secili && (
          <div className="kart-bas">
            <h2>
              <Link href={`/personel/${secili.id}`}>{secili.ad_soyad}</Link>
            </h2>
          </div>
        )}
        {icerik}
      </div>
    </>
  );
}
