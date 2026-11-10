import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { FaturaIadeleri } from "@/components/iade/FaturaIadeleri";
import { oturum, iptalEdebilir, IPTAL_YETKI_NOTU } from "@/lib/yetki";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Cari, KasaBankaHesabi, ParaHareketi, SatisFaturasi, SatisKalemi, StokKarti, YevmiyeSatiri } from "@/types/database";

export default async function SatisDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: faturaVeri } = await supabase.from("satis_faturalari").select("*").eq("id", id).maybeSingle();
  if (!faturaVeri) notFound();
  const f = faturaVeri as SatisFaturasi;

  const [{ data: kalemVeri }, { data: cariVeri }, { data: tahsilatVeri }, { data: hesapVeri }, rol] = await Promise.all([
    supabase.from("satis_kalemleri").select("*").eq("fatura_id", id).order("sira"),
    supabase.from("cariler").select("*").eq("id", f.cari_id).single(),
    supabase.from("para_hareketleri").select("*").eq("satis_fatura_id", id),
    supabase.from("hesap_plani").select("kod, ad"),
    mevcutRol(),
  ]);
  const kim = await oturum();
  const kalemler = (kalemVeri ?? []) as SatisKalemi[];
  const cari = cariVeri as Cari;
  const tahsilatlar = (tahsilatVeri ?? []) as ParaHareketi[];
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));

  const fisIdleri = [f.fis_id, f.iptal_fis_id, ...tahsilatlar.flatMap((o) => [o.fis_id, o.iptal_fis_id])].filter(Boolean) as string[];
  const [{ data: urunVeri }, { data: satirVeri }, { data: odemeHesapVeri }] = await Promise.all([
    supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", kalemler.map((k) => k.stok_karti_id)),
    supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira"),
    f.odeme_hesap_id ? supabase.from("kasa_banka_hesaplari").select("*").eq("id", f.odeme_hesap_id).single() : Promise.resolve({ data: null }),
  ]);
  const urun = new Map(((urunVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim">[]).map((u) => [u.id, u]));
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const odemeHesabi = odemeHesapVeri as KasaBankaHesabi | null;
  const iptal = f.durum === "iptal";
  const tahmini = kalemler.some((k) => k.maliyet_tahmini);
  const no = f.belge_no ?? `SAT-${f.satis_no}`;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            Satış · {no} {iptal && <span className="etk e-kirmizi">iptal</span>}
          </h1>
          <p>
            <Link href={`/cariler/${cari.id}`}>{cari.unvan}</Link> <span className="kod">{cari.kod}</span> · {tarihTR(f.tarih)}
            {f.vade_tarihi && ` · vade ${tarihTR(f.vade_tarihi)}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/satis" className="btn btn-cizgi">
            Satış listesi
          </Link>
          {duzenlemeYetkisiVarMi(rol) && (
            <Link href="/satis/yeni" className="btn btn-ana">
              + Yeni satış
            </Link>
          )}
        </div>
      </div>

      {iptal && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu satış iptal edildi: <b>{f.iptal_nedeni}</b>. Stok, müşteri alacağı ve varsa tahsilat ters kayıtla geri alındı.
        </p>
      )}

      <div className="kart">
        <div className="tablo-kutu">
          <table className="kart-tablo liste-tablo">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Lot</th>
                <th className="sag">Miktar</th>
                <th className="sag">Birim fiyat</th>
                <th className="sag">KDV</th>
                <th className="sag">Tutar</th>
                <th className="sag">Maliyet</th>
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const u = urun.get(k.stok_karti_id);
                return (
                  <tr key={k.id}>
                    <td className="liste-baslik">
                      <b>{u?.ad}</b> <span className="kod">{u?.kod}</span>
                    </td>
                    <td data-label="Lot">{k.lot_no}</td>
                    <td data-label="Miktar" className="sag num">
                      {sayi(k.miktar)} {u?.birim}
                    </td>
                    <td data-label="Birim fiyat" className="sag num">
                      {tl(k.birim_fiyat)}
                      {Number(k.iskonto_orani) > 0 && <div className="soluk" style={{ fontSize: 12 }}>%{Number(k.iskonto_orani)} iskonto</div>}
                    </td>
                    <td data-label="KDV" className="sag num mobil-gizle">
                      %{Number(k.kdv_orani)} · {tl(k.kdv_tutari)}
                    </td>
                    <td data-label="Tutar" className="sag num ana-deger">
                      {tl(k.tutar)}
                    </td>
                    <td data-label="Maliyet" className="sag num">
                      {tl(k.maliyet_tutari)}
                      {k.maliyet_tahmini && <span className="amber"> *</span>}
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
                {odemeHesabi.tur === "pos" ? "Kartla" : "Peşin"} · {odemeHesabi.ad} ({odemeHesabi.kod})
              </span>
            ) : (
              <span className="etk e-amber">Veresiye</span>
            )}
            {f.aciklama && <p className="soluk" style={{ margin: "8px 0 0" }}>Not: {f.aciklama}</p>}
          </div>
          <div className="toplam">
            {Number(f.iskonto_toplam) > 0 && (
              <span className="num soluk">
                Brüt {tl(Number(f.ara_toplam) + Number(f.iskonto_toplam))} · İskonto −{tl(f.iskonto_toplam)}
                {Number(f.genel_iskonto_orani) > 0 && ` (genel %${Number(f.genel_iskonto_orani)} dahil)`}
              </span>
            )}
            <span className="num soluk">
              Ara toplam {tl(f.ara_toplam)} · KDV {tl(f.kdv_toplam)}
            </span>
            <span className="buyuk num">{tl(f.genel_toplam)}</span>
            <span className="num soluk" style={{ fontSize: 13 }}>
              Maliyet {tl(f.maliyet_toplam)} · brüt kâr {tl(Number(f.ara_toplam) - Number(f.maliyet_toplam))}
            </span>
          </div>
        </div>
      </div>
      {tahmini && (
        <p className="not">
          * Satış anında stok yetersizdi; maliyet son bilinen giriş maliyetinden alındı (hiç giriş yoksa 0). Üretim kayıtları
          başlayınca bu durum azalır.
        </p>
      )}

      <MuhasebeKarsiligi satirlar={satirlar.filter((s) => s.fis_id === f.fis_id)} hesapAdlari={hesapAdlari} />
      {tahsilatlar.map((t) => (
        <MuhasebeKarsiligi key={t.id} baslik="Tahsilat kaydı" satirlar={satirlar.filter((s) => s.fis_id === t.fis_id)} hesapAdlari={hesapAdlari} />
      ))}
      {f.iptal_fis_id && (
        <MuhasebeKarsiligi
          baslik="İptal (ters kayıt)"
          etiket="iptal"
          satirlar={satirlar.filter((s) => s.fis_id === f.iptal_fis_id)}
          hesapAdlari={hesapAdlari}
        />
      )}

      <FaturaIadeleri tur="satis" faturaId={f.id} faturaIptal={iptal} />

      <KayitIzi tablo="satis_faturalari" id={f.id} olusturan={f.olusturan} zaman={f.created_at} />

      {!iptal && duzenlemeYetkisiVarMi(rol) && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            {iptalEdebilir(kim, f)
              ? "Yanlış girildiyse ya da ürün iade geldiyse satış silinmez, iptal edilir: stok, alacak ve tahsilat ters kayıtla geri alınır."
              : IPTAL_YETKI_NOTU}
          </span>
          {iptalEdebilir(kim, f) && <IptalFormu tur="satis" id={f.id} etiket="Satışı iptal et" />}
        </div>
      )}
    </>
  );
}
