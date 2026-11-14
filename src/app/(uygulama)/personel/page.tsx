import Link from "next/link";
import { YeniPersonelFormu } from "@/components/personel/PersonelFormlari";
import { tl, tarihTR } from "@/lib/imece";
import { DURUM_ADI, MAAS_YETKI_NOTU, UCRET_TIPI_ADI, gecerliUcret } from "@/lib/personel";
import { mevcutRol } from "@/lib/rol";
import { maasGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { Personel, PersonelUcreti } from "@/types/database";

export default async function PersonelPage() {
  const rol = await mevcutRol();
  if (!maasGorurMu(rol)) {
    return (
      <div className="kart kart-ic">
        <p className="not">{MAAS_YETKI_NOTU}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: pv }, { data: uv }] = await Promise.all([
    supabase.from("personeller").select("*").order("ad_soyad"),
    supabase.from("personel_ucretleri").select("*"),
  ]);
  const personeller = (pv ?? []) as Personel[];
  const ucretler = (uv ?? []) as PersonelUcreti[];
  const bugun = bugunIstanbul();
  const ay = bugun.slice(0, 7);
  const sira: Record<Personel["durum"], number> = { calisiyor: 0, giris_bekliyor: 1, ayrildi: 2 };
  personeller.sort((a, b) => sira[a.durum] - sira[b.durum] || a.ad_soyad.localeCompare(b.ad_soyad, "tr"));

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Personel ve Puantaj</h1>
          <p>
            Kim kaç gün çalıştı, ne hak etti. Resmi bordro değildir; sigorta, vergi ve net maaş hesabı mali müşavirdedir. Ay sonunda
            puantaj özeti mali müşavire gönderilir.
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={`/personel/puantaj?ay=${ay}`} className="btn btn-ana">
            Puantaj gir
          </Link>
          <Link href={`/personel/ozet?ay=${ay}`} className="btn btn-cizgi">
            Aylık özet
          </Link>
        </div>
      </div>

      <p className="not" style={{ marginBottom: 16 }}>
        {MAAS_YETKI_NOTU}
      </p>

      <YeniPersonelFormu />

      <div className="kart">
        <div className="kart-bas">
          <h2>Personeller</h2>
          <span className="soluk num">{personeller.filter((p) => p.durum === "calisiyor").length} çalışan</span>
        </div>
        {personeller.length === 0 ? (
          <p className="bos">Henüz personel eklenmedi. Yukarıdaki formdan ekleyin.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Ad soyad</th>
                  <th>Durum</th>
                  <th>İşe başlama</th>
                  <th className="sag">Güncel ücret</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {personeller.map((p) => {
                  const u = gecerliUcret(
                    ucretler.filter((x) => x.personel_id === p.id),
                    bugun
                  );
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/personel/${p.id}`}>{p.ad_soyad}</Link>
                      </td>
                      <td className={p.durum === "calisiyor" ? "" : "soluk"}>{DURUM_ADI[p.durum]}</td>
                      <td>{tarihTR(p.ise_baslama)}</td>
                      <td className="sag num">
                        {u ? (
                          `${tl(u.tutar)} · ${UCRET_TIPI_ADI[u.ucret_tipi].toLocaleLowerCase("tr")}`
                        ) : (
                          <span className="soluk">ücret girilmedi</span>
                        )}
                      </td>
                      <td className="sag">
                        <Link href={`/personel/puantaj?ay=${ay}&p=${p.id}`} className="btn btn-cizgi">
                          Puantaj
                        </Link>
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
