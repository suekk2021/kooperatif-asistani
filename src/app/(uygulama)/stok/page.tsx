import Link from "next/link";
import { YeniStokKartiFormu } from "@/components/stok/YeniStokKartiFormu";
import { gorevliDepolar } from "@/lib/depo";
import { STOK_TURLERI, STOK_TURU_ADI, kodGoster, sayi, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { maliyetGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import type { Depo, KdvOrani, StokDepoDurumu, StokDurumu, StokGrubu, StokKarti, StokTuru } from "@/types/database";

export default async function StokPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; pasif?: string; depo?: string }>;
}) {
  const { tur: turParam, pasif, depo: depoParam } = await searchParams;
  const pasifler = pasif === "1";
  const secili = STOK_TURLERI.includes(turParam as StokTuru) ? (turParam as StokTuru) : null;

  const supabase = await createClient();
  const [{ data: kartlar }, { data: depoVeri }, { data: kdv }, { data: durumVeri }, { data: depoDurumVeri }, { data: grupVeri }, rol] = await Promise.all([
    supabase.from("stok_kartlari").select("*").eq("aktif", !pasifler).is("birlestirildigi_kart", null).order("kod"),
    supabase.from("depolar").select("*"),
    supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
    supabase.from("stok_durumu").select("*"),
    supabase.from("stok_depo_durumu").select("*"),
    supabase.from("stok_gruplari").select("*").eq("aktif", true).order("ana_kod").order("grup_kodu"),
    mevcutRol(),
  ]);
  const tumu = (kartlar ?? []) as StokKarti[];
  const depolar = gorevliDepolar((depoVeri ?? []) as Depo[]);
  const seciliDepo = depolar.find((d) => String(d.id) === depoParam) ?? null;
  const depodaki = new Map<string, StokDepoDurumu[]>();
  for (const d of (depoDurumVeri ?? []) as StokDepoDurumu[]) depodaki.set(d.stok_karti_id, [...(depodaki.get(d.stok_karti_id) ?? []), d]);
  const durum = new Map(((durumVeri ?? []) as StokDurumu[]).map((d) => [d.stok_karti_id, d]));
  // Depo seçiliyken miktar ve değer o depodan; kart o depoda hiç hareket görmediyse listede yok
  const deger = (k: StokKarti) => {
    if (!seciliDepo) return { miktar: Number(durum.get(k.id)?.miktar ?? 0), deger: Number(durum.get(k.id)?.deger ?? 0) };
    const d = depodaki.get(k.id)?.find((x) => x.depo_id === seciliDepo.id);
    return d ? { miktar: Number(d.miktar), deger: Number(d.deger) } : null;
  };
  const turuna = secili ? tumu.filter((k) => k.tur === secili) : tumu;
  const liste = seciliDepo ? turuna.filter((k) => deger(k) !== null) : turuna;
  const maliyetGorur = maliyetGorurMu(rol);
  const toplamDeger = liste.reduce((t, k) => t + (deger(k)?.deger ?? 0), 0);
  const adres = (d: { tur?: string | null; depo?: number | null }) => {
    const q = new URLSearchParams();
    if (d.tur) q.set("tur", d.tur);
    if (d.depo) q.set("depo", String(d.depo));
    if (pasifler) q.set("pasif", "1");
    const s = q.toString();
    return s ? `/stok?${s}` : "/stok";
  };

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Stok</h1>
          <p>Hammadde, ambalaj ve ürün kartları. Miktar ve değer alış, üretim, transfer, satış ve sayımdan otomatik hesaplanır.</p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok/transfer" className="btn btn-cizgi">
            Depo transferi
          </Link>
          <Link href="/stok/gruplar" className="btn btn-cizgi">
            Stok grupları
          </Link>
          <Link href="/stok/sayim" className="btn btn-cizgi">
            Sayım yap
          </Link>
        </div>
      </div>

      <div className="sekmeler">
        <Link href={adres({ depo: seciliDepo?.id })} className={!secili ? "aktif" : undefined}>
          Tümü <small>{tumu.length}</small>
        </Link>
        {STOK_TURLERI.map((t) => (
          <Link key={t} href={adres({ tur: t, depo: seciliDepo?.id })} className={secili === t ? "aktif" : undefined}>
            {STOK_TURU_ADI[t]} <small>{tumu.filter((k) => k.tur === t).length}</small>
          </Link>
        ))}
        <Link href={pasifler ? "/stok" : "/stok?pasif=1"} className={pasifler ? "aktif" : undefined} style={{ marginLeft: "auto" }}>
          {pasifler ? "← Aktif kartlar" : "Pasif kartlar"}
        </Link>
      </div>

      {depolar.length > 0 && (
        <div className="secim" style={{ marginBottom: 16 }}>
          <Link href={adres({ tur: secili })} className={!seciliDepo ? "aktif" : undefined}>
            Tüm depolar
          </Link>
          {depolar.map((d) => (
            <Link key={d.id} href={adres({ tur: secili, depo: d.id })} className={seciliDepo?.id === d.id ? "aktif" : undefined}>
              {d.ad}
            </Link>
          ))}
        </div>
      )}

      {duzenlemeYetkisiVarMi(rol) && !pasifler && (
        <YeniStokKartiFormu
          key={secili ?? "tumu"}
          gruplar={((grupVeri ?? []) as StokGrubu[]).filter((g) => !secili || g.tur === secili)}
          kdvOranlari={(kdv ?? []) as KdvOrani[]}
          mevcutAdlar={tumu.map((k) => k.ad)}
        />
      )}

      <div className="kart">
        <div className="kart-bas">
          <h2>{seciliDepo ? `${seciliDepo.ad}daki kartlar` : "Stok kartları"}</h2>
          <span className="soluk num">
            {liste.length} kart{maliyetGorur && <> · değer <b>{tl(toplamDeger)}</b></>}
          </span>
        </div>
        {liste.length === 0 ? (
          <p className="bos">{seciliDepo ? "Bu depoda bu gruptan hiç mal olmadı." : "Bu grupta henüz kart yok."}</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Kod</th>
                  <th>Tür</th>
                  {!seciliDepo && <th>Depolarda</th>}
                  <th className="sag">KDV</th>
                  <th className="sag">Asgari</th>
                  <th className="sag">Miktar</th>
                  {maliyetGorur && <th className="sag">Ort. maliyet</th>}
                  {maliyetGorur && <th className="sag">Değer</th>}
                </tr>
              </thead>
              <tbody>
                {liste.map((k) => {
                  const d = deger(k);
                  const miktar = d?.miktar ?? 0;
                  const dagilim = (depodaki.get(k.id) ?? []).filter((x) => Math.abs(Number(x.miktar)) >= 0.0005);
                  const azaldi = k.min_stok !== null && miktar < Number(k.min_stok);
                  return (
                  <tr key={k.id}>
                    <td className="liste-baslik">
                      <Link className="satir-link" href={`/stok/${k.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {k.ad}
                      </Link>
                    </td>
                    <td data-label="Kod" className="mobil-gizle">
                      <span className="kod">{kodGoster(k.kod)}</span>
                    </td>
                    <td data-label="Tür">{STOK_TURU_ADI[k.tur]}</td>
                    {!seciliDepo && (
                      <td data-label="Depolarda" className="mobil-gizle" style={{ fontSize: 13 }}>
                        {depolar
                          .filter((dp) => dagilim.some((x) => x.depo_id === dp.id))
                          .map((dp) => {
                            const m = Number(dagilim.find((x) => x.depo_id === dp.id)!.miktar);
                            return (
                              <div key={dp.id} className={m < 0 ? "kirmizi" : "soluk"}>
                                {dp.ad.replace(/ depo$/, "")}: {sayi(m)}
                              </div>
                            );
                          })}
                      </td>
                    )}
                    <td data-label="KDV" className="sag num mobil-gizle">
                      %{Number(k.kdv_orani)}
                    </td>
                    <td data-label="Asgari" className="sag num mobil-gizle">
                      {k.min_stok !== null ? `${sayi(k.min_stok)} ${k.birim}` : ""}
                    </td>
                    <td data-label="Miktar" className="sag num ana-deger">
                      <b className={miktar < 0 || azaldi ? "kirmizi" : undefined}>
                        {sayi(miktar)} {k.birim}
                      </b>
                      {azaldi && <div className="kirmizi" style={{ fontSize: 12 }}>asgarinin altında</div>}
                    </td>
                    {maliyetGorur && (
                      <td data-label="Ort. maliyet" className="sag num mobil-gizle">
                        {miktar > 0 ? tl(durum.get(k.id)?.ortalama_maliyet) : ""}
                      </td>
                    )}
                    {maliyetGorur && (
                      <td data-label="Değer" className="sag num">
                        {tl(d?.deger ?? 0)}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="not">
        Alış Hammadde deposuna (ticari mal Mamül deposuna) girer; üretimde malzeme Üretim deposundan düşer, ürün Mamül deposuna
        girer; satış Mamül deposundan çıkar. Hammaddeyi üretime vermek için Depo transferi kullanılır. Değer ortalama maliyetle
        hesaplanır.
      </p>
    </>
  );
}
