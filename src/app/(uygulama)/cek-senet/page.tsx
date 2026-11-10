import Link from "next/link";
import { YeniEvrakFormu } from "@/components/cek-senet/EvrakFormlari";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { tarihTR, tl } from "@/lib/imece";
import { EVRAK_DURUM, VADE_UYARI_GUN, evrakAdi } from "@/lib/cek-senet";
import { islemIzni, oturum } from "@/lib/yetki";

const SEKMELER = [
  { id: "alinan", ad: "Portföy (alınan)", acik: ["portfoyde"] },
  { id: "verilen", ad: "Ödenecek (verilen)", acik: ["odenmedi"] },
  { id: "kapanan", ad: "Kapananlar", acik: [] as string[] },
] as const;

function gunEkle(t: string, g: number) {
  const d = new Date(`${t}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + g);
  return d.toISOString().slice(0, 10);
}

export default async function CekSenetPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  const { sekme: s } = await searchParams;
  const sekme = SEKMELER.find((x) => x.id === s) ?? SEKMELER[0];
  const bugun = bugunIstanbul();
  const supabase = await createClient();
  const kim = await oturum();

  let sorgu = supabase.from("evraklar").select("id, evrak_no, tur, yon, cari_id, tutar, vade, seri_no, banka, durum, cariler(unvan, kod)");
  if (sekme.id === "kapanan") sorgu = sorgu.not("durum", "in", "(portfoyde,odenmedi)").order("vade", { ascending: false }).limit(200);
  else sorgu = sorgu.eq("durum", sekme.acik[0]).order("vade");
  const [{ data: evraklar }, { data: acikToplamlar }, { data: cariler }] = await Promise.all([
    sorgu,
    supabase.from("evraklar").select("yon, tutar").in("durum", ["portfoyde", "odenmedi"]),
    supabase.from("cariler").select("id, unvan, kod, tur").eq("aktif", true).order("unvan"),
  ]);
  const portfoy = (acikToplamlar ?? []).filter((e) => e.yon === "alinan").reduce((t, e) => t + Number(e.tutar), 0);
  const odenecek = (acikToplamlar ?? []).filter((e) => e.yon === "verilen").reduce((t, e) => t + Number(e.tutar), 0);
  const uyariSiniri = gunEkle(bugun, VADE_UYARI_GUN);
  const girebilir = kim && islemIzni(kim.rol, "kasa");

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Çek / Senet</h1>
          <p>Müşteriden alınan ve tedarikçiye verilen çek ve senetler, vadeleri ve durumları.</p>
        </div>
      </div>

      <div className="izgara g4" style={{ marginBottom: 16 }}>
        <div className="kart kart-ic metrik">
          <div className="etiket">Portföyde (tahsil edilecek)</div>
          <div className="deger num">{tl(portfoy)}</div>
          <div className="alt">müşterilerden alınan, vadesi bekleyen</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Ödenecek (verdiğimiz)</div>
          <div className="deger num">{tl(odenecek)}</div>
          <div className="alt">vadesinde hesabımızdan çıkacak</div>
        </div>
      </div>

      {girebilir && (
        <div style={{ marginBottom: 16 }}>
          <YeniEvrakFormu cariler={(cariler ?? []) as { id: string; unvan: string; kod: string; tur: "musteri" | "tedarikci" }[]} bugun={bugun} />
        </div>
      )}

      <div className="sekmeler">
        {SEKMELER.map((x) => (
          <Link key={x.id} href={`/cek-senet?sekme=${x.id}`} className={x.id === sekme.id ? "aktif" : undefined}>
            {x.ad}
          </Link>
        ))}
      </div>

      <div className="kart">
        {(evraklar ?? []).length === 0 ? (
          <p className="bos">Bu bölümde çek/senet yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Vade</th>
                  <th>Evrak</th>
                  <th>Cari</th>
                  <th className="sag">Tutar</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {(evraklar ?? []).map((e) => {
                  const cari = (Array.isArray(e.cariler) ? e.cariler[0] : e.cariler) as { unvan: string; kod: string } | null;
                  const acik = e.durum === "portfoyde" || e.durum === "odenmedi";
                  const gecti = acik && e.vade < bugun;
                  const yakin = acik && !gecti && e.vade <= uyariSiniri;
                  const d = EVRAK_DURUM[e.durum] ?? { ad: e.durum, renk: "e-gri" };
                  return (
                    <tr key={e.id}>
                      <td data-label="Vade" className={gecti ? "kirmizi" : yakin ? "amber" : undefined}>
                        {tarihTR(e.vade)}
                        {gecti ? " · geçti" : yakin ? " · yaklaştı" : ""}
                      </td>
                      <td data-label="Evrak">
                        <Link href={`/cek-senet/${e.id}`}>
                          <b>
                            {evrakAdi(e.tur)} #{e.evrak_no}
                          </b>
                        </Link>
                        {(e.seri_no || e.banka) && <span className="soluk"> · {[e.seri_no, e.banka].filter(Boolean).join(" · ")}</span>}
                      </td>
                      <td data-label="Cari">
                        {cari?.unvan} <span className="kod">{cari?.kod}</span>
                      </td>
                      <td data-label="Tutar" className="sag num">
                        {tl(e.tutar)}
                      </td>
                      <td data-label="Durum">
                        <span className={`etk ${d.renk}`}>{d.ad}</span>
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
