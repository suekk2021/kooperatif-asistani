import Link from "next/link";
import { YeniStokKartiFormu } from "@/components/stok/YeniStokKartiFormu";
import { STOK_TURLERI, STOK_TURU_ADI, sayi, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Depo, KdvOrani, StokDurumu, StokKarti, StokTuru } from "@/types/database";

export default async function StokPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; pasif?: string }>;
}) {
  const { tur: turParam, pasif } = await searchParams;
  const pasifler = pasif === "1";
  const secili = STOK_TURLERI.includes(turParam as StokTuru) ? (turParam as StokTuru) : null;

  const supabase = await createClient();
  const [{ data: kartlar }, { data: depolar }, { data: kdv }, { data: durumVeri }, rol] = await Promise.all([
    supabase.from("stok_kartlari").select("*").eq("aktif", !pasifler).is("birlestirildigi_kart", null).order("kod"),
    supabase.from("depolar").select("*").eq("aktif", true).order("id"),
    supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
    supabase.from("stok_durumu").select("*"),
    mevcutRol(),
  ]);
  const tumu = (kartlar ?? []) as StokKarti[];
  const liste = secili ? tumu.filter((k) => k.tur === secili) : tumu;
  const depoAdi = new Map(((depolar ?? []) as Depo[]).map((d) => [d.id, d.ad]));
  const durum = new Map(((durumVeri ?? []) as StokDurumu[]).map((d) => [d.stok_karti_id, d]));
  const toplamDeger = liste.reduce((t, k) => t + Number(durum.get(k.id)?.deger ?? 0), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Stok</h1>
          <p>Hammadde, ambalaj ve ürün kartları. Miktar ve değer alış, üretim, satış ve sayımdan otomatik hesaplanır.</p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok/sayim" className="btn btn-cizgi">
            Sayım yap
          </Link>
        </div>
      </div>

      <div className="sekmeler">
        <Link href="/stok" className={!secili ? "aktif" : undefined}>
          Tümü <small>{tumu.length}</small>
        </Link>
        {STOK_TURLERI.map((t) => (
          <Link key={t} href={`/stok?tur=${t}`} className={secili === t ? "aktif" : undefined}>
            {STOK_TURU_ADI[t]} <small>{tumu.filter((k) => k.tur === t).length}</small>
          </Link>
        ))}
        <Link href={pasifler ? "/stok" : "/stok?pasif=1"} className={pasifler ? "aktif" : undefined} style={{ marginLeft: "auto" }}>
          {pasifler ? "← Aktif kartlar" : "Pasif kartlar"}
        </Link>
      </div>

      {duzenlemeYetkisiVarMi(rol) && !pasifler && (
        <YeniStokKartiFormu
          key={secili ?? "tumu"}
          varsayilanTur={secili ?? "hammadde"}
          depolar={(depolar ?? []) as Depo[]}
          kdvOranlari={(kdv ?? []) as KdvOrani[]}
          mevcutAdlar={tumu.map((k) => k.ad)}
        />
      )}

      <div className="kart">
        <div className="kart-bas">
          <h2>Stok kartları</h2>
          <span className="soluk num">
            {liste.length} kart · değer <b>{tl(toplamDeger)}</b>
          </span>
        </div>
        {liste.length === 0 ? (
          <p className="bos">Bu grupta henüz kart yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Kod</th>
                  <th>Tür</th>
                  <th>Depo</th>
                  <th className="sag">KDV</th>
                  <th className="sag">Asgari</th>
                  <th className="sag">Miktar</th>
                  <th className="sag">Ort. maliyet</th>
                  <th className="sag">Değer</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => {
                  const d = durum.get(k.id);
                  const miktar = Number(d?.miktar ?? 0);
                  const azaldi = k.min_stok !== null && miktar < Number(k.min_stok);
                  return (
                  <tr key={k.id}>
                    <td>
                      <Link href={`/stok/${k.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {k.ad}
                      </Link>
                    </td>
                    <td data-label="Kod">
                      <span className="kod">{k.kod}</span>
                    </td>
                    <td data-label="Tür">{STOK_TURU_ADI[k.tur]}</td>
                    <td data-label="Depo">{k.depo_id ? depoAdi.get(k.depo_id) : ""}</td>
                    <td data-label="KDV" className="sag num">
                      %{Number(k.kdv_orani)}
                    </td>
                    <td data-label="Asgari" className="sag num">
                      {k.min_stok !== null ? `${sayi(k.min_stok)} ${k.birim}` : ""}
                    </td>
                    <td data-label="Miktar" className="sag num">
                      <b className={miktar < 0 || azaldi ? "kirmizi" : undefined}>
                        {sayi(miktar)} {k.birim}
                      </b>
                      {azaldi && <div className="kirmizi" style={{ fontSize: 12 }}>asgarinin altında</div>}
                    </td>
                    <td data-label="Ort. maliyet" className="sag num">
                      {miktar > 0 ? tl(d?.ortalama_maliyet) : ""}
                    </td>
                    <td data-label="Değer" className="sag num">
                      {tl(d?.deger)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="not">
        Miktar ve değer alış kayıtlarından hesaplanır (ortalama maliyet yöntemi). Üretim ve satış modülleri gelince çıkışlar da
        düşecek. Programdan önceki depo mevcudu ilk sayımla girilecek.
      </p>
    </>
  );
}
