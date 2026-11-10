import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { createClient } from "@/lib/supabase/server";
import { iptalEdebilir, islemIzni, oturum, IPTAL_YETKI_NOTU } from "@/lib/yetki";
import type { Iade, IadeKalemi, ParaHareketi, YevmiyeSatiri } from "@/types/database";

export default async function IadeDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: veri } = await supabase.from("iadeler").select("*").eq("id", id).maybeSingle();
  if (!veri) notFound();
  const iade = veri as Iade;
  const satisIadesi = iade.tur === "satis";
  const faturaId = (satisIadesi ? iade.satis_fatura_id : iade.alis_fatura_id)!;

  const [{ data: kalemVeri }, { data: cari }, { data: fatura }, { data: paraVeri }, { data: hesapVeri }, kim] = await Promise.all([
    supabase.from("iade_kalemleri").select("*").eq("iade_id", id).order("sira"),
    supabase.from("cariler").select("id, unvan, kod").eq("id", iade.cari_id).single(),
    satisIadesi
      ? supabase.from("satis_faturalari").select("belge_no, satis_no").eq("id", faturaId).single()
      : supabase.from("alis_faturalari").select("belge_no").eq("id", faturaId).single(),
    supabase.from("para_hareketleri").select("*").eq("iade_id", id),
    supabase.from("hesap_plani").select("kod, ad"),
    oturum(),
  ]);
  const kalemler = (kalemVeri ?? []) as IadeKalemi[];
  const paralar = (paraVeri ?? []) as ParaHareketi[];
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));
  const fisIdleri = [iade.fis_id, iade.iptal_fis_id, ...paralar.flatMap((p) => [p.fis_id, p.iptal_fis_id])].filter(Boolean) as string[];
  const [{ data: kartVeri }, { data: satirVeri }] = await Promise.all([
    supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", kalemler.map((k) => k.stok_karti_id)),
    fisIdleri.length ? supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira") : Promise.resolve({ data: [] }),
  ]);
  const kart = new Map((kartVeri ?? []).map((k) => [k.id, k]));
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const iptal = iade.durum === "iptal";
  const faturaNo = satisIadesi
    ? ((fatura as { belge_no: string | null; satis_no?: number } | null)?.belge_no ?? `SAT-${(fatura as { satis_no?: number } | null)?.satis_no}`)
    : (fatura as { belge_no: string } | null)?.belge_no;
  const iptalOlur = iptalEdebilir(kim, iade);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {satisIadesi ? "Satış iadesi" : "Alış iadesi"} · İADE-{iade.iade_no} {iptal && <span className="etk e-kirmizi">iptal</span>}
          </h1>
          <p>
            <Link href={`/cariler/${cari?.id}`}>{cari?.unvan}</Link> <span className="kod">{cari?.kod}</span> · {tarihTR(iade.tarih)} ·{" "}
            {satisIadesi ? "Satış" : "Alış faturası"} <Link href={`/${iade.tur}/${faturaId}`}>{faturaNo}</Link>
            {iade.belge_no && ` · belge ${iade.belge_no}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={`/${iade.tur}/${faturaId}`} className="btn btn-cizgi">
            Faturaya dön
          </Link>
        </div>
      </div>

      {iptal && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu iade iptal edildi: <b>{iade.iptal_nedeni}</b>. Stok, cari ve varsa para hareketi ters kayıtla geri alındı.
        </p>
      )}

      <div className="kart">
        <div className="tablo-kutu">
          <table className="kart-tablo">
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="sag">Miktar</th>
                <th className="sag">Birim fiyat</th>
                <th className="sag">KDV</th>
                <th className="sag">Tutar</th>
                {satisIadesi && <th>Durum</th>}
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const u = kart.get(k.stok_karti_id);
                return (
                  <tr key={k.id}>
                    <td>
                      <b>{u?.ad}</b> <span className="kod">{u?.kod}</span>
                    </td>
                    <td data-label="Miktar" className="sag num">
                      {sayi(k.miktar)} {u?.birim}
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
                    {satisIadesi && (
                      <td data-label="Durum">
                        {k.stoga_alindi ? <span className="etk e-yesil">stoğa alındı</span> : <span className="etk e-amber">bozuk · imha</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="kart-ic" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid var(--cizgi)" }}>
          <div>
            {paralar.length > 0 ? (
              <span className="etk e-yesil">Para iadesi: {satisIadesi ? "müşteriye ödendi" : "tedarikçiden alındı"}</span>
            ) : (
              <span className="etk e-gri">{satisIadesi ? "Müşterinin borcundan düşüldü" : "Tedarikçiye borcumuzdan düşüldü"}</span>
            )}
            {iade.aciklama && <p className="soluk" style={{ margin: "8px 0 0" }}>Neden: {iade.aciklama}</p>}
          </div>
          <div className="toplam">
            <span className="num soluk">
              Ara toplam {tl(iade.ara_toplam)} · KDV {tl(iade.kdv_toplam)}
            </span>
            <span className="buyuk num">{tl(iade.genel_toplam)}</span>
          </div>
        </div>
      </div>

      {iade.fis_id && <MuhasebeKarsiligi satirlar={satirlar.filter((s) => s.fis_id === iade.fis_id)} hesapAdlari={hesapAdlari} />}
      {paralar.map((p) => (
        <MuhasebeKarsiligi key={p.id} baslik="Para iadesi" satirlar={satirlar.filter((s) => s.fis_id === p.fis_id)} hesapAdlari={hesapAdlari} />
      ))}
      {iade.iptal_fis_id && (
        <MuhasebeKarsiligi baslik="İptal (ters kayıt)" etiket="iptal" satirlar={satirlar.filter((s) => s.fis_id === iade.iptal_fis_id)} hesapAdlari={hesapAdlari} />
      )}

      <KayitIzi tablo="iadeler" id={iade.id} olusturan={iade.olusturan} zaman={iade.created_at} />

      {!iptal && kim && islemIzni(kim.rol, iade.tur) && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            {iptalOlur ? "Yanlış girildiyse iade iptal edilir: stok, cari ve para iadesi ters kayıtla geri alınır." : IPTAL_YETKI_NOTU}
          </span>
          {iptalOlur && <IptalFormu tur="iade" id={iade.id} etiket="İadeyi iptal et" />}
        </div>
      )}
    </>
  );
}
