import Link from "next/link";
import { AySonuFormu } from "@/components/personel/AySonuFormu";
import { sayi, tl, tarihTR } from "@/lib/imece";
import { ayAdi } from "@/lib/raporlar/tipler";
import { MAAS_YETKI_NOTU, UCRET_TIPI_ADI, ayKaydir } from "@/lib/personel";
import { mevcutRol } from "@/lib/rol";
import { maasGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { MaasAyOzeti } from "@/types/database";

export default async function MaasOzetiPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const rol = await mevcutRol();
  if (!maasGorurMu(rol)) {
    return (
      <div className="kart kart-ic">
        <p className="not">{MAAS_YETKI_NOTU}</p>
      </div>
    );
  }
  const q = await searchParams;
  const ay = q.ay && /^\d{4}-\d{2}$/.test(q.ay) ? q.ay : bugunIstanbul().slice(0, 7);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("maas_ay_ozeti", { p_donem: `${ay}-01` });
  const satirlar = (data ?? []) as MaasAyOzeti[];
  const top = (f: (s: MaasAyOzeti) => number) => satirlar.reduce((a, s) => a + Number(f(s)), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Aylık özet · {ayAdi(ay)}</h1>
          <p>
            Puantajdan hesaplanır. Mali müşavire &quot;Puantaj özeti&quot; gider (gün sayıları, tutarsız); tutarlı liste kooperatifin kendi
            ödemesi içindir.
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={`/personel/ozet?ay=${ayKaydir(ay, -1)}`} className="btn btn-cizgi" aria-label="Önceki ay">
            ‹
          </Link>
          <Link href={`/personel/ozet?ay=${ayKaydir(ay, 1)}`} className="btn btn-cizgi" aria-label="Sonraki ay">
            ›
          </Link>
          <Link href={`/personel/puantaj?ay=${ay}`} className="btn btn-cizgi">
            Puantaj
          </Link>
          <Link href="/personel" className="btn btn-cizgi">
            ← Personel
          </Link>
        </div>
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-ic" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a href={`/api/puantaj-excel?ay=${ay}&tur=musavir`} className="btn btn-ana">
            Mali müşavir puantaj özeti (Excel)
          </a>
          <a href={`/api/puantaj-excel?ay=${ay}&tur=hakedis`} className="btn btn-cizgi">
            Hak ediş listesi, tutarlı (Excel)
          </a>
          <span className="soluk" style={{ fontSize: 12.5 }}>
            Tutarlı listeyi yalnız gerekiyorsa paylaşın; ücretler kişisel veridir.
          </span>
        </div>
      </div>

      {error && <p className="mesaj hata">Özet alınamadı: {error.message}</p>}

      <div className="kart">
        {satirlar.length === 0 ? (
          <p className="bos">Bu ay için puantaj ya da çalışan personel yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Personel</th>
                  <th className="sag">Geldiği gün</th>
                  <th className="sag">Fazla gün / saat</th>
                  <th className="sag">Eksik</th>
                  <th className="sag">İzin / rapor</th>
                  <th className="sag">Resmi / hafta tatili</th>
                  <th className="sag">Hak ediş</th>
                  <th className="sag">Ek ödeme</th>
                  <th className="sag">Düzeltme</th>
                  <th className="sag">Toplam</th>
                  <th>Ödendi</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((s) => (
                  <tr key={s.personel_id}>
                    <td>
                      <Link href={`/personel/puantaj?ay=${ay}&p=${s.personel_id}`}>{s.ad_soyad}</Link>
                      {s.ucret_tipi && <span className="soluk"> · {UCRET_TIPI_ADI[s.ucret_tipi].toLocaleLowerCase("tr")}</span>}
                      {s.ucretsiz_gun > 0 && <div className="mesaj hata">{s.ucretsiz_gun} günün ücreti tanımlı değil</div>}
                    </td>
                    <td className="sag num">{s.calisilan_gun}</td>
                    <td className="sag num">
                      {s.ucret_tipi === "saatlik" ? `${sayi(s.toplam_miktar)} saat` : sayi(s.fazla_gun)}
                    </td>
                    <td className="sag num">{s.eksik_gun}</td>
                    <td className="sag num">
                      {s.izinli_gun} / {s.raporlu_gun}
                    </td>
                    <td className="sag num">
                      {s.resmi_tatil} / {s.hafta_tatili}
                    </td>
                    <td className="sag num">{tl(s.hak_edis)}</td>
                    <td className="sag num">{tl(s.ek_odeme)}</td>
                    <td className="sag num">
                      {Number(s.duzeltme) !== 0 && tl(s.duzeltme)}
                      {s.duzeltme_aciklama && <div className="soluk">{s.duzeltme_aciklama}</div>}
                    </td>
                    <td className="sag num">
                      <strong>{tl(s.toplam)}</strong>
                    </td>
                    <td>
                      <AySonuFormu personelId={s.personel_id} ay={ay} ozet={s} />
                      {s.odendi_tarihi && <span className="soluk">✓ {tarihTR(s.odendi_tarihi)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="toplam">
                  <td>Toplam</td>
                  <td colSpan={5} />
                  <td className="sag num">{tl(top((s) => s.hak_edis))}</td>
                  <td className="sag num">{tl(top((s) => s.ek_odeme))}</td>
                  <td className="sag num">{tl(top((s) => s.duzeltme))}</td>
                  <td className="sag num">{tl(top((s) => s.toplam))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
