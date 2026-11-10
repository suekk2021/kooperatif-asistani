import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { oturum, iptalEdebilir, IPTAL_YETKI_NOTU } from "@/lib/yetki";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { AlisFaturasi, AlisKalemi, Cari, KasaBankaHesabi, ParaHareketi, StokKarti, YevmiyeSatiri } from "@/types/database";

export default async function AlisDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: faturaVeri } = await supabase.from("alis_faturalari").select("*").eq("id", id).maybeSingle();
  if (!faturaVeri) notFound();
  const f = faturaVeri as AlisFaturasi;

  const [{ data: kalemVeri }, { data: cariVeri }, { data: odemeVeri }, { data: hesapVeri }, rol] = await Promise.all([
    supabase.from("alis_kalemleri").select("*").eq("fatura_id", id).order("sira"),
    supabase.from("cariler").select("*").eq("id", f.cari_id).single(),
    supabase.from("para_hareketleri").select("*").eq("alis_fatura_id", id),
    supabase.from("hesap_plani").select("kod, ad"),
    mevcutRol(),
  ]);
  const kim = await oturum();
  const kalemler = (kalemVeri ?? []) as AlisKalemi[];
  const cari = cariVeri as Cari;
  const odemeler = (odemeVeri ?? []) as ParaHareketi[];
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));

  const stokIdleri = kalemler.map((k) => k.stok_karti_id).filter(Boolean) as string[];
  const fisIdleri = [f.fis_id, f.iptal_fis_id, ...odemeler.flatMap((o) => [o.fis_id, o.iptal_fis_id])].filter(Boolean) as string[];
  const [{ data: stokVeri }, { data: satirVeri }, { data: odemeHesapVeri }] = await Promise.all([
    stokIdleri.length ? supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", stokIdleri) : Promise.resolve({ data: [] }),
    supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira"),
    f.odeme_hesap_id
      ? supabase.from("kasa_banka_hesaplari").select("*").eq("id", f.odeme_hesap_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const stok = new Map(((stokVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim">[]).map((s) => [s.id, s]));
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const odemeHesabi = odemeHesapVeri as KasaBankaHesabi | null;
  const iptal = f.durum === "iptal";

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            Alış · {f.belge_no} {iptal && <span className="etk e-kirmizi">iptal</span>}
          </h1>
          <p>
            {cari.unvan} <span className="kod">{cari.kod}</span> · {tarihTR(f.tarih)}
            {f.vade_tarihi && ` · vade ${tarihTR(f.vade_tarihi)}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/alis" className="btn btn-cizgi">
            Alış listesi
          </Link>
          <Link href="/alis/yeni" className="btn btn-ana">
            + Yeni alış
          </Link>
        </div>
      </div>

      {iptal && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu fatura iptal edildi: <b>{f.iptal_nedeni}</b>. Stok, tedarikçi borcu ve varsa ödeme ters kayıtla geri alındı.
        </p>
      )}

      <div className="kart">
        <div className="tablo-kutu">
          <table className="kart-tablo">
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Kod</th>
                <th className="sag">Miktar</th>
                <th className="sag">Birim fiyat</th>
                <th className="sag">KDV</th>
                <th className="sag">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const s = k.stok_karti_id ? stok.get(k.stok_karti_id) : undefined;
                return (
                  <tr key={k.id}>
                    <td>
                      <b>{s?.ad ?? k.aciklama ?? hesapAdlari.get(k.hesap_kodu ?? "")}</b>
                      {!s && k.aciklama && <span className="soluk"> · {hesapAdlari.get(k.hesap_kodu ?? "")}</span>}
                    </td>
                    <td data-label="Kod">
                      <span className="kod">{s?.kod ?? k.hesap_kodu}</span>
                    </td>
                    <td data-label="Miktar" className="sag num">
                      {sayi(k.miktar)} {s?.birim ?? ""}
                    </td>
                    <td data-label="Birim fiyat" className="sag num">
                      {tl(k.birim_fiyat)}
                    </td>
                    <td data-label="KDV" className="sag num">
                      %{Number(k.kdv_orani)} · {tl(k.kdv_tutari)}
                    </td>
                    <td data-label="Tutar" className="sag num">
                      {tl(k.tutar)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="kart-ic" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--cizgi)" }}>
          <div>
            <span className="soluk">Ödeme: </span>
            {odemeHesabi ? (
              <span className="etk e-yesil">
                Peşin · {odemeHesabi.ad} ({odemeHesabi.kod})
              </span>
            ) : (
              <span className="etk e-amber">Veresiye</span>
            )}
            {f.aciklama && <p className="soluk" style={{ margin: "8px 0 0" }}>Not: {f.aciklama}</p>}
          </div>
          <div className="toplam">
            <span className="num soluk">
              Ara toplam {tl(f.ara_toplam)} · KDV {tl(f.kdv_toplam)}
            </span>
            <span className="buyuk num">{tl(f.genel_toplam)}</span>
          </div>
        </div>
      </div>

      <MuhasebeKarsiligi satirlar={satirlar.filter((s) => s.fis_id === f.fis_id)} hesapAdlari={hesapAdlari} />
      {odemeler.map((o) => (
        <MuhasebeKarsiligi
          key={o.id}
          baslik="Peşin ödeme kaydı"
          satirlar={satirlar.filter((s) => s.fis_id === o.fis_id)}
          hesapAdlari={hesapAdlari}
        />
      ))}
      {f.iptal_fis_id && (
        <MuhasebeKarsiligi
          baslik="İptal (ters kayıt)"
          etiket="iptal"
          satirlar={satirlar.filter((s) => s.fis_id === f.iptal_fis_id)}
          hesapAdlari={hesapAdlari}
        />
      )}

      <KayitIzi tablo="alis_faturalari" id={f.id} olusturan={f.olusturan} zaman={f.created_at} />

      {!iptal && duzenlemeYetkisiVarMi(rol) && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            {iptalEdebilir(kim, f)
              ? "Yanlış girildiyse fatura silinmez, iptal edilir: stok, borç ve ödeme ters kayıtla geri alınır. Sonra doğrusu yeniden girilir."
              : IPTAL_YETKI_NOTU}
          </span>
          {iptalEdebilir(kim, f) && <IptalFormu tur="alis" id={f.id} etiket="Faturayı iptal et" />}
        </div>
      )}
    </>
  );
}
