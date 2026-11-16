import Link from "next/link";
import { redirect } from "next/navigation";
import { sayi, tl } from "@/lib/imece";
import { guncelBirimMaliyetler, karPayi, receteBirimMaliyeti } from "@/lib/maliyet";
import { mevcutRol } from "@/lib/rol";
import { maliyetGorurMu } from "@/lib/roller";
import { ayAdi, donemCoz } from "@/lib/raporlar/tipler";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { yuzde } from "@/lib/uretim";
import type { Recete, ReceteKalemi, StokKarti, UretimPartisi } from "@/types/database";

type Parti = Pick<UretimPartisi, "urun_karti_id" | "uretilen_miktar" | "malzeme_maliyeti">;

export default async function AylikMaliyetPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  if (!maliyetGorurMu(await mevcutRol())) redirect("/uretim");

  const { ay } = await searchParams;
  const bugun = bugunIstanbul();
  const donem = donemCoz(ay, bugun);
  const supabase = await createClient();
  const [{ data: partiVeri }, { data: urunVeri }, { data: receteVeri }, birimMaliyet] = await Promise.all([
    supabase
      .from("uretim_partileri")
      .select("urun_karti_id, uretilen_miktar, malzeme_maliyeti")
      .eq("durum", "tamamlandi")
      .gte("tarih", donem.bas)
      .lte("tarih", donem.son),
    supabase.from("stok_kartlari").select("id, ad, kod, birim, satis_fiyati").in("tur", ["mamul", "yari_mamul"]),
    supabase.from("receteler").select("*, recete_kalemleri(*)"),
    guncelBirimMaliyetler(supabase),
  ]);
  const urun = new Map(
    ((urunVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "satis_fiyati">[]).map((u) => [u.id, u])
  );
  const recete = new Map(
    ((receteVeri ?? []) as (Recete & { recete_kalemleri: ReceteKalemi[] })[]).map((r) => [r.urun_karti_id, r])
  );

  const toplamlar = new Map<string, { parti: number; miktar: number; maliyet: number }>();
  for (const p of (partiVeri ?? []) as Parti[]) {
    const t = toplamlar.get(p.urun_karti_id) ?? { parti: 0, miktar: 0, maliyet: 0 };
    t.parti += 1;
    t.miktar += Number(p.uretilen_miktar ?? 0);
    t.maliyet += Number(p.malzeme_maliyeti ?? 0);
    toplamlar.set(p.urun_karti_id, t);
  }

  const satirlar = [...toplamlar.entries()]
    .map(([id, t]) => {
      const u = urun.get(id);
      const r = recete.get(id);
      const fiili = t.miktar > 0 ? t.maliyet / t.miktar : null;
      const rm = r ? receteBirimMaliyeti(Number(r.cikti_miktari), r.recete_kalemleri, birimMaliyet) : null;
      const fiyat = u?.satis_fiyati != null ? Number(u.satis_fiyati) : null;
      return {
        id,
        u,
        t,
        fiili,
        receteBirim: rm?.birim ?? null,
        receteEksik: rm?.eksik ?? false,
        fark: fiili !== null && rm?.birim ? ((fiili - rm.birim) / rm.birim) * 100 : null,
        fiyat,
        kar: karPayi(fiyat, fiili),
      };
    })
    .sort((a, b) => (a.u?.kod ?? "").localeCompare(b.u?.kod ?? ""));

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Aylık üretim maliyeti</h1>
          <p>{ayAdi(donem.ay)} · tamamlanan partilerin gerçek tartımlarına göre fiili maliyet ve reçeteyle karşılaştırma</p>
        </div>
        <div className="ust-araclar">
          <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="month" name="ay" defaultValue={donem.ay} max={bugun.slice(0, 7)} aria-label="Ay" style={{ minHeight: 38 }} />
            <button type="submit" className="btn btn-cizgi">
              Göster
            </button>
          </form>
          <Link href="/uretim/receteler" className="btn btn-cizgi">
            Reçeteler
          </Link>
        </div>
      </div>

      <div className="kart">
        {satirlar.length === 0 ? (
          <p className="bos">Bu ay tamamlanan parti yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th className="sag">Parti</th>
                  <th className="sag">Üretilen</th>
                  <th className="sag">Fiili maliyet (birim)</th>
                  <th className="sag">Reçete maliyeti (birim)</th>
                  <th className="sag">Fark</th>
                  <th className="sag">Liste fiyatı</th>
                  <th className="sag">Fiili kâr oranı</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => (
                  <tr key={s.id}>
                    <td className="liste-baslik">
                      <b>{s.u?.ad}</b>
                    </td>
                    <td data-label="Parti" className="sag num">
                      {s.t.parti}
                    </td>
                    <td data-label="Üretilen" className="sag num">
                      {sayi(s.t.miktar)} {s.u?.birim}
                    </td>
                    <td data-label="Fiili maliyet" className="sag num ana-deger">
                      {s.fiili !== null ? tl(s.fiili) : ""}
                    </td>
                    <td data-label="Reçete maliyeti" className="sag num">
                      {s.receteBirim !== null ? `${tl(s.receteBirim)}${s.receteEksik ? " *" : ""}` : "reçete yok"}
                    </td>
                    <td data-label="Fark" className={`sag num${s.fark !== null && s.fark > 0 ? " amber" : ""}`}>
                      {s.fark !== null ? `${s.fark > 0 ? "+" : ""}${yuzde(s.fark, 1)}` : ""}
                    </td>
                    <td data-label="Liste fiyatı" className="sag num">
                      {s.fiyat !== null ? tl(s.fiyat) : "girilmemiş"}
                    </td>
                    <td data-label="Fiili kâr oranı" className={`sag num${s.kar !== null && s.kar < 0 ? " kirmizi" : ""}`}>
                      {yuzde(s.kar, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="not">
        Yalnız malzeme ve ambalaj; işçilik ve genel gider hariç. <b>Fiili maliyet</b>: o ay tamamlanan partilerde tartılan
        malzemelerin, tartıldığı günkü maliyetiyle toplamı ÷ paketlenen miktar. <b>Reçete maliyeti</b>: reçetedeki miktarların
        bugünkü malzeme fiyatıyla hesabı (alış kaydı olmayan malzemede stok kartındaki fiyat). Bu yüzden fark hem fazla/eksik kullanımı hem de o aydan bu yana fiyat değişimini
        içerir. Pozitif fark = reçeteden pahalıya mal olmuş. * Fiyatı bilinmeyen malzeme var, reçete maliyeti eksik.
      </p>
    </>
  );
}
