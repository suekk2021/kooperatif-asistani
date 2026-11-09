import { tl } from "@/lib/imece";
import { createClient } from "@/lib/supabase/server";
import type { Hesap, HesapBakiyesi } from "@/types/database";

const SINIFLAR: Record<string, string> = {
  "1": "Dönen varlıklar",
  "2": "Duran varlıklar",
  "3": "Kısa vadeli yabancı kaynaklar",
  "4": "Uzun vadeli yabancı kaynaklar",
  "5": "Özkaynaklar",
  "6": "Gelir tablosu",
  "7": "Maliyet hesapları (7/A)",
};

export default async function HesapPlaniPage() {
  const supabase = await createClient();
  const [{ data: hesaplar }, { data: bakiyeler }] = await Promise.all([
    supabase.from("hesap_plani").select("*").order("kod"),
    supabase.from("hesap_bakiyeleri").select("*"),
  ]);
  const liste = (hesaplar ?? []) as Hesap[];
  const bakiyeMap = new Map(((bakiyeler ?? []) as HesapBakiyesi[]).map((b) => [b.kod, b]));
  const siniflar = Object.keys(SINIFLAR).filter((s) => liste.some((h) => h.kod.startsWith(s)));

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Hesap Planı</h1>
          <p>
            Tek Düzen Hesap Planı. Cari, stok ve banka alt hesapları kart açıldıkça otomatik eklenir. Toplam {liste.length}{" "}
            hesap.
          </p>
        </div>
      </div>

      <div className="kart">
        {siniflar.map((s) => {
          const grup = liste.filter((h) => h.kod.startsWith(s));
          return (
            <details key={s} className="hp" open={s === "1" || s === "3"}>
              <summary>
                <span className="grup-no">{s}</span>
                {SINIFLAR[s]} <small>{grup.length} hesap</small>
              </summary>
              <div className="tablo-kutu">
                <table className="kart-tablo">
                  <thead>
                    <tr>
                      <th>Kod</th>
                      <th>Hesap adı</th>
                      <th className="sag">Borç</th>
                      <th className="sag">Alacak</th>
                      <th className="sag">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grup.map((h) => {
                      const b = bakiyeMap.get(h.kod);
                      const seviye = h.kod.split(".").length - 1;
                      return (
                        <tr key={h.kod} style={h.aktif ? undefined : { opacity: 0.5 }}>
                          <td style={{ paddingLeft: 14 + seviye * 18 }}>
                            <span className="kod">{h.kod}</span>
                          </td>
                          <td data-label="Hesap">
                            {seviye === 0 ? <b>{h.ad}</b> : h.ad}
                            {h.aciklama && seviye === 0 && (
                              <span className="soluk" style={{ fontSize: 12.5 }}>
                                {" "}
                                · {h.aciklama}
                              </span>
                            )}
                          </td>
                          <td data-label="Borç" className="sag num">
                            {b && Number(b.borc) ? tl(b.borc) : ""}
                          </td>
                          <td data-label="Alacak" className="sag num">
                            {b && Number(b.alacak) ? tl(b.alacak) : ""}
                          </td>
                          <td data-label="Bakiye" className="sag num">
                            {b && Number(b.bakiye) ? tl(b.bakiye) : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </div>

      <div className="soru-kutu">
        <h3>Muhasebeci kararları (9 Kasım 2026)</h3>
        <ol>
          <li>Maliyet sistemi 7/A.</li>
          <li>Kartlı satış 108&apos;de izlenir; POS komisyonu 780&apos;e yazılır.</li>
          <li>Şirket kredi kartı 300&apos;de alt hesap olarak tutulur.</li>
          <li>Cari kodu ile muhasebe kodu birebir aynıdır (müşteri 120, tedarikçi 320).</li>
          <li>Fire için oran belirtilmez; normalin üstündeki fireyi 689&apos;a alma kararı muhasebecidedir.</li>
          <li>
            <b>Açık:</b> Mikro içe aktarma Excel şablonu bekleniyor.
          </li>
        </ol>
      </div>
    </>
  );
}
