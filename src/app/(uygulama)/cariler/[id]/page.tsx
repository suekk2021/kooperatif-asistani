import Link from "next/link";
import { notFound } from "next/navigation";
import { CariDuzenleFormu } from "@/components/KartDuzenleFormlari";
import { CARI_TURU_ADI, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Cari, YevmiyeSatiri } from "@/types/database";

type EkstreSatiri = YevmiyeSatiri & {
  yevmiye_fisleri: { fis_no: number; tarih: string; aciklama: string; kaynak_tur: string; kaynak_id: string | null; created_at: string };
};

const KAYNAK_ADI: Record<string, string> = {
  alis: "Alış faturası",
  satis: "Satış",
  tahsilat: "Tahsilat",
  odeme: "Ödeme",
  virman: "Virman",
  iptal: "İptal",
  acilis: "Açılış",
  manuel: "Elle kayıt",
};

export default async function CariEkstrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cariVeri } = await supabase.from("cariler").select("*").eq("id", id).maybeSingle();
  if (!cariVeri) notFound();
  const cari = cariVeri as Cari;

  const [{ data: satirVeri }, { data: alisVeri }, { data: satisVeri }, rol] = await Promise.all([
    supabase
      .from("yevmiye_satirlari")
      .select("*, yevmiye_fisleri(fis_no, tarih, aciklama, kaynak_tur, kaynak_id, created_at)")
      .eq("hesap_kodu", cari.kod),
    supabase.from("alis_faturalari").select("id").eq("cari_id", id),
    supabase.from("satis_faturalari").select("id").eq("cari_id", id),
    mevcutRol(),
  ]);
  const alisIdleri = new Set(((alisVeri ?? []) as { id: string }[]).map((a) => a.id));
  const satisIdleri = new Set(((satisVeri ?? []) as { id: string }[]).map((s) => s.id));

  const satirlar = ((satirVeri ?? []) as EkstreSatiri[]).sort(
    (a, b) =>
      a.yevmiye_fisleri.tarih.localeCompare(b.yevmiye_fisleri.tarih) ||
      a.yevmiye_fisleri.fis_no - b.yevmiye_fisleri.fis_no
  );

  // Müşteride borç bakiyesi = bize borcu (alacağımız); tedarikçide alacak bakiyesi = bizim borcumuz.
  const isaret = cari.tur === "musteri" ? 1 : -1;
  const gosterim = satirlar.reduce<{ s: EkstreSatiri; bakiye: number }[]>((liste, s) => {
    const onceki = liste.length ? liste[liste.length - 1].bakiye : 0;
    liste.push({ s, bakiye: onceki + isaret * (Number(s.borc) - Number(s.alacak)) });
    return liste;
  }, []);
  const yuruyen = gosterim.length ? gosterim[gosterim.length - 1].bakiye : 0;
  const toplamBorc = satirlar.reduce((t, s) => t + Number(s.borc), 0);
  const toplamAlacak = satirlar.reduce((t, s) => t + Number(s.alacak), 0);

  function belgeBaglantisi(kaynakId: string | null, tur: string) {
    if (!kaynakId) return null;
    if (alisIdleri.has(kaynakId)) return `/alis/${kaynakId}`;
    if (satisIdleri.has(kaynakId)) return `/satis/${kaynakId}`;
    if (tur === "tahsilat" || tur === "odeme") return "/kasa";
    return null;
  }

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>{cari.unvan}</h1>
          <p>
            {CARI_TURU_ADI[cari.tur].tekil} <span className="kod">{cari.kod}</span>
            {cari.telefon && ` · ${cari.telefon}`}
            {cari.vergi_no && ` · VKN ${cari.vergi_no}`}
            {cari.vade_gun > 0 && ` · vade ${cari.vade_gun} gün`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={`/cariler?tur=${cari.tur}`} className="btn btn-cizgi">
            {CARI_TURU_ADI[cari.tur].cogul}
          </Link>
          <Link href={cari.tur === "musteri" ? "/satis/yeni" : "/alis/yeni"} className="btn btn-ana">
            {cari.tur === "musteri" ? "+ Satış" : "+ Alış"}
          </Link>
        </div>
      </div>

      {duzenlemeYetkisiVarMi(rol) && (
        <details className="kart form-ac" style={{ marginBottom: 16 }}>
          <summary className="kart-ic">
            <span className="btn btn-cizgi">Bilgileri düzenle</span>
            {!cari.aktif && <span className="etk e-gri" style={{ marginLeft: 8 }}>pasif</span>}
          </summary>
          <CariDuzenleFormu cari={cari} />
        </details>
      )}

      <div className="izgara g3" style={{ marginBottom: 16 }}>
        <div className="kart kart-ic metrik">
          <div className="etiket">{cari.tur === "musteri" ? "Alacağımız" : "Borcumuz"}</div>
          <div className={`deger num${yuruyen > 0 ? " kirmizi" : ""}`}>{tl(yuruyen)}</div>
          <div className="alt">{yuruyen < 0 ? "Ters bakiye (fazla ödeme / avans)" : "Güncel bakiye"}</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Toplam borç kaydı</div>
          <div className="deger num">{tl(toplamBorc)}</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Toplam alacak kaydı</div>
          <div className="deger num">{tl(toplamAlacak)}</div>
        </div>
      </div>

      <div className="kart">
        <div className="kart-bas">
          <h2>Cari ekstre</h2>
          <span className="soluk">{satirlar.length} hareket</span>
        </div>
        {satirlar.length === 0 ? (
          <p className="bos">Bu cariyle henüz hareket yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>İşlem</th>
                  <th className="sag">Borç</th>
                  <th className="sag">Alacak</th>
                  <th className="sag">Bakiye</th>
                </tr>
              </thead>
              <tbody>
                {gosterim.map(({ s, bakiye }) => {
                  const f = s.yevmiye_fisleri;
                  const yol = belgeBaglantisi(f.kaynak_id, f.kaynak_tur);
                  return (
                    <tr key={s.id} style={f.kaynak_tur === "iptal" ? { opacity: 0.7 } : undefined}>
                      <td className="num">{tarihTR(f.tarih)}</td>
                      <td data-label="İşlem">
                        <span className={`etk ${f.kaynak_tur === "iptal" ? "e-kirmizi" : "e-gri"}`}>{KAYNAK_ADI[f.kaynak_tur] ?? f.kaynak_tur}</span>{" "}
                        {yol ? <Link href={yol}>{f.aciklama}</Link> : f.aciklama}
                      </td>
                      <td data-label="Borç" className="sag num">
                        {Number(s.borc) > 0 ? tl(s.borc) : ""}
                      </td>
                      <td data-label="Alacak" className="sag num">
                        {Number(s.alacak) > 0 ? tl(s.alacak) : ""}
                      </td>
                      <td data-label="Bakiye" className="sag num">
                        <b>{tl(bakiye)}</b>
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
