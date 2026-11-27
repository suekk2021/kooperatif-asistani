import Link from "next/link";
import { YeniFiyatListesiFormu } from "@/components/fiyat/FiyatListesiFormlari";
import { mevcutRol } from "@/lib/rol";
import { fiyatYetkiliMi } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import type { Cari, FiyatListesi, FiyatListesiKalemi } from "@/types/database";

export default async function FiyatListeleriPage() {
  const supabase = await createClient();
  const [{ data: listeVeri }, { data: kalemVeri }, { data: musteriVeri }, rol] = await Promise.all([
    supabase.from("fiyat_listeleri").select("*").order("aktif", { ascending: false }).order("ad"),
    supabase.from("fiyat_listesi_kalemleri").select("liste_id"),
    supabase.from("cariler").select("id, fiyat_listesi_id").eq("tur", "musteri").eq("aktif", true),
    mevcutRol(),
  ]);
  const listeler = (listeVeri ?? []) as FiyatListesi[];
  const urunSayisi = new Map<string, number>();
  for (const k of (kalemVeri ?? []) as Pick<FiyatListesiKalemi, "liste_id">[]) urunSayisi.set(k.liste_id, (urunSayisi.get(k.liste_id) ?? 0) + 1);
  const musteriler = (musteriVeri ?? []) as Pick<Cari, "id" | "fiyat_listesi_id">[];
  const musteriSayisi = new Map<string, number>();
  for (const m of musteriler) if (m.fiyat_listesi_id) musteriSayisi.set(m.fiyat_listesi_id, (musteriSayisi.get(m.fiyat_listesi_id) ?? 0) + 1);
  const aktifIdler = new Set(listeler.filter((l) => l.aktif).map((l) => l.id));
  const listesiz = musteriler.filter((m) => !m.fiyat_listesi_id || !aktifIdler.has(m.fiyat_listesi_id)).length;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Fiyat listeleri</h1>
          <p>Satışta fiyat elle girilmez: müşteri kartında seçilen listeden gelir. Fiyatlar ana birim başına, KDV hariç.</p>
        </div>
        <div className="ust-araclar">
          <Link href="/satis" className="btn btn-cizgi">
            Satış
          </Link>
        </div>
      </div>

      {listesiz > 0 && (
        <div className="kart kart-ic" style={{ marginBottom: 16, borderLeft: "4px solid var(--amber)" }}>
          <b className="amber">{listesiz} müşterinin fiyat listesi yok</b> — bu müşterilere satış yapılamaz.{" "}
          <Link href="/cariler?tur=musteri">Müşteri kartlarından</Link> liste seçin.
        </div>
      )}

      {fiyatYetkiliMi(rol) && <YeniFiyatListesiFormu />}

      <div className="kart">
        <div className="kart-bas">
          <h2>Listeler</h2>
          <span className="soluk">{listeler.filter((l) => l.aktif).length} aktif liste</span>
        </div>
        {listeler.length === 0 ? (
          <p className="bos">Henüz fiyat listesi yok. &quot;+ Fiyat listesi oluştur&quot; ile ilkini açın.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Liste</th>
                  <th>Açıklama</th>
                  <th className="sag">Ürün</th>
                  <th className="sag">Müşteri</th>
                </tr>
              </thead>
              <tbody>
                {listeler.map((l) => (
                  <tr key={l.id}>
                    <td className="liste-baslik">
                      <Link className="satir-link" href={`/satis/fiyat-listeleri/${l.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {l.ad}
                      </Link>{" "}
                      {!l.aktif && <span className="etk e-gri">kapalı</span>}
                    </td>
                    <td data-label="Açıklama" className="soluk">{l.aciklama}</td>
                    <td data-label="Ürün" className="sag num">{urunSayisi.get(l.id) ?? 0}</td>
                    <td data-label="Müşteri" className="sag num">{musteriSayisi.get(l.id) ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
