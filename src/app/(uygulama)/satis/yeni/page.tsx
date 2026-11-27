import Link from "next/link";
import { redirect } from "next/navigation";
import { SatisFormu, type SatilabilirUrun, type SatisMusterisi } from "@/components/satis/SatisFormu";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { maliyetGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { BirimDonusumu, FiyatListesi, FiyatListesiKalemi, KasaBankaHesabi, KdvOrani, StokDurumu, StokKarti } from "@/types/database";

export default async function YeniSatisPage() {
  const rol = await mevcutRol();
  if (!duzenlemeYetkisiVarMi(rol)) redirect("/satis");
  // Maliyet yetkisi yoksa ortalama maliyet tarayıcıya hiç gönderilmez (önizlemede maliyet satırları çıkmaz; kayıt sunucuda hesaplanır)
  const maliyetGorur = maliyetGorurMu(rol);

  const supabase = await createClient();
  const [
    { data: cariVeri },
    { data: urunVeri },
    { data: durumVeri },
    { data: kdvVeri },
    { data: hesapVeri },
    { data: planVeri },
    { data: listeVeri },
    { data: fiyatVeri },
    { data: donusumVeri },
  ] = await Promise.all([
    supabase.from("cariler").select("id, unvan, kod, vade_gun, fiyat_listesi_id").eq("tur", "musteri").eq("aktif", true).order("unvan"),
    supabase
      .from("stok_kartlari")
      .select("id, ad, kod, birim, kdv_orani, tur")
      .in("tur", ["mamul", "ticari_mal"])
      .eq("aktif", true)
      .is("birlestirildigi_kart", null)
      .order("ad"),
    supabase.from("stok_durumu").select("*"),
    supabase.from("kdv_oranlari").select("*").eq("aktif", true).order("oran"),
    supabase.from("kasa_banka_hesaplari").select("*").eq("aktif", true).neq("tur", "kredi_karti").order("kod"),
    supabase.from("hesap_plani").select("kod, ad"),
    supabase.from("fiyat_listeleri").select("id, ad").eq("aktif", true).order("ad"),
    supabase.from("fiyat_listesi_kalemleri").select("liste_id, stok_karti_id, fiyat"),
    supabase.from("birim_donusumleri").select("stok_karti_id, birim, katsayi").eq("aktif", true).order("katsayi"),
  ]);
  const durum = new Map(((durumVeri ?? []) as StokDurumu[]).map((d) => [d.stok_karti_id, d]));
  const donusumler = new Map<string, { birim: string; katsayi: number }[]>();
  for (const d of (donusumVeri ?? []) as Pick<BirimDonusumu, "stok_karti_id" | "birim" | "katsayi">[]) {
    donusumler.set(d.stok_karti_id, [...(donusumler.get(d.stok_karti_id) ?? []), { birim: d.birim, katsayi: Number(d.katsayi) }]);
  }
  const urunler: SatilabilirUrun[] = ((urunVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "kdv_orani" | "tur">[]).map((u) => ({
    ...u,
    stok: Number(durum.get(u.id)?.miktar ?? 0),
    ortalama: maliyetGorur ? Number(durum.get(u.id)?.ortalama_maliyet ?? 0) : 0,
    donusumler: donusumler.get(u.id) ?? [],
  }));
  const musteriler = (cariVeri ?? []) as SatisMusterisi[];
  const fiyatListeleri = (listeVeri ?? []) as Pick<FiyatListesi, "id" | "ad">[];
  const fiyatlar: Record<string, Record<string, number>> = {};
  for (const k of (fiyatVeri ?? []) as Pick<FiyatListesiKalemi, "liste_id" | "stok_karti_id" | "fiyat">[]) {
    (fiyatlar[k.liste_id] ??= {})[k.stok_karti_id] = Number(k.fiyat);
  }
  const aktifListe = new Set(fiyatListeleri.map((l) => l.id));
  const listesiz = musteriler.filter((m) => !m.fiyat_listesi_id || !aktifListe.has(m.fiyat_listesi_id)).length;

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
        <>
        {listesiz > 0 && (
          <div className="kart kart-ic" style={{ marginBottom: 16, borderLeft: "4px solid var(--amber)" }}>
            <b className="amber">{listesiz} müşterinin fiyat listesi yok</b> — onlara satış yapılamaz.{" "}
            <Link href="/satis/fiyat-listeleri">Fiyat listeleri</Link> · <Link href="/cariler?tur=musteri">Müşteriler</Link>
          </div>
        )}
        <SatisFormu
          musteriler={musteriler}
          urunler={urunler}
          fiyatListeleri={fiyatListeleri}
          fiyatlar={fiyatlar}
          kdvOranlari={(kdvVeri ?? []) as KdvOrani[]}
          tahsilatHesaplari={(hesapVeri ?? []) as KasaBankaHesabi[]}
          hesapAdlari={Object.fromEntries(((planVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]))}
          bugun={bugunIstanbul()}
        />
        </>
      )}
    </>
  );
}
