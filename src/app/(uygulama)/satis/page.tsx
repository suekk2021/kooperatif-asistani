import Link from "next/link";
import { tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Cari, KasaBankaHesabi, SatisFaturasi } from "@/types/database";

export default async function SatisPage() {
  const supabase = await createClient();
  const [{ data: faturaVeri }, { data: cariVeri }, { data: hesapVeri }, rol] = await Promise.all([
    supabase.from("satis_faturalari").select("*").order("tarih", { ascending: false }).order("satis_no", { ascending: false }).limit(100),
    supabase.from("cariler").select("id, unvan").eq("tur", "musteri"),
    supabase.from("kasa_banka_hesaplari").select("id, ad, tur"),
    mevcutRol(),
  ]);
  const faturalar = (faturaVeri ?? []) as SatisFaturasi[];
  const cariAdi = new Map(((cariVeri ?? []) as Pick<Cari, "id" | "unvan">[]).map((c) => [c.id, c.unvan]));
  const hesap = new Map(((hesapVeri ?? []) as Pick<KasaBankaHesabi, "id" | "ad" | "tur">[]).map((h) => [h.id, h]));
  const kayitli = faturalar.filter((f) => f.durum === "kayitli");
  const ciro = kayitli.reduce((t, f) => t + Number(f.ara_toplam), 0);
  const maliyet = kayitli.reduce((t, f) => t + Number(f.maliyet_toplam), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Satış</h1>
          <p>Müşteriye ürün çıkışı — stok, alacak, KDV ve maliyet tek kayıtla</p>
        </div>
        {duzenlemeYetkisiVarMi(rol) && (
          <div className="ust-araclar">
            <Link href="/satis/yeni" className="btn btn-ana">
              + Yeni satış
            </Link>
          </div>
        )}
      </div>

      <div className="kart">
        <div className="kart-bas">
          <h2>Satışlar</h2>
          <span className="soluk num">
            {kayitli.length} satış · ciro {tl(ciro)} (KDV hariç)
            {maliyet > 0 && ` · maliyet ${tl(maliyet)}`}
          </span>
        </div>
        {faturalar.length === 0 ? (
          <p className="bos">Henüz satış yok. &quot;+ Yeni satış&quot; ile ilkini girin.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Müşteri</th>
                  <th>No</th>
                  <th>Tarih</th>
                  <th>Ödeme</th>
                  <th>Vade</th>
                  <th className="sag">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {faturalar.map((f) => {
                  const h = f.odeme_hesap_id ? hesap.get(f.odeme_hesap_id) : undefined;
                  return (
                    <tr key={f.id} style={f.durum === "iptal" ? { opacity: 0.55 } : undefined}>
                      <td className="liste-baslik">
                        <Link className="satir-link" href={`/satis/${f.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                          {cariAdi.get(f.cari_id)}
                        </Link>
                        {f.durum === "iptal" && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                      </td>
                      <td data-label="No">
                        <Link href={`/satis/${f.id}`}>{f.belge_no ?? `SAT-${f.satis_no}`}</Link>
                      </td>
                      <td data-label="Tarih" className="num">
                        {tarihTR(f.tarih)}
                      </td>
                      <td data-label="Ödeme">
                        {h ? (
                          <span className="etk e-yesil">{h.tur === "pos" ? `Kartla · ${h.ad}` : h.ad}</span>
                        ) : (
                          <span className="etk e-amber">Veresiye</span>
                        )}
                      </td>
                      <td data-label="Vade" className="num">
                        {tarihTR(f.vade_tarihi)}
                      </td>
                      <td data-label="Toplam" className="sag num ana-deger">
                        <b>{tl(f.genel_toplam)}</b>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
