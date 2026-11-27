import Link from "next/link";
import { notFound } from "next/navigation";
import { FiyatListesiAyarFormu } from "@/components/fiyat/FiyatListesiFormlari";
import { FiyatTablosu, type FiyatSatiri } from "@/components/fiyat/FiyatTablosu";
import { kodGoster } from "@/lib/imece";
import { mevcutRol } from "@/lib/rol";
import { fiyatYetkiliMi } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import type { BirimDonusumu, Cari, FiyatListesi, FiyatListesiKalemi, StokKarti } from "@/types/database";

export default async function FiyatListesiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: listeVeri } = await supabase.from("fiyat_listeleri").select("*").eq("id", id).maybeSingle();
  if (!listeVeri) notFound();
  const liste = listeVeri as FiyatListesi;

  const [{ data: kalemVeri }, { data: urunVeri }, { data: donusumVeri }, { data: musteriVeri }, rol] = await Promise.all([
    supabase.from("fiyat_listesi_kalemleri").select("*").eq("liste_id", id),
    supabase.from("stok_kartlari").select("id, ad, kod, birim, tur, aktif, satis_fiyati, birlestirildigi_kart").order("ad"),
    supabase.from("birim_donusumleri").select("*").eq("aktif", true),
    supabase.from("cariler").select("id, unvan, kod").eq("fiyat_listesi_id", id).eq("aktif", true).order("unvan"),
    mevcutRol(),
  ]);
  const kalemler = (kalemVeri ?? []) as FiyatListesiKalemi[];
  const fiyatlar = Object.fromEntries(kalemler.map((k) => [k.stok_karti_id, Number(k.fiyat)]));
  const donusumler = new Map<string, { birim: string; katsayi: number }[]>();
  for (const d of (donusumVeri ?? []) as BirimDonusumu[]) {
    donusumler.set(d.stok_karti_id, [...(donusumler.get(d.stok_karti_id) ?? []), { birim: d.birim, katsayi: Number(d.katsayi) }]);
  }
  type Urun = Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "tur" | "aktif" | "satis_fiyati" | "birlestirildigi_kart">;
  const satilabilir = (u: Urun) => (u.tur === "mamul" || u.tur === "ticari_mal") && u.aktif && !u.birlestirildigi_kart;
  // Satılabilir kartlar + satışı kalkmış ama hâlâ listede duran kartlar (listeden çıkarılabilsin diye)
  const satirlar: FiyatSatiri[] = ((urunVeri ?? []) as Urun[])
    .filter((u) => satilabilir(u) || u.id in fiyatlar)
    .map((u) => ({
      stok_karti_id: u.id,
      kod: u.kod,
      ad: u.ad,
      birim: u.birim,
      kartFiyati: u.satis_fiyati !== null ? Number(u.satis_fiyati) : null,
      satilabilir: satilabilir(u),
      donusumler: donusumler.get(u.id) ?? [],
    }));
  const musteriler = (musteriVeri ?? []) as Pick<Cari, "id" | "unvan" | "kod">[];
  const yetkili = fiyatYetkiliMi(rol);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {liste.ad} {!liste.aktif && <span className="etk e-gri">kapalı</span>}
          </h1>
          <p>{liste.aciklama ?? "Fiyat listesi"} · {musteriler.length} müşteri bu listeyi kullanıyor</p>
        </div>
        <div className="ust-araclar">
          <Link href="/satis/fiyat-listeleri" className="btn btn-cizgi">
            Fiyat listeleri
          </Link>
        </div>
      </div>

      {yetkili && (
        <details className="kart form-ac" style={{ marginBottom: 16 }}>
          <summary className="kart-ic">
            <span className="btn btn-cizgi">Listeyi düzenle (ad, aktiflik)</span>
          </summary>
          <FiyatListesiAyarFormu liste={liste} />
        </details>
      )}

      <FiyatTablosu
        key={JSON.stringify(fiyatlar)}
        listeId={liste.id}
        satirlar={satirlar}
        fiyatlar={fiyatlar}
        yetkili={yetkili}
      />

      <div className="kart" style={{ marginTop: 16 }}>
        <div className="kart-bas">
          <h2>Bu listeyi kullanan müşteriler</h2>
        </div>
        {musteriler.length === 0 ? (
          <p className="bos">Henüz hiçbir müşteriye atanmadı. Müşteri kartında &quot;Bilgileri düzenle&quot; → Fiyat listesi.</p>
        ) : (
          <div className="kart-ic" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {musteriler.map((m) => (
              <Link key={m.id} href={`/cariler/${m.id}`} className="etk e-mavi">
                {m.unvan} · {kodGoster(m.kod)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
