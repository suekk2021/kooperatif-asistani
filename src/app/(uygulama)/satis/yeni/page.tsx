import Link from "next/link";
import { redirect } from "next/navigation";
import { SatisFormu, type SatilabilirUrun } from "@/components/satis/SatisFormu";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { Cari, KasaBankaHesabi, KdvOrani, StokDurumu, StokKarti } from "@/types/database";

export default async function YeniSatisPage() {
  if (!duzenlemeYetkisiVarMi(await mevcutRol())) redirect("/satis");

  const supabase = await createClient();
  const [{ data: cariVeri }, { data: urunVeri }, { data: durumVeri }, { data: kdvVeri }, { data: hesapVeri }, { data: planVeri }] =
    await Promise.all([
      supabase.from("cariler").select("id, unvan, kod, vade_gun").eq("tur", "musteri").eq("aktif", true).order("unvan"),
      supabase
        .from("stok_kartlari")
        .select("id, ad, kod, birim, kdv_orani, tur, satis_fiyati")
        .in("tur", ["mamul", "ticari_mal"])
        .eq("aktif", true)
        .is("birlestirildigi_kart", null)
        .order("ad"),
      supabase.from("stok_durumu").select("*"),
      supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
      supabase.from("kasa_banka_hesaplari").select("*").eq("aktif", true).neq("tur", "kredi_karti").order("kod"),
      supabase.from("hesap_plani").select("kod, ad"),
    ]);
  const durum = new Map(((durumVeri ?? []) as StokDurumu[]).map((d) => [d.stok_karti_id, d]));
  const urunler: SatilabilirUrun[] = ((urunVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "kdv_orani" | "tur" | "satis_fiyati">[]).map(
    (u) => ({ ...u, stok: Number(durum.get(u.id)?.miktar ?? 0), ortalama: Number(durum.get(u.id)?.ortalama_maliyet ?? 0) })
  );
  const musteriler = (cariVeri ?? []) as Pick<Cari, "id" | "unvan" | "kod" | "vade_gun">[];

  const eksik = [
    musteriler.length === 0 && { ad: "müşteri kartı", yol: "/cariler?tur=musteri" },
    urunler.length === 0 && { ad: "ürün kartı (Stok → tür: Ürün)", yol: "/stok?tur=mamul" },
  ].filter(Boolean) as { ad: string; yol: string }[];

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Yeni satış</h1>
          <p>Müşteriye ürün çıkışı — stok ortalama maliyetle düşer, alacak ve KDV kendiliğinden işlenir</p>
        </div>
        <div className="ust-araclar">
          <Link href="/satis" className="btn btn-cizgi">
            Satış listesi
          </Link>
        </div>
      </div>
      {eksik.length > 0 ? (
        <div className="yapim">
          <h2>Önce kart açın</h2>
          <ul>
            {eksik.map((e) => (
              <li key={e.yol}>
                <Link href={e.yol}>{e.ad}</Link>
              </li>
            ))}
          </ul>
          <p className="soluk" style={{ marginBottom: 0 }}>
            Tezgâhtan perakende satışlar için &quot;Perakende müşteri&quot; adında tek bir müşteri kartı açmanız yeterli.
          </p>
        </div>
      ) : (
        <SatisFormu
          musteriler={musteriler}
          urunler={urunler}
          kdvOranlari={(kdvVeri ?? []) as KdvOrani[]}
          tahsilatHesaplari={(hesapVeri ?? []) as KasaBankaHesabi[]}
          hesapAdlari={Object.fromEntries(((planVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]))}
          bugun={bugunIstanbul()}
        />
      )}
    </>
  );
}
