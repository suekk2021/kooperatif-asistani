import Link from "next/link";
import { AcilisAyarFormu, AcilisTablosu, type AcilisSatiri } from "@/components/acilis/AcilisFormlari";
import { IptalFormu } from "@/components/IptalFormu";
import { PARA_HESABI_TURU_ADI, STOK_TURU_ADI, tarihTR, tl } from "@/lib/imece";
import { mevcutRol } from "@/lib/rol";
import { iptalEdebilir, islemIzni, oturum } from "@/lib/yetki";
import { createClient } from "@/lib/supabase/server";
import type { Cari, Hesap, KasaBankaHesabi, StokKarti, YevmiyeSatiri } from "@/types/database";

type Sekme = "para" | "cari" | "stok";
const SEKMELER: { id: Sekme; ad: string }[] = [
  { id: "para", ad: "Kasa ve Banka" },
  { id: "cari", ad: "Cariler" },
  { id: "stok", ad: "Depo sayımı" },
];

export default async function AcilisPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  const { sekme: sekmeParam } = await searchParams;
  const sekme: Sekme = sekmeParam === "cari" || sekmeParam === "stok" ? sekmeParam : "para";

  const supabase = await createClient();
  const [{ data: ayar }, { data: fisVeri }, { data: hesapVeri }, rol, kim] = await Promise.all([
    supabase.from("acilis_ayarlari").select("*").single(),
    supabase.from("yevmiye_fisleri").select("id, fis_no, tarih, aciklama, created_at, olusturan").eq("kaynak_tur", "acilis").order("fis_no"),
    supabase.from("hesap_plani").select("kod, ad, ust_kod").eq("aktif", true).order("kod"),
    mevcutRol(),
    oturum(),
  ]);
  const fisler = (fisVeri ?? []) as { id: string; fis_no: number; tarih: string; aciklama: string; created_at: string; olusturan: string | null }[];
  const { data: iptalVeri } = fisler.length
    ? await supabase.from("yevmiye_fisleri").select("iptal_edilen_fis").in("iptal_edilen_fis", fisler.map((f) => f.id))
    : { data: [] };
  const iptalEdilen = new Set(((iptalVeri ?? []) as { iptal_edilen_fis: string }[]).map((i) => i.iptal_edilen_fis));
  const gecerliIdler = fisler.filter((f) => !iptalEdilen.has(f.id)).map((f) => f.id);

  const [{ data: satirVeri }, { data: hareketVeri }] = await Promise.all([
    fisler.length ? supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisler.map((f) => f.id)).order("sira") : Promise.resolve({ data: [] }),
    gecerliIdler.length
      ? supabase.from("stok_hareketleri").select("stok_karti_id, miktar, tutar").eq("kaynak_tur", "acilis").in("kaynak_id", gecerliIdler)
      : Promise.resolve({ data: [] }),
  ]);
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const gecerliSet = new Set(gecerliIdler);
  const netKod = new Map<string, number>();
  for (const s of satirlar) {
    if (!gecerliSet.has(s.fis_id)) continue;
    netKod.set(s.hesap_kodu, (netKod.get(s.hesap_kodu) ?? 0) + Number(s.borc) - Number(s.alacak));
  }
  const oncekiStok = new Map<string, { miktar: number; tutar: number }>();
  for (const h of (hareketVeri ?? []) as { stok_karti_id: string; miktar: number; tutar: number }[]) {
    const o = oncekiStok.get(h.stok_karti_id) ?? { miktar: 0, tutar: 0 };
    oncekiStok.set(h.stok_karti_id, { miktar: o.miktar + Number(h.miktar), tutar: o.tutar + Number(h.tutar) });
  }

  // Sekmeye göre satırlar
  let tablo: AcilisSatiri[] = [];
  if (sekme === "para") {
    const { data } = await supabase.from("kasa_banka_hesaplari").select("*").eq("aktif", true).neq("tur", "pos").order("kod");
    tablo = ((data ?? []) as KasaBankaHesabi[]).map((h) => {
      const net = netKod.get(h.kod) ?? 0;
      return { id: h.id, ad: h.ad, kod: h.kod, alt: PARA_HESABI_TURU_ADI[h.tur], onceki: h.tur === "kredi_karti" ? -net : net };
    });
  } else if (sekme === "cari") {
    const { data } = await supabase.from("cariler").select("*").eq("aktif", true).order("tur").order("unvan");
    tablo = ((data ?? []) as Cari[]).map((c) => {
      const net = netKod.get(c.kod) ?? 0;
      return { id: c.id, ad: c.unvan, kod: c.kod, alt: c.tur === "musteri" ? "müşteri" : "tedarikçi", onceki: c.tur === "musteri" ? net : -net };
    });
  } else {
    const { data } = await supabase.from("stok_kartlari").select("*").eq("aktif", true).is("birlestirildigi_kart", null).order("kod");
    tablo = ((data ?? []) as StokKarti[]).map((k) => {
      const o = oncekiStok.get(k.id);
      return { id: k.id, ad: k.ad, kod: k.kod, alt: `${STOK_TURU_ADI[k.tur]} · ${k.birim}`, onceki: o?.miktar ?? 0, oncekiDeger: o?.tutar ?? 0 };
    });
  }

  // Karşı hesap seçenekleri: kart alt hesapları (120.01.001 gibi üç parçalı) hariç, alt hesabı olmayan hesaplar.
  const hesaplar = (hesapVeri ?? []) as Pick<Hesap, "kod" | "ad" | "ust_kod">[];
  const ustler = new Set(hesaplar.map((h) => h.ust_kod).filter(Boolean));
  const karsiSecenekleri = hesaplar.filter((h) => !ustler.has(h.kod) && h.kod.split(".").length <= 2);

  const ayarli = Boolean(ayar?.tarih && ayar?.karsi_hesap);
  // Açılış bakiyesini ve tarih + karşı hesap ayarını yönetici ve ön muhasebe girer (migration 20261111180000 ve 20261111200000).
  const yazabilir = islemIzni(rol, "acilis");
  const karsiAd = hesaplar.find((h) => h.kod === ayar?.karsi_hesap)?.ad;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Açılış</h1>
          <p>Programa geçiş günündeki kasa/banka bakiyeleri, eski borç-alacaklar ve depo sayımı</p>
        </div>
        <div className="ust-araclar">
          <Link href="/panel" className="btn btn-cizgi">
            Ana Panel
          </Link>
        </div>
      </div>

      <div className={ayarli ? "kart kart-ic" : "not"} style={{ marginTop: 0, marginBottom: 16 }}>
        {ayarli ? (
          <p style={{ margin: "0 0 10px" }}>
            Açılış tarihi <b>{tarihTR(ayar!.tarih)}</b> · karşı hesap <span className="kod">{ayar!.karsi_hesap}</span> {karsiAd}
            <span className="soluk"> — girilen her açılış kaydı bu tarihe yazılır; borç-alacak farkı bu hesaba gider.</span>
          </p>
        ) : (
          <p style={{ margin: "0 0 10px" }}>
            <b>Açılış kaydedilmeden önce muhasebeciden iki bilgi alınmalı:</b> açılış tarihi ve açılış kaydının karşı hesabı.
            {yazabilir ? " Gelince aşağıya girin." : " Açılış ayarını Başkan, Operasyon yöneticisi ya da ön muhasebe girer."} Tablolar şimdiden doldurulabilir ama
            kaydedilemez.
          </p>
        )}
        {yazabilir && <AcilisAyarFormu tarih={ayar?.tarih ?? null} karsiHesap={ayar?.karsi_hesap ?? null} hesaplar={karsiSecenekleri} />}
      </div>

      <div className="sekmeler">
        {SEKMELER.map((s) => (
          <Link key={s.id} href={`/acilis?sekme=${s.id}`} className={s.id === sekme ? "aktif" : undefined}>
            {s.ad}
          </Link>
        ))}
      </div>

      <div className="kart">
        {yazabilir ? (
          <AcilisTablosu key={sekme} tur={sekme} satirlar={tablo} kilitli={!ayarli} />
        ) : (
          <p className="bos">Açılış bakiyelerini Başkan, Operasyon yöneticisi ya da ön muhasebe girer.</p>
        )}
      </div>

      {fisler.length > 0 && (
        <div className="kart" style={{ marginTop: 16 }}>
          <div className="kart-bas">
            <h2>Açılış kayıtları</h2>
            <span className="soluk">{gecerliIdler.length} geçerli kayıt</span>
          </div>
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <tbody>
                {fisler.map((f) => {
                  const fs = satirlar.filter((s) => s.fis_id === f.id);
                  const toplam = fs.reduce((t, s) => t + Number(s.borc), 0);
                  const iptal = iptalEdilen.has(f.id);
                  return (
                    <tr key={f.id} style={iptal ? { opacity: 0.55 } : undefined}>
                      <td>
                        <b>Fiş #{f.fis_no}</b> · {tarihTR(f.tarih)} {iptal && <span className="etk e-kirmizi">iptal</span>}
                        <div className="soluk" style={{ fontSize: 12.5 }}>{fs.length - 1} satır</div>
                      </td>
                      <td data-label="Toplam" className="sag num">
                        {tl(toplam)}
                      </td>
                      <td data-label="" className="sag">
                        {!iptal && yazabilir && iptalEdebilir(kim, f) && <IptalFormu tur="acilis" id={f.id} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
