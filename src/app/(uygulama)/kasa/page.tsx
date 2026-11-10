import Link from "next/link";
import { IptalFormu } from "@/components/IptalFormu";
import { oturum, iptalEdebilir } from "@/lib/yetki";
import { ParaIslemleri } from "@/components/kasa/ParaIslemleri";
import { FisOzeti } from "@/components/MuhasebeKarsiligi";
import { PARA_HAREKETI_TURU_ADI, PARA_HESABI_TURU_ADI, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { Cari, HesapBakiyesi, KasaBankaHesabi, ParaHareketi, YevmiyeSatiri } from "@/types/database";

const TUR_RENGI: Record<string, string> = { tahsilat: "e-yesil", odeme: "e-kirmizi", virman: "e-gri" };

export default async function KasaPage({ searchParams }: { searchParams: Promise<{ islem?: string }> }) {
  const { islem } = await searchParams;
  const supabase = await createClient();
  const [{ data: hesapVeri }, { data: cariVeri }, { data: hareketVeri }, { data: evrakVeri }, rol] = await Promise.all([
    supabase.from("kasa_banka_hesaplari").select("*").eq("aktif", true).order("kod"),
    supabase.from("cariler").select("id, unvan, tur").eq("aktif", true).order("unvan"),
    supabase.from("para_hareketleri").select("*").order("tarih", { ascending: false }).order("created_at", { ascending: false }).limit(50),
    // Çek/senet tahsili ve ödemesi de kasaya/bankaya para sokar/çıkarır; listede birlikte görünsün.
    supabase
      .from("evrak_hareketleri")
      .select("id, evrak_id, islem, tarih, hesap_id, durum, fis_id, created_at, evraklar(evrak_no, tur, tutar, cari_id, seri_no)")
      .in("islem", ["tahsil", "odeme"])
      .order("tarih", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    mevcutRol(),
  ]);
  const hesaplar = (hesapVeri ?? []) as KasaBankaHesabi[];
  const cariler = (cariVeri ?? []) as Pick<Cari, "id" | "unvan" | "tur">[];
  const paraHareketleri = (hareketVeri ?? []) as (ParaHareketi & { olusturan: string | null; iade_id: string | null })[];
  const kim = await oturum();

  type Evrak = { evrak_no: number; tur: string; tutar: number; cari_id: string; seri_no: string | null };
  type Satir = (typeof paraHareketleri)[number] & { evrak?: Evrak & { id: string } };
  const evrakSatirlari: Satir[] = (evrakVeri ?? []).map((h) => {
    const e = (Array.isArray(h.evraklar) ? h.evraklar[0] : h.evraklar) as Evrak;
    return {
      id: h.id,
      tarih: h.tarih,
      created_at: h.created_at,
      tur: h.islem === "tahsil" ? "tahsilat" : "odeme",
      hesap_id: h.hesap_id,
      karsi_hesap_id: null,
      cari_id: e?.cari_id ?? null,
      tutar: Number(e?.tutar ?? 0),
      komisyon: 0,
      aciklama: null,
      belge_no: e?.seri_no ?? null,
      alis_fatura_id: null,
      satis_fatura_id: null,
      iade_id: null,
      durum: h.durum,
      iptal_nedeni: null,
      fis_id: h.fis_id,
      iptal_fis_id: null,
      olusturan: null,
      evrak: { ...e, id: h.evrak_id },
    } as Satir;
  });
  const hareketler: Satir[] = [...paraHareketleri, ...evrakSatirlari]
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || b.created_at.localeCompare(a.created_at))
    .slice(0, 50);

  const fisIdleri = hareketler.flatMap((h) => [h.fis_id]).filter(Boolean) as string[];
  const [{ data: bakiyeVeri }, { data: satirVeri }] = await Promise.all([
    hesaplar.length
      ? supabase.from("hesap_bakiyeleri").select("*").in("kod", hesaplar.map((h) => h.kod))
      : Promise.resolve({ data: [] }),
    fisIdleri.length
      ? supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira")
      : Promise.resolve({ data: [] }),
  ]);
  const bakiye = new Map(((bakiyeVeri ?? []) as HesapBakiyesi[]).map((b) => [b.kod, Number(b.bakiye)]));
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const hesapAdi = new Map(hesaplar.map((h) => [h.id, h.ad]));
  const cariAdi = new Map(cariler.map((c) => [c.id, c.unvan]));

  const nakit = hesaplar
    .filter((h) => h.tur !== "kredi_karti")
    .reduce((t, h) => t + (bakiye.get(h.kod) ?? 0), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Kasa ve Banka</h1>
          <p>Para nerede, ne zaman giriyor, ne zaman çıkıyor</p>
        </div>
        <div className="soluk num">
          Kasa + banka + POS: <b style={{ color: "var(--metin)" }}>{tl(nakit)}</b>
        </div>
      </div>

      {duzenlemeYetkisiVarMi(rol) && <ParaIslemleri key={islem ?? ""} hesaplar={hesaplar} cariler={cariler} bugun={bugunIstanbul()} baslangic={islem} />}

      <div className="izgara g3">
        {hesaplar.map((h) => {
          const b = bakiye.get(h.kod) ?? 0;
          const kart = h.tur === "kredi_karti";
          const gosterilen = kart ? -b : b; // kredi kartında alacak bakiyesi = borcumuz
          return (
            <div key={h.id} className="kart kart-ic metrik">
              <div className="etiket">
                {h.ad} <span className="kod">{h.kod}</span>
              </div>
              <div className={`deger num${(kart && gosterilen > 0) || (!kart && gosterilen < 0) ? " kirmizi" : ""}`}>
                {tl(gosterilen)}
              </div>
              <div className="alt">
                {PARA_HESABI_TURU_ADI[h.tur]}
                {kart ? " · borcumuz" : ""}
                {h.tur === "pos" && h.komisyon_orani ? ` · komisyon %${Number(h.komisyon_orani)}` : ""}
                {h.tur === "pos" && h.bagli_banka_id ? ` → ${hesapAdi.get(h.bagli_banka_id) ?? ""}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      <div className="kart" style={{ marginTop: 16 }}>
        <div className="kart-bas">
          <h2>Para hareketleri</h2>
          <span className="soluk">son 50 · çek/senet tahsil ve ödemeleri dahil</span>
        </div>
        {hareketler.length === 0 ? (
          <p className="bos">Henüz hareket yok. Alış faturası peşin ödenince veya tahsilat/ödeme girilince burada görünür.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem</th>
                  <th>Kimden / kime</th>
                  <th className="sag">Tutar</th>
                  <th className="sag">Muhasebe karşılığı</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hareketler.map((h) => {
                  const iptal = h.durum === "iptal";
                  const isaret = h.tur === "tahsilat" ? "+" : h.tur === "odeme" ? "−" : "";
                  return (
                    <tr key={h.id} style={iptal ? { opacity: 0.55 } : undefined}>
                      <td className="num">{tarihTR(h.tarih)}</td>
                      <td data-label="İşlem">
                        <span className={`etk ${TUR_RENGI[h.tur]}`}>{PARA_HAREKETI_TURU_ADI[h.tur]}</span>{" "}
                        {hesapAdi.get(h.hesap_id)}
                        {iptal && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                      </td>
                      <td data-label="Kimden / kime">
                        {h.tur === "virman" ? `→ ${hesapAdi.get(h.karsi_hesap_id ?? "") ?? ""}` : cariAdi.get(h.cari_id ?? "")}
                        {h.alis_fatura_id && (
                          <>
                            {" · "}
                            <Link href={`/alis/${h.alis_fatura_id}`}>fatura {h.belge_no}</Link>
                          </>
                        )}
                        {h.satis_fatura_id && (
                          <>
                            {" · "}
                            <Link href={`/satis/${h.satis_fatura_id}`}>satış {h.belge_no}</Link>
                          </>
                        )}
                        {h.iade_id && (
                          <>
                            {" · "}
                            <Link href={`/iade/${h.iade_id}`}>iade {h.belge_no}</Link>
                          </>
                        )}
                        {h.evrak && (
                          <>
                            {" · "}
                            <Link href={`/cek-senet/${h.evrak.id}`}>
                              {h.evrak.tur === "cek" ? "çek" : "senet"} #{h.evrak.evrak_no}
                            </Link>
                          </>
                        )}
                        {h.aciklama && !h.alis_fatura_id && !h.satis_fatura_id && !h.iade_id && <span className="soluk"> · {h.aciklama}</span>}
                      </td>
                      <td data-label="Tutar" className={`sag num ${h.tur === "tahsilat" ? "yesil" : h.tur === "odeme" ? "kirmizi" : ""}`}>
                        {isaret}
                        {tl(h.tutar)}
                        {Number(h.komisyon) > 0 && <div className="soluk" style={{ fontSize: 12 }}>komisyon {tl(h.komisyon)}</div>}
                      </td>
                      <td data-label="Muhasebe" className="sag">
                        <FisOzeti satirlar={satirlar.filter((s) => s.fis_id === h.fis_id)} />
                      </td>
                      <td data-label="" className="sag">
                        {/* Faturaya, iadeye ya da çek/senede bağlı hareket kendi belgesinden iptal edilir. */}
                        {!iptal && !h.alis_fatura_id && !h.satis_fatura_id && !h.iade_id && !h.evrak && iptalEdebilir(kim, h) && <IptalFormu tur="para" id={h.id} />}
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
        Bakiyeler muhasebe kayıtlarından hesaplanır. Programa başlamadan önceki bakiyeler (kasadaki nakit, bankadaki para)
        &quot;açılış bakiyesi&quot; olarak ayrıca girilecek; o zamana kadar bakiyeler sadece programa girilen hareketleri gösterir.
      </p>
    </>
  );
}
