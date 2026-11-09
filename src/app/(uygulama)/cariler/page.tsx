import Link from "next/link";
import { YeniCariFormu } from "@/components/cari/YeniCariFormu";
import { CARI_TURU_ADI, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Cari, CariTuru, HesapBakiyesi } from "@/types/database";

export default async function CarilerPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; pasif?: string }>;
}) {
  const { tur: turParam, pasif } = await searchParams;
  const pasifler = pasif === "1";
  const tur: CariTuru = turParam === "tedarikci" ? "tedarikci" : "musteri";

  const supabase = await createClient();
  const [{ data: cariler }, rol] = await Promise.all([
    supabase.from("cariler").select("*").eq("aktif", !pasifler).order("kod"),
    mevcutRol(),
  ]);
  const tumu = (cariler ?? []) as Cari[];
  const liste = tumu.filter((c) => c.tur === tur);

  const { data: bakiyeler } = liste.length
    ? await supabase.from("hesap_bakiyeleri").select("*").in("kod", liste.map((c) => c.kod))
    : { data: [] };
  const bakiyeMap = new Map(((bakiyeler ?? []) as HesapBakiyesi[]).map((b) => [b.kod, Number(b.bakiye)]));

  // Müşteride borç bakiyesi = bize borçlu (alacağımız); tedarikçide alacak bakiyesi = bizim borcumuz.
  const isaret = tur === "musteri" ? 1 : -1;
  const toplam = liste.reduce((t, c) => t + isaret * (bakiyeMap.get(c.kod) ?? 0), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Cariler</h1>
          <p>Müşteri ve tedarikçi kartları. Kart kodu, Mikro&apos;daki muhasebe koduyla birebir aynıdır.</p>
        </div>
      </div>

      <div className="sekmeler">
        {(["musteri", "tedarikci"] as CariTuru[]).map((t) => (
          <Link key={t} href={`/cariler?tur=${t}${pasifler ? "&pasif=1" : ""}`} className={t === tur ? "aktif" : undefined}>
            {CARI_TURU_ADI[t].cogul} <small>{tumu.filter((c) => c.tur === t).length}</small>
          </Link>
        ))}
        <Link
          href={pasifler ? `/cariler?tur=${tur}` : `/cariler?tur=${tur}&pasif=1`}
          className={pasifler ? "aktif" : undefined}
          style={{ marginLeft: "auto" }}
        >
          {pasifler ? "← Aktif cariler" : "Pasif cariler"}
        </Link>
      </div>

      {duzenlemeYetkisiVarMi(rol) && !pasifler && <YeniCariFormu key={tur} tur={tur} />}

      <div className="kart">
        <div className="kart-bas">
          <h2>{CARI_TURU_ADI[tur].cogul}</h2>
          <span className="soluk num">
            {tur === "musteri" ? "Toplam alacağımız" : "Toplam borcumuz"}: <b>{tl(toplam)}</b>
          </span>
        </div>
        {liste.length === 0 ? (
          <p className="bos">
            Henüz {CARI_TURU_ADI[tur].tekil.toLocaleLowerCase("tr-TR")} kartı yok. Yukarıdaki düğmeyle ilkini ekleyin.
          </p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Ünvan</th>
                  <th>Kod</th>
                  <th>Telefon</th>
                  <th>Vergi no</th>
                  <th className="sag">Vade</th>
                  <th className="sag">{tur === "musteri" ? "Alacağımız" : "Borcumuz"}</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((c) => {
                  const bakiye = isaret * (bakiyeMap.get(c.kod) ?? 0);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/cariler/${c.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                          {c.unvan}
                        </Link>
                      </td>
                      <td data-label="Kod">
                        <span className="kod">{c.kod}</span>
                      </td>
                      <td data-label="Telefon">{c.telefon}</td>
                      <td data-label="Vergi no">{c.vergi_no}</td>
                      <td data-label="Vade" className="sag num">
                        {c.vade_gun ? `${c.vade_gun} gün` : "Peşin"}
                      </td>
                      <td data-label={tur === "musteri" ? "Alacağımız" : "Borcumuz"} className="sag num">
                        <b className={bakiye < 0 ? "kirmizi" : undefined}>{tl(bakiye)}</b>
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
        Bakiye, alış/satış/tahsilat/ödeme kayıtlarından otomatik hesaplanır; cari adına tıklayınca ekstre açılır.
        Programdan önceki borç/alacak (açılış bakiyesi) ayrıca girilecek.
      </p>
    </>
  );
}
