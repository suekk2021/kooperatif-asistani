"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { puantajKaydet, type PuantajSatiri } from "@/app/actions/personel";
import { FormMesaji } from "@/components/FormMesaji";
import { tl } from "@/lib/imece";
import { GUN_TURLERI, GUN_TURU_ADI, ayinGunleri, gecerliUcret, gunAdi, pazarMi } from "@/lib/personel";
import type { GunTuru, PersonelEkOdemesi, PersonelUcreti, PuantajGunu } from "@/types/database";

type Hucre = { gun_turu: GunTuru; miktar: string; elle: string; aciklama: string };
const BOS: Hucre = { gun_turu: "calisti", miktar: "", elle: "", aciklama: "" };

/** "1,5" / "1.5" -> 1.5; boşsa null; geçersizse NaN. */
function sayiOku(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

function sayiYaz(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n).replace(".", ",");
}

function ayni(a: Hucre, b: Hucre) {
  return (
    a.gun_turu === b.gun_turu &&
    (sayiOku(a.miktar) ?? 0) === (sayiOku(b.miktar) ?? 0) &&
    sayiOku(a.elle) === sayiOku(b.elle) &&
    a.aciklama.trim() === b.aciklama.trim()
  );
}

export function PuantajTablosu({
  personelId,
  ay,
  ucretler,
  ekler,
  gunler,
}: {
  personelId: string;
  ay: string;
  ucretler: PersonelUcreti[];
  ekler: PersonelEkOdemesi[];
  gunler: PuantajGunu[];
}) {
  const tarihler = useMemo(() => ayinGunleri(ay), [ay]);
  const ilk = useMemo(() => {
    const m: Record<string, Hucre> = {};
    for (const g of gunler) {
      m[g.tarih] = { gun_turu: g.gun_turu, miktar: sayiYaz(g.miktar), elle: sayiYaz(g.elle_tutar), aciklama: g.aciklama ?? "" };
    }
    return m;
  }, [gunler]);
  const [kayitli, setKayitli] = useState(ilk);
  const [hucreler, setHucreler] = useState(ilk);
  const [doldurMiktar, setDoldurMiktar] = useState("1");
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, basla] = useTransition();

  const hucre = (t: string) => hucreler[t] ?? BOS;
  const degisenler = tarihler.filter((t) => !ayni(hucre(t), kayitli[t] ?? BOS));
  const hataliGun = tarihler.find((t) => {
    const m = sayiOku(hucre(t).miktar);
    const e = sayiOku(hucre(t).elle);
    return (m !== null && (Number.isNaN(m) || m < 0 || m > 24)) || (e !== null && (Number.isNaN(e) || e < 0));
  });

  useEffect(() => {
    if (degisenler.length === 0) return;
    const uyar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", uyar);
    return () => window.removeEventListener("beforeunload", uyar);
  }, [degisenler.length]);

  function degistir(t: string, alan: keyof Hucre, deger: string) {
    setSonuc({});
    setHucreler((h) => ({ ...h, [t]: { ...(h[t] ?? BOS), [alan]: deger } }));
  }

  function boslariDoldur() {
    setSonuc({});
    setHucreler((h) => {
      const yeni = { ...h };
      for (const t of tarihler) {
        if (yeni[t] && (yeni[t].miktar.trim() !== "" || yeni[t].gun_turu !== "calisti")) continue;
        yeni[t] = pazarMi(t)
          ? { ...BOS, gun_turu: "hafta_tatili", miktar: "0" }
          : { ...(yeni[t] ?? BOS), miktar: doldurMiktar };
      }
      return yeni;
    });
  }

  function kaydet() {
    const satirlar: PuantajSatiri[] = degisenler.map((t) => {
      const h = hucre(t);
      return {
        tarih: t,
        gun_turu: h.gun_turu,
        miktar: sayiOku(h.miktar) ?? 0,
        elle_tutar: sayiOku(h.elle),
        aciklama: h.aciklama.trim() || null,
      };
    });
    basla(async () => {
      const s = await puantajKaydet(personelId, ay, satirlar);
      setSonuc(s);
      if (s.basarili) setKayitli(hucreler);
    });
  }

  // Ekrandaki hesap; asıl hesap veritabanındaki maas_ay_ozeti (aynı kural).
  let toplamMiktar = 0;
  let hakEdis = 0;
  let gelinen = 0;
  let ucretsiz = 0;
  const satirTutari: Record<string, number | null> = {};
  for (const t of tarihler) {
    const h = hucre(t);
    const m = sayiOku(h.miktar) ?? 0;
    const e = sayiOku(h.elle);
    const u = gecerliUcret(ucretler, t);
    if (Number.isNaN(m) || (e !== null && Number.isNaN(e))) {
      satirTutari[t] = null;
      continue;
    }
    toplamMiktar += m;
    if (m > 0) gelinen++;
    if (m > 0 && !u && e === null) ucretsiz++;
    const tutar = e ?? Math.round(m * (u?.tutar ?? 0) * 100) / 100;
    satirTutari[t] = m > 0 || e !== null ? tutar : null;
    hakEdis += tutar;
  }
  const ayBas = tarihler[0];
  const aySon = tarihler[tarihler.length - 1];
  let ekToplam = 0;
  for (const e of ekler) {
    if (e.baslangic > aySon || (e.bitis && e.bitis < ayBas)) continue;
    if (e.birim === "aylik") ekToplam += Number(e.tutar);
    else {
      const gun = tarihler.filter(
        (t) => t >= e.baslangic && (!e.bitis || t <= e.bitis) && (sayiOku(hucre(t).miktar) ?? 0) > 0
      ).length;
      ekToplam += Number(e.tutar) * gun;
    }
  }
  const saatlik = gecerliUcret(ucretler, aySon)?.ucret_tipi === "saatlik";

  return (
    <>
      <div className="kart-ic" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="soluk" style={{ fontSize: 13.5 }}>
          Boş günlere
        </span>
        <input
          value={doldurMiktar}
          onChange={(e) => setDoldurMiktar(e.target.value)}
          inputMode="decimal"
          style={{ width: 64 }}
          aria-label="Boş günlere yazılacak değer"
        />
        <span className="soluk" style={{ fontSize: 13.5 }}>
          {saatlik ? "saat" : "gün"} yaz, pazarları hafta tatili yap
        </span>
        <button type="button" className="btn btn-cizgi" onClick={boslariDoldur}>
          Doldur
        </button>
        <span className="soluk" style={{ fontSize: 12.5 }}>
          (Yalnız boş günler dolar; kaydetmeden önce gelmediği günleri düzeltin.)
        </span>
      </div>
      {ucretler.length === 0 && (
        <p className="mesaj hata" style={{ margin: "0 16px" }}>
          Bu kişinin ücreti girilmemiş; tutarlar 0 görünür. Kişinin kartından ücret ekleyin.
        </p>
      )}
      <div className="tablo-kutu">
        <table className="kart-tablo">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Gün türü</th>
              <th className="sag">{saatlik ? "Saat" : "Gün"}</th>
              <th className="sag">Elle tutar</th>
              <th className="sag">Tutar</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {tarihler.map((t) => {
              const h = hucre(t);
              const degisti = !ayni(h, kayitli[t] ?? BOS);
              return (
                <tr key={t} style={degisti ? { background: "var(--secim, rgba(255, 200, 0, 0.12))" } : undefined}>
                  <td className={pazarMi(t) ? "soluk" : ""} style={{ whiteSpace: "nowrap" }}>
                    {t.slice(8)} {gunAdi(t)}
                  </td>
                  <td>
                    <select value={h.gun_turu} onChange={(e) => degistir(t, "gun_turu", e.target.value)} aria-label={`${t} gün türü`}>
                      {GUN_TURLERI.map((g) => (
                        <option key={g} value={g}>
                          {GUN_TURU_ADI[g]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="sag">
                    <input
                      value={h.miktar}
                      onChange={(e) => degistir(t, "miktar", e.target.value)}
                      inputMode="decimal"
                      style={{ width: 64, textAlign: "right" }}
                      aria-label={`${t} ${saatlik ? "saat" : "gün"}`}
                    />
                  </td>
                  <td className="sag">
                    <input
                      value={h.elle}
                      onChange={(e) => degistir(t, "elle", e.target.value)}
                      inputMode="decimal"
                      placeholder="—"
                      style={{ width: 90, textAlign: "right" }}
                      aria-label={`${t} elle tutar`}
                    />
                  </td>
                  <td className="sag num">{satirTutari[t] === null ? "" : tl(satirTutari[t])}</td>
                  <td>
                    <input
                      value={h.aciklama}
                      onChange={(e) => degistir(t, "aciklama", e.target.value)}
                      style={{ minWidth: 140 }}
                      aria-label={`${t} açıklama`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="toplam">
              <td colSpan={2}>Toplam ({gelinen} gün geldi)</td>
              <td className="sag num">{sayiYaz(Math.round(toplamMiktar * 100) / 100)}</td>
              <td />
              <td className="sag num">{tl(hakEdis)}</td>
              <td />
            </tr>
            <tr>
              <td colSpan={4}>Ek ödemeler (yol, sigorta parası…)</td>
              <td className="sag num">{tl(ekToplam)}</td>
              <td />
            </tr>
            <tr className="toplam">
              <td colSpan={4}>Bu ay hak ediş (avans/kesinti hariç)</td>
              <td className="sag num">{tl(hakEdis + ekToplam)}</td>
              <td className="soluk" style={{ fontSize: 12.5 }}>
                Avans/kesinti ve &quot;ödendi&quot; Aylık özet ekranında.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {ucretsiz > 0 && (
        <p className="mesaj hata" style={{ margin: "8px 16px 0" }}>
          {ucretsiz} gün için geçerli ücret yok (ücretin başlangıç tarihi bu günlerden sonra). Kişinin kartından ücret tarihini kontrol edin.
        </p>
      )}
      <div className="kart-ic" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ana" onClick={kaydet} disabled={bekliyor || degisenler.length === 0 || Boolean(hataliGun)}>
          {bekliyor ? "Kaydediliyor…" : degisenler.length ? `Kaydet (${degisenler.length} gün)` : "Kaydedildi"}
        </button>
        {hataliGun && (
          <span className="mesaj hata">
            {hataliGun.slice(8)}. gün: sayı geçersiz (gün/saat 0–24, tutar 0 veya üstü).
          </span>
        )}
        <FormMesaji sonuc={sonuc} />
      </div>
    </>
  );
}
