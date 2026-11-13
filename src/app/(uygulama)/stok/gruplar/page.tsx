import Link from "next/link";
import { StokGrubuSatiri, YeniStokGrubuFormu } from "@/components/stok/StokGrubuFormlari";
import { ANA_GRUPLAR, STOK_TURU_ADI } from "@/lib/imece";
import { mevcutRol } from "@/lib/rol";
import { stokGrubuYetkiliMi } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import type { StokGrubu, StokKarti } from "@/types/database";

export default async function StokGruplariPage() {
  const supabase = await createClient();
  const [{ data: grupVeri }, { data: kartVeri }, rol] = await Promise.all([
    supabase.from("stok_gruplari").select("*").order("ana_kod").order("grup_kodu"),
    supabase.from("stok_kartlari").select("grup_id").is("birlestirildigi_kart", null),
    mevcutRol(),
  ]);
  const gruplar = (grupVeri ?? []) as StokGrubu[];
  const kartSayisi = new Map<string, number>();
  for (const k of (kartVeri ?? []) as Pick<StokKarti, "grup_id">[]) {
    kartSayisi.set(k.grup_id, (kartSayisi.get(k.grup_id) ?? 0) + 1);
  }
  const yetkili = stokGrubuYetkiliMi(rol);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Stok grupları</h1>
          <p>
            Stok kodu = ana grup + alt grup + kart sırası (örn. <span className="kod">15010003</span>: 150 ana grup, 10 alt grup,
            003 kart). Kart açarken grup seçilir; kart o grubun türünde olur.
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok" className="btn btn-cizgi">
            ← Stok
          </Link>
        </div>
      </div>

      {yetkili ? (
        <YeniStokGrubuFormu mevcut={gruplar} />
      ) : (
        <p className="not">Grup ekleme ve düzenleme yalnız operasyon yöneticisi ve bilgi işlem yetkisindedir.</p>
      )}

      {ANA_GRUPLAR.map((a) => {
        const liste = gruplar.filter((g) => g.ana_kod === a.kod);
        return (
          <div className="kart" key={a.kod} style={{ marginBottom: 16 }}>
            <div className="kart-bas">
              <h2>
                {a.kod} · {a.ad}
              </h2>
              <span className="soluk num">{liste.length} grup</span>
            </div>
            {liste.length === 0 ? (
              <p className="bos">Bu ana grupta henüz alt grup yok.</p>
            ) : (
              <div className="tablo-kutu">
                <table className="kart-tablo">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th colSpan={4}>Grup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map((g) =>
                      yetkili ? (
                        <StokGrubuSatiri key={g.id} grup={g} kartSayisi={kartSayisi.get(g.id) ?? 0} />
                      ) : (
                        <tr key={g.id}>
                          <td>
                            <span className="kod">
                              {g.ana_kod}
                              {g.grup_kodu}
                            </span>
                          </td>
                          <td>
                            {g.ad}
                            {!g.aktif && <span className="soluk"> (kapalı)</span>}
                          </td>
                          <td>{STOK_TURU_ADI[g.tur]}</td>
                          <td className="sag num">{kartSayisi.get(g.id) ?? 0} kart</td>
                          <td />
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
