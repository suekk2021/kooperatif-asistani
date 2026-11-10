import Link from "next/link";
import { YeniPartiFormu } from "@/components/uretim/UretimFormlari";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { partiSuresiDk, saatTR, sureYazisi, uretimFiresi, yuzde } from "@/lib/uretim";
import type { StokKarti, UretimPartisi } from "@/types/database";

export default async function UretimPage() {
  const supabase = await createClient();
  const [{ data: partiVeri }, { data: urunVeri }, rol] = await Promise.all([
    supabase.from("uretim_partileri").select("*").order("parti_no", { ascending: false }).limit(100),
    supabase
      .from("stok_kartlari")
      .select("id, ad, kod, birim, satis_fiyati")
      .in("tur", ["mamul", "yari_mamul"])
      .eq("aktif", true)
      .is("birlestirildigi_kart", null)
      .order("ad"),
    mevcutRol(),
  ]);
  const partiler = (partiVeri ?? []) as UretimPartisi[];
  const urunler = (urunVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "satis_fiyati">[];
  const urun = new Map(urunler.map((u) => [u.id, u]));
  const acik = partiler.filter((p) => p.durum === "acik");
  const biten = partiler.filter((p) => p.durum !== "acik");
  const yazabilir = duzenlemeYetkisiVarMi(rol);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Üretim</h1>
          <p>Parti kaydı tesiste telefondan girilir: başlat → malzemeleri tart → bitir</p>
        </div>
        <div className="ust-araclar">
          <Link href="/uretim/receteler" className="btn btn-cizgi">
            Reçeteler
          </Link>
        </div>
      </div>

      {yazabilir &&
        (urunler.length ? (
          <YeniPartiFormu urunler={urunler} />
        ) : (
          <div className="yapim" style={{ marginBottom: 16 }}>
            <h2>Önce ürün kartı açın</h2>
            <p className="soluk" style={{ margin: 0 }}>
              <Link href="/stok?tur=mamul">Stok → Ürün (mamul)</Link> türünde kart açın: Su böreği, İçli köfte…
            </p>
          </div>
        ))}

      {acik.length > 0 && (
        <div className="izgara g3" style={{ marginBottom: 16 }}>
          {acik.map((p) => (
            <Link key={p.id} href={`/uretim/${p.id}`} className="kart kart-ic" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <b>
                  {urun.get(p.urun_karti_id)?.ad} · #{p.parti_no}
                </b>
                <span className="etk e-mavi">Devam ediyor</span>
              </div>
              <p className="soluk" style={{ margin: "8px 0 0", fontSize: 13 }}>
                {p.sorumlu ? `${p.sorumlu} · ` : ""}başladı {saatTR(p.baslangic)} · {sureYazisi(partiSuresiDk(p))}
              </p>
              <span className="btn btn-ana" style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
                Partiye devam et ›
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="kart">
        <div className="kart-bas">
          <h2>Partiler</h2>
          <span className="soluk">{biten.length} parti</span>
        </div>
        {biten.length === 0 ? (
          <p className="bos">Henüz biten parti yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Parti</th>
                  <th>Tarih</th>
                  <th>Sorumlu</th>
                  <th className="sag">Paketlenen</th>
                  <th className="sag">Fire</th>
                  <th className="sag">Süre</th>
                  <th className="sag">Birim maliyet</th>
                </tr>
              </thead>
              <tbody>
                {biten.map((p) => {
                  const u = urun.get(p.urun_karti_id);
                  const fire = uretimFiresi(p);
                  return (
                    <tr key={p.id} style={p.durum === "iptal" ? { opacity: 0.55 } : undefined}>
                      <td className="liste-baslik">
                        <Link className="satir-link" href={`/uretim/${p.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                          #{p.parti_no} · {u?.ad}
                        </Link>
                        {p.durum === "iptal" && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                      </td>
                      <td data-label="Tarih" className="num">
                        {tarihTR(p.tarih)}
                      </td>
                      <td data-label="Sorumlu">{p.sorumlu}</td>
                      <td data-label="Paketlenen" className="sag num ana-deger">
                        {p.uretilen_miktar !== null ? `${sayi(p.uretilen_miktar)} ${u?.birim ?? ""}` : ""}
                      </td>
                      <td data-label="Fire" className={`sag num${fire !== null && fire >= 5 ? " amber" : ""}`}>
                        {yuzde(fire)}
                      </td>
                      <td data-label="Süre" className="sag num">
                        {p.bitis ? sureYazisi(partiSuresiDk(p)) : ""}
                      </td>
                      <td data-label="Birim maliyet" className="sag num">
                        {p.birim_maliyet !== null ? tl(p.birim_maliyet) : ""}
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
        Birim maliyet şimdilik sadece malzeme ve ambalajı içerir. İşçilik, elektrik, soğuk oda gibi genel giderler ay sonunda
        o ayın üretimine dağıtılacak (Raporlar adımı).
      </p>
    </>
  );
}
