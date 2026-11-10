import Link from "next/link";
import { tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { AlisFaturasi, Cari, KasaBankaHesabi } from "@/types/database";

export default async function AlisPage() {
  const supabase = await createClient();
  const [{ data: faturaVeri }, { data: cariVeri }, { data: hesapVeri }, rol] = await Promise.all([
    supabase.from("alis_faturalari").select("*").order("tarih", { ascending: false }).order("created_at", { ascending: false }).limit(100),
    supabase.from("cariler").select("id, unvan").eq("tur", "tedarikci"),
    supabase.from("kasa_banka_hesaplari").select("id, ad"),
    mevcutRol(),
  ]);
  const faturalar = (faturaVeri ?? []) as AlisFaturasi[];
  const cariAdi = new Map(((cariVeri ?? []) as Pick<Cari, "id" | "unvan">[]).map((c) => [c.id, c.unvan]));
  const hesapAdi = new Map(((hesapVeri ?? []) as Pick<KasaBankaHesabi, "id" | "ad">[]).map((h) => [h.id, h.ad]));
  const kayitli = faturalar.filter((f) => f.durum === "kayitli");
  const veresiyeToplam = kayitli.filter((f) => !f.odeme_hesap_id).reduce((t, f) => t + Number(f.genel_toplam), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Alış</h1>
          <p>Tedarikçiden gelen mal ve gider faturaları</p>
        </div>
        {duzenlemeYetkisiVarMi(rol) && (
          <div className="ust-araclar">
            <Link href="/alis/yeni" className="btn btn-ana">
              + Yeni alış
            </Link>
          </div>
        )}
      </div>

      <div className="kart">
        <div className="kart-bas">
          <h2>Faturalar</h2>
          <span className="soluk num">
            {kayitli.length} fatura · veresiye {tl(veresiyeToplam)}
          </span>
        </div>
        {faturalar.length === 0 ? (
          <p className="bos">Henüz alış faturası yok. &quot;+ Yeni alış&quot; ile ilkini girin.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Tedarikçi</th>
                  <th>Tarih</th>
                  <th>Fatura no</th>
                  <th>Ödeme</th>
                  <th>Vade</th>
                  <th className="sag">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {faturalar.map((f) => (
                  <tr key={f.id} style={f.durum === "iptal" ? { opacity: 0.55 } : undefined}>
                    <td className="liste-baslik">
                      <Link className="satir-link" href={`/alis/${f.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {cariAdi.get(f.cari_id)}
                      </Link>
                      {f.durum === "iptal" && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                    </td>
                    <td data-label="Tarih" className="num">
                      {tarihTR(f.tarih)}
                    </td>
                    <td data-label="Fatura no">
                      <Link href={`/alis/${f.id}`}>{f.belge_no}</Link>
                    </td>
                    <td data-label="Ödeme">
                      {f.odeme_hesap_id ? (
                        <span className="etk e-yesil">{hesapAdi.get(f.odeme_hesap_id)}</span>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
