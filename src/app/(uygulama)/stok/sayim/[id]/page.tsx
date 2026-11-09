import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { StokKarti, YevmiyeSatiri } from "@/types/database";

type Sayim = {
  id: string;
  sayim_no: number;
  tarih: string;
  sayan: string | null;
  aciklama: string | null;
  durum: string;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
};
type Kalem = {
  id: number;
  stok_karti_id: string;
  sistem_miktari: number;
  sayilan_miktar: number;
  fark: number;
  birim_maliyet: number;
  fark_tutari: number;
};

export default async function SayimDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sayimVeri } = await supabase.from("sayimlar").select("*").eq("id", id).maybeSingle();
  if (!sayimVeri) notFound();
  const s = sayimVeri as Sayim;

  const fisIdleri = [s.fis_id, s.iptal_fis_id].filter(Boolean) as string[];
  const [{ data: kalemVeri }, { data: hesapVeri }, { data: satirVeri }, rol] = await Promise.all([
    supabase.from("sayim_kalemleri").select("*").eq("sayim_id", id),
    supabase.from("hesap_plani").select("kod, ad"),
    fisIdleri.length ? supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira") : Promise.resolve({ data: [] }),
    mevcutRol(),
  ]);
  const kalemler = ((kalemVeri ?? []) as Kalem[]).sort((a, b) => Number(a.fark_tutari) - Number(b.fark_tutari));
  const { data: kartVeri } = await supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", kalemler.map((k) => k.stok_karti_id));
  const kart = new Map(((kartVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim">[]).map((k) => [k.id, k]));
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const eksik = kalemler.filter((k) => Number(k.fark_tutari) < 0).reduce((t, k) => t - Number(k.fark_tutari), 0);
  const fazla = kalemler.filter((k) => Number(k.fark_tutari) > 0).reduce((t, k) => t + Number(k.fark_tutari), 0);
  const tutan = kalemler.filter((k) => Number(k.fark) === 0).length;
  const iptal = s.durum === "iptal";

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            Sayım #{s.sayim_no} {iptal && <span className="etk e-kirmizi">iptal</span>}
          </h1>
          <p>
            {tarihTR(s.tarih)}
            {s.sayan && ` · sayan ${s.sayan}`}
            {s.aciklama && ` · ${s.aciklama}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok/sayim" className="btn btn-cizgi">
            Sayımlar
          </Link>
        </div>
      </div>

      {iptal && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu sayım iptal edildi: <b>{s.iptal_nedeni}</b>. Stoklar sayım öncesine döndü.
        </p>
      )}

      <div className="izgara g3" style={{ marginBottom: 16 }}>
        <div className="kart kart-ic metrik">
          <div className="etiket">Eksik çıkan (açıklanamayan)</div>
          <div className={`deger num${eksik ? " kirmizi" : ""}`}>{tl(eksik)}</div>
          <div className="alt">197 hesabına yazıldı</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Fazla çıkan</div>
          <div className="deger num">{tl(fazla)}</div>
          <div className="alt">397 hesabına yazıldı</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Tutan kart</div>
          <div className="deger num">
            {tutan} / {kalemler.length}
          </div>
          <div className="alt">sayılan kartlardan farksız olanlar</div>
        </div>
      </div>

      <div className="kart">
        <div className="tablo-kutu">
          <table className="kart-tablo">
            <thead>
              <tr>
                <th>Kart</th>
                <th className="sag">Sistemde</th>
                <th className="sag">Sayılan</th>
                <th className="sag">Fark</th>
                <th className="sag">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const c = kart.get(k.stok_karti_id);
                const fark = Number(k.fark);
                return (
                  <tr key={k.id}>
                    <td>
                      <Link href={`/stok/${k.stok_karti_id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {c?.ad}
                      </Link>{" "}
                      <span className="kod">{c?.kod}</span>
                    </td>
                    <td data-label="Sistemde" className="sag num">
                      {sayi(k.sistem_miktari)} {c?.birim}
                    </td>
                    <td data-label="Sayılan" className="sag num">
                      {sayi(k.sayilan_miktar)} {c?.birim}
                    </td>
                    <td data-label="Fark" className={`sag num${fark < 0 ? " kirmizi" : fark > 0 ? " amber" : " yesil"}`}>
                      {fark === 0 ? "✓" : `${fark > 0 ? "+" : ""}${sayi(fark)} ${c?.birim}`}
                    </td>
                    <td data-label="Tutar" className="sag num">
                      {fark === 0 ? "" : tl(k.fark_tutari)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {s.fis_id ? (
        <MuhasebeKarsiligi satirlar={satirlar.filter((x) => x.fis_id === s.fis_id)} hesapAdlari={hesapAdlari} />
      ) : (
        <p className="not">Sayılan bütün kartlar sistemle tuttu; muhasebe kaydı gerekmedi.</p>
      )}
      {s.iptal_fis_id && (
        <MuhasebeKarsiligi baslik="İptal (ters kayıt)" etiket="iptal" satirlar={satirlar.filter((x) => x.fis_id === s.iptal_fis_id)} hesapAdlari={hesapAdlari} />
      )}

      {!iptal && duzenlemeYetkisiVarMi(rol) && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            Sayım yanlış girildiyse iptal edin: stoklar sayım öncesine döner, sonra doğru sayımı yeniden girin.
          </span>
          <IptalFormu tur="sayim" id={s.id} etiket="Sayımı iptal et" />
        </div>
      )}
    </>
  );
}
