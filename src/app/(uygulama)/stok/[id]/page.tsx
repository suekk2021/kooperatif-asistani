import Link from "next/link";
import { notFound } from "next/navigation";
import { StokKartiDuzenleFormu } from "@/components/KartDuzenleFormlari";
import { STOK_TURU_ADI, sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Depo, KdvOrani, StokDurumu, StokKarti } from "@/types/database";

type Hareket = {
  id: number;
  tarih: string;
  miktar: number;
  birim_maliyet: number;
  tutar: number;
  kaynak_tur: string;
  kaynak_id: string | null;
  lot_no: string | null;
  skt: string | null;
  aciklama: string | null;
  iptal_edilen_hareket: number | null;
};

const KAYNAK: Record<string, { ad: string; yol?: string; renk: string }> = {
  alis: { ad: "Alış", yol: "/alis/", renk: "e-mavi" },
  satis: { ad: "Satış", yol: "/satis/", renk: "e-amber" },
  uretim_girdi: { ad: "Üretimde kullanıldı", yol: "/uretim/", renk: "e-gri" },
  uretim_cikti: { ad: "Üretildi", yol: "/uretim/", renk: "e-yesil" },
  sayim: { ad: "Sayım farkı", yol: "/stok/sayim/", renk: "e-kirmizi" },
  acilis: { ad: "Açılış", renk: "e-gri" },
  iade: { ad: "İade", yol: "/iade/", renk: "e-mavi" },
  iptal: { ad: "İptal", renk: "e-kirmizi" },
};

export default async function StokKartiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: kartVeri } = await supabase.from("stok_kartlari").select("*").eq("id", id).maybeSingle();
  if (!kartVeri) notFound();
  const kart = kartVeri as StokKarti;

  const [{ data: hareketVeri }, { data: durumVeri }, { data: depoVeri }, { data: kdvVeri }, rol] = await Promise.all([
    supabase.from("stok_hareketleri").select("*").eq("stok_karti_id", id).order("tarih").order("id"),
    supabase.from("stok_durumu").select("*").eq("stok_karti_id", id).maybeSingle(),
    supabase.from("depolar").select("*").eq("aktif", true).order("id"),
    supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
    mevcutRol(),
  ]);
  const hareketler = (hareketVeri ?? []) as Hareket[];
  const durum = durumVeri as StokDurumu | null;
  const miktar = Number(durum?.miktar ?? 0);
  const asilTur = new Map(hareketler.map((h) => [h.id, h.kaynak_tur]));

  const gosterim = hareketler.reduce<{ h: Hareket; kalan: number }[]>((liste, h) => {
    const onceki = liste.length ? liste[liste.length - 1].kalan : 0;
    liste.push({ h, kalan: onceki + Number(h.miktar) });
    return liste;
  }, []);
  gosterim.reverse();

  const fiyat = kart.satis_fiyati !== null ? Number(kart.satis_fiyati) : null;
  const ortalama = Number(durum?.ortalama_maliyet ?? 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {kart.ad} {!kart.aktif && <span className="etk e-gri">pasif</span>}
          </h1>
          <p>
            {STOK_TURU_ADI[kart.tur]} <span className="kod">{kart.kod}</span> · birim {kart.birim}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok" className="btn btn-cizgi">
            Stok
          </Link>
        </div>
      </div>

      <div className="izgara g4" style={{ marginBottom: 16 }}>
        <div className="kart kart-ic metrik">
          <div className="etiket">Miktar</div>
          <div className={`deger num${miktar < 0 ? " kirmizi" : ""}`}>
            {sayi(miktar)} <small style={{ fontSize: 15 }}>{kart.birim}</small>
          </div>
          <div className="alt">{kart.min_stok !== null ? `asgari ${sayi(kart.min_stok)} ${kart.birim}` : "asgari sınır yok"}</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Değer</div>
          <div className="deger num">{tl(durum?.deger)}</div>
          <div className="alt">ortalama maliyetle</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Ortalama maliyet</div>
          <div className="deger num">{miktar > 0 ? tl(ortalama) : "—"}</div>
          <div className="alt">birim başına</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Liste fiyatı</div>
          <div className="deger num">{fiyat !== null ? tl(fiyat) : "—"}</div>
          <div className="alt">
            {fiyat && ortalama > 0 ? `malzeme marjı %${Math.round(((fiyat - ortalama) / fiyat) * 100)}` : "KDV hariç"}
          </div>
        </div>
      </div>

      {duzenlemeYetkisiVarMi(rol) && (
        <details className="kart form-ac" style={{ marginBottom: 16 }}>
          <summary className="kart-ic">
            <span className="btn btn-cizgi">Kartı düzenle</span>
          </summary>
          <StokKartiDuzenleFormu
            kart={kart}
            depolar={(depoVeri ?? []) as Depo[]}
            kdvOranlari={(kdvVeri ?? []) as KdvOrani[]}
            hareketVar={hareketler.length > 0}
          />
        </details>
      )}

      <div className="kart">
        <div className="kart-bas">
          <h2>Hareketler</h2>
          <span className="soluk">{hareketler.length} hareket · en yenisi üstte</span>
        </div>
        {gosterim.length === 0 ? (
          <p className="bos">Henüz hareket yok. Alış, üretim veya satışla oluşur.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem</th>
                  <th>Lot / SKT</th>
                  <th className="sag">Giriş</th>
                  <th className="sag">Çıkış</th>
                  <th className="sag">Birim maliyet</th>
                  <th className="sag">Kalan</th>
                </tr>
              </thead>
              <tbody>
                {gosterim.map(({ h, kalan }) => {
                  const turu = h.kaynak_tur === "iptal" && h.iptal_edilen_hareket ? asilTur.get(h.iptal_edilen_hareket) : h.kaynak_tur;
                  const k = KAYNAK[h.kaynak_tur] ?? { ad: h.kaynak_tur, renk: "e-gri" };
                  const yol = turu && KAYNAK[turu]?.yol && h.kaynak_id ? `${KAYNAK[turu].yol}${h.kaynak_id}` : null;
                  const giris = Number(h.miktar) > 0;
                  return (
                    <tr key={h.id}>
                      <td className="num">{tarihTR(h.tarih)}</td>
                      <td data-label="İşlem" className="liste-baslik">
                        <span className={`etk ${k.renk}`}>{k.ad}</span> {yol && <Link href={yol}>belge ›</Link>}
                      </td>
                      <td data-label="Lot / SKT">
                        {h.lot_no}
                        {h.skt && ` · ${tarihTR(h.skt)}`}
                      </td>
                      <td data-label="Giriş" className="sag num yesil">
                        {giris ? sayi(h.miktar) : ""}
                      </td>
                      <td data-label="Çıkış" className="sag num">
                        {!giris ? sayi(-Number(h.miktar)) : ""}
                      </td>
                      <td data-label="Birim maliyet" className="sag num">
                        {tl(h.birim_maliyet)}
                      </td>
                      <td data-label="Kalan" className="sag num ana-deger">
                        <b className={kalan < 0 ? "kirmizi" : undefined}>{sayi(kalan)}</b>
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
