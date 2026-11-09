import Link from "next/link";
import { redirect } from "next/navigation";
import { AlisFormu } from "@/components/alis/AlisFormu";
import { GIDER_HESABI_DESENI } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { Cari, Hesap, KasaBankaHesabi, KdvOrani, StokKarti } from "@/types/database";

export default async function YeniAlisPage() {
  if (!duzenlemeYetkisiVarMi(await mevcutRol())) redirect("/alis");

  const supabase = await createClient();
  const [{ data: cariVeri }, { data: stokVeri }, { data: hesapVeri }, { data: kdvVeri }, { data: paraVeri }] = await Promise.all([
    supabase.from("cariler").select("id, unvan, kod, vade_gun").eq("tur", "tedarikci").eq("aktif", true).order("unvan"),
    supabase.from("stok_kartlari").select("id, ad, kod, birim, kdv_orani").eq("aktif", true).is("birlestirildigi_kart", null).order("ad"),
    supabase.from("hesap_plani").select("kod, ad, ust_kod").eq("aktif", true).order("kod"),
    supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
    supabase.from("kasa_banka_hesaplari").select("*").eq("aktif", true).neq("tur", "pos").order("kod"),
  ]);
  const hesaplar = (hesapVeri ?? []) as Pick<Hesap, "kod" | "ad" | "ust_kod">[];
  const altiOlan = new Set(hesaplar.map((h) => h.ust_kod).filter(Boolean));
  const giderHesaplari = hesaplar.filter((h) => GIDER_HESABI_DESENI.test(h.kod) && !altiOlan.has(h.kod));
  const tedarikciler = (cariVeri ?? []) as Pick<Cari, "id" | "unvan" | "kod" | "vade_gun">[];

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Yeni alış</h1>
          <p>Tedarikçiden gelen mal ya da gider faturası — stok, borç ve KDV tek kayıtla işlenir</p>
        </div>
        <div className="ust-araclar">
          <Link href="/alis" className="btn btn-cizgi">
            Alış listesi
          </Link>
        </div>
      </div>
      {tedarikciler.length === 0 ? (
        <div className="yapim">
          <h2>Önce tedarikçi kartı açın</h2>
          <p className="soluk">
            Alış faturası bir tedarikçiye kaydedilir. <Link href="/cariler?tur=tedarikci">Cariler → Tedarikçiler</Link> ekranından
            ilk tedarikçiyi ekleyin.
          </p>
        </div>
      ) : (
        <AlisFormu
          tedarikciler={tedarikciler}
          stokKartlari={(stokVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "kdv_orani">[]}
          giderHesaplari={giderHesaplari}
          kdvOranlari={(kdvVeri ?? []) as KdvOrani[]}
          odemeHesaplari={(paraVeri ?? []) as KasaBankaHesabi[]}
          hesapAdlari={Object.fromEntries(hesaplar.map((h) => [h.kod, h.ad]))}
          bugun={bugunIstanbul()}
        />
      )}
    </>
  );
}
