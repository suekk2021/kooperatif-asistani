import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mevcutRol } from "@/lib/rol";
import { bugunIstanbul } from "@/lib/tarih";
import { tl, sayi, tarihTR } from "@/lib/imece";
import { yuzde } from "@/lib/uretim";
import { RAPORLAR, raporKodu, raporUret } from "@/lib/raporlar";
import { donemCoz, type Hucre, type SutunTuru } from "@/lib/raporlar/tipler";

function hucreYazisi(v: Hucre, tur: SutunTuru): string {
  if (v === null || v === "") return "";
  if (typeof v === "string") return tur === "tarih" ? tarihTR(v) : v;
  if (tur === "tl") return tl(v);
  if (tur === "yuzde") return yuzde(v);
  return sayi(v);
}

const SAYISAL: SutunTuru[] = ["tl", "sayi", "yuzde"];

export default async function RaporlarPage({ searchParams }: { searchParams: Promise<{ r?: string; ay?: string }> }) {
  const rol = await mevcutRol();
  if (rol === "depo") redirect("/panel");

  const { r, ay } = await searchParams;
  const kod = raporKodu(r);
  const bugun = bugunIstanbul();
  const donem = donemCoz(ay, bugun);
  const tanim = RAPORLAR.find((x) => x.kod === kod)!;
  const rapor = await raporUret(await createClient(), kod, donem, bugun);
  const excelAdresi = `/api/rapor-excel?r=${kod}&ay=${donem.ay}`;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Raporlar</h1>
          <p>
            {rapor.baslik} · {rapor.donemYazisi}
          </p>
        </div>
        <div className="ust-araclar">
          {tanim.donemli && (
            <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="hidden" name="r" value={kod} />
              <input type="month" name="ay" defaultValue={donem.ay} max={bugun.slice(0, 7)} aria-label="Dönem" style={{ minHeight: 38 }} />
              <button type="submit" className="btn btn-cizgi">
                Göster
              </button>
            </form>
          )}
          <a href={excelAdresi} className="btn" download>
            Excel indir
          </a>
        </div>
      </div>

      <div className="sekmeler">
        {RAPORLAR.map((x) => (
          <Link key={x.kod} href={`/raporlar?r=${x.kod}${x.donemli ? `&ay=${donem.ay}` : ""}`} className={x.kod === kod ? "aktif" : undefined} title={x.aciklama}>
            {x.ad}
          </Link>
        ))}
      </div>

      {rapor.bolumler.map((b) => (
        <div className="kart" key={b.baslik} style={{ marginBottom: 16 }}>
          <div className="kart-bas">
            <h2>{b.baslik}</h2>
            <span className="soluk">{b.satirlar.length} satır</span>
          </div>
          {b.satirlar.length === 0 ? (
            <p className="bos">Bu dönemde kayıt yok.</p>
          ) : (
            <div className="tablo-kutu">
              <table className="kart-tablo">
                <thead>
                  <tr>
                    {b.sutunlar.map((s) => (
                      <th key={s.ad} className={SAYISAL.includes(s.tur) ? "sag" : undefined}>
                        {s.ad}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.satirlar.map((satir, i) => {
                    const yol = b.baglantilar?.[i];
                    return (
                      <tr key={i}>
                        {satir.map((v, j) => {
                          const s = b.sutunlar[j];
                          const yazi = hucreYazisi(v, s.tur);
                          return (
                            <td key={j} data-label={s.ad} className={SAYISAL.includes(s.tur) ? "sag num" : undefined}>
                              {yol && j === 1 ? <Link href={yol}>{yazi}</Link> : yazi}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {b.toplam && (
                    <tr style={{ fontWeight: 800 }}>
                      {b.toplam.map((v, j) => (
                        <td key={j} data-label={b.sutunlar[j].ad} className={SAYISAL.includes(b.sutunlar[j].tur) ? "sag num" : undefined}>
                          {hucreYazisi(v, b.sutunlar[j].tur)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {rapor.notlar.length > 0 && (
        <div className="not">
          {rapor.notlar.map((n) => (
            <p key={n} style={{ margin: "4px 0" }}>
              {n}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
