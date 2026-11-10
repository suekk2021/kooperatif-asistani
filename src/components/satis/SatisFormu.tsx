"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { satisKaydet } from "@/app/actions/satis";
import { FormMesaji } from "@/components/FormMesaji";
import { PARA_HESABI_TURU_ADI, sayi, tl } from "@/lib/imece";
import type { Cari, KasaBankaHesabi, KdvOrani, StokKarti } from "@/types/database";

export type SatilabilirUrun = Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "kdv_orani" | "tur" | "satis_fiyati"> & {
  stok: number;
  ortalama: number;
};

type Kalem = { anahtar: number; urunAdi: string; lot: string; miktar: string; fiyat: string; kdv: number; isk: string };

function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}
const yuvarla = (n: number) => Math.round(n * 100) / 100;

let sayac = 0;
const bosKalem = (): Kalem => ({ anahtar: ++sayac, urunAdi: "", lot: "", miktar: "", fiyat: "", kdv: 1, isk: "" });
/** Boş = 0; geçersiz ya da 0–99,99 dışı = NaN. */
function iskontoCoz(s: string): number {
  if (!s.trim()) return 0;
  const n = sayiCoz(s);
  return n >= 0 && n < 100 ? n : NaN;
}

export function SatisFormu({
  musteriler,
  urunler,
  kdvOranlari,
  tahsilatHesaplari,
  hesapAdlari,
  bugun,
}: {
  musteriler: Pick<Cari, "id" | "unvan" | "kod" | "vade_gun">[];
  urunler: SatilabilirUrun[];
  kdvOranlari: KdvOrani[];
  tahsilatHesaplari: KasaBankaHesabi[];
  hesapAdlari: Record<string, string>;
  bugun: string;
}) {
  const router = useRouter();
  const [cariId, setCariId] = useState("");
  const [belgeNo, setBelgeNo] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [vade, setVade] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [odeme, setOdeme] = useState("");
  const [genelIsk, setGenelIsk] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([bosKalem()]);
  const [sonuc, setSonuc] = useState<FormSonucu & { id?: string }>({});
  const [bekliyor, baslat] = useTransition();

  const urunAdla = useMemo(() => new Map(urunler.map((u) => [u.ad.toLocaleLowerCase("tr-TR").trim(), u])), [urunler]);
  const kdvKodu = useMemo(() => new Map(kdvOranlari.map((k) => [Number(k.oran), k.hesaplanan_kod])), [kdvOranlari]);
  const cari = musteriler.find((m) => m.id === cariId);

  function guncelle(anahtar: number, d: Partial<Kalem>) {
    setKalemler((ks) =>
      ks.map((k) => {
        if (k.anahtar !== anahtar) return k;
        const yeni = { ...k, ...d };
        if (d.urunAdi !== undefined) {
          const u = urunAdla.get(d.urunAdi.toLocaleLowerCase("tr-TR").trim());
          if (u) {
            yeni.kdv = Number(u.kdv_orani);
            if (!k.fiyat && u.satis_fiyati !== null) yeni.fiyat = String(Number(u.satis_fiyati)).replace(".", ",");
          }
        }
        return yeni;
      })
    );
  }

  // Aynı ürün birden fazla satırdaysa stok uyarısı toplam miktara göre verilir.
  const kullanilan = new Map<string, number>();
  const genelOran = iskontoCoz(genelIsk);
  // Veritabanındaki satis_kaydet ile aynı hesap: net = miktar × fiyat × (1 − satır%) × (1 − genel%).
  const hesaplanan = kalemler.map((k) => {
    const urun = urunAdla.get(k.urunAdi.toLocaleLowerCase("tr-TR").trim());
    const miktar = sayiCoz(k.miktar);
    const fiyat = sayiCoz(k.fiyat);
    const isk = iskontoCoz(k.isk);
    const gecerli = Number.isFinite(miktar) && Number.isFinite(fiyat);
    const brut = gecerli ? yuvarla(miktar * fiyat) : 0;
    const tutar = gecerli && Number.isFinite(isk) && Number.isFinite(genelOran) ? yuvarla(miktar * fiyat * (1 - isk / 100) * (1 - genelOran / 100)) : brut;
    const iskonto = yuvarla(brut - tutar);
    const kdvTutari = yuvarla((tutar * k.kdv) / 100);
    const onceki = urun ? kullanilan.get(urun.id) ?? 0 : 0;
    if (urun && Number.isFinite(miktar)) kullanilan.set(urun.id, onceki + miktar);
    const yetersiz = urun && Number.isFinite(miktar) ? onceki + miktar > urun.stok : false;
    const maliyet = urun && Number.isFinite(miktar) ? yuvarla(urun.ortalama * miktar) : 0;
    return { k, urun, miktar, fiyat, isk, brut, tutar, iskonto, kdvTutari, yetersiz, maliyet };
  });
  const iskontoToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.iskonto, 0));
  const brutToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.brut, 0));
  const ara = yuvarla(hesaplanan.reduce((t, h) => t + h.tutar, 0));
  const kdvToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.kdvTutari, 0));
  const genel = yuvarla(ara + kdvToplam);
  const maliyetToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.maliyet, 0));

  const onizleme: { kod: string; borc: number; alacak: number }[] = [];
  if (cari && genel > 0) onizleme.push({ kod: cari.kod, borc: genel, alacak: 0 });
  if (iskontoToplam > 0) onizleme.push({ kod: "611", borc: iskontoToplam, alacak: 0 });
  if (brutToplam > 0) onizleme.push({ kod: "600.01", borc: 0, alacak: brutToplam });
  const kdvMap = new Map<string, number>();
  for (const h of hesaplanan) {
    const kk = kdvKodu.get(h.k.kdv);
    if (kk && h.kdvTutari > 0) kdvMap.set(kk, yuvarla((kdvMap.get(kk) ?? 0) + h.kdvTutari));
  }
  for (const [kod, t] of kdvMap) onizleme.push({ kod, borc: 0, alacak: t });
  const maliyetMap = new Map<string, number>();
  const stokMap = new Map<string, number>();
  for (const h of hesaplanan) {
    if (!h.urun || h.maliyet <= 0) continue;
    const mk = h.urun.tur === "mamul" ? "620.01" : "621";
    maliyetMap.set(mk, yuvarla((maliyetMap.get(mk) ?? 0) + h.maliyet));
    stokMap.set(h.urun.kod, yuvarla((stokMap.get(h.urun.kod) ?? 0) + h.maliyet));
  }
  for (const [kod, t] of maliyetMap) onizleme.push({ kod, borc: t, alacak: 0 });
  for (const [kod, t] of stokMap) onizleme.push({ kod, borc: 0, alacak: t });

  function kaydet() {
    if (!cariId) return setSonuc({ hata: "Müşteri seçin." });
    if (genel <= 0) return setSonuc({ hata: "En az bir üründe miktar ve birim fiyat girin." });
    if (!Number.isFinite(genelOran)) return setSonuc({ hata: "Genel iskonto 0 ile 99 arasında bir yüzde olmalı." });
    const yanlisIsk = hesaplanan.findIndex((h) => !Number.isFinite(h.isk));
    if (yanlisIsk !== -1) return setSonuc({ hata: `${yanlisIsk + 1}. satırdaki iskonto 0 ile 99 arasında bir yüzde olmalı.` });
    const eksik = hesaplanan.findIndex((h) => !h.urun);
    if (eksik !== -1) {
      setSonuc({ hata: `${eksik + 1}. satırdaki ürün bulunamadı. Listeden seçin (sadece "Ürün" ve "Ticari mal" kartları satılır).` });
      return;
    }
    baslat(async () => {
      const s = await satisKaydet({
        cari_id: cariId,
        belge_no: belgeNo || undefined,
        tarih,
        vade_tarihi: vade || undefined,
        aciklama: aciklama || undefined,
        odeme_hesap_id: odeme || null,
        genel_iskonto_orani: genelOran,
        kalemler: hesaplanan.map((h) => ({
          stok_karti_id: h.urun!.id,
          lot_no: h.k.lot || undefined,
          miktar: h.miktar,
          birim_fiyat: h.fiyat,
          kdv_orani: h.k.kdv,
          iskonto_orani: h.isk,
        })),
      });
      setSonuc(s);
      if (s.id) router.push(`/satis/${s.id}`);
    });
  }

  return (
    <>
      <div className="kart kart-ic" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="form-satir">
          <div className="alan" style={{ flex: "2 1 260px" }}>
            <label htmlFor="cari">Müşteri *</label>
            <select id="cari" value={cariId} onChange={(e) => setCariId(e.target.value)}>
              <option value="">Seçin</option>
              {musteriler.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.unvan} ({m.kod})
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="belge">Fatura / irsaliye no</label>
            <input id="belge" value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} placeholder="Varsa e-fatura no" />
          </div>
          <div className="alan" style={{ flexBasis: 150 }}>
            <label htmlFor="tarih">Tarih</label>
            <input id="tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
          <div className="alan" style={{ flexBasis: 150 }}>
            <label htmlFor="vade">Vade</label>
            <input id="vade" type="date" value={vade} onChange={(e) => setVade(e.target.value)} />
          </div>
        </div>
        {cari && !odeme && !vade && cari.vade_gun > 0 && (
          <p className="soluk" style={{ margin: "-8px 0 0", fontSize: 13 }}>
            Vade boş bırakılırsa müşterinin vadesi kullanılır: {cari.vade_gun} gün.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hesaplanan.map((h, i) => (
            <div key={h.k.anahtar} style={{ border: "1px solid var(--cizgi)", borderRadius: 12, padding: 12 }}>
              <div className="form-satir">
                <div className="alan" style={{ flex: "2 1 240px" }}>
                  <label>
                    {i + 1}. ürün {h.urun && <span className="kod">{h.urun.kod}</span>}
                  </label>
                  <input
                    list="satis-urunleri"
                    autoComplete="off"
                    value={h.k.urunAdi}
                    onChange={(e) => guncelle(h.k.anahtar, { urunAdi: e.target.value })}
                    placeholder="Yazın, listeden seçin"
                    style={h.k.urunAdi && !h.urun ? { borderColor: "var(--amber)" } : undefined}
                  />
                </div>
                <div className="alan" style={{ flex: "1 1 100px" }}>
                  <label>Miktar {h.urun && `(${h.urun.birim})`}</label>
                  <input inputMode="decimal" value={h.k.miktar} onChange={(e) => guncelle(h.k.anahtar, { miktar: e.target.value })} placeholder="0" />
                </div>
                <div className="alan" style={{ flex: "1 1 110px" }}>
                  <label>Birim fiyat (KDV hariç)</label>
                  <input inputMode="decimal" value={h.k.fiyat} onChange={(e) => guncelle(h.k.anahtar, { fiyat: e.target.value })} placeholder="0,00" />
                </div>
                <div className="alan" style={{ flex: "0 1 90px" }}>
                  <label>KDV</label>
                  <select value={h.k.kdv} onChange={(e) => guncelle(h.k.anahtar, { kdv: Number(e.target.value) })}>
                    {kdvOranlari.map((k) => (
                      <option key={k.oran} value={Number(k.oran)}>
                        %{Number(k.oran)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="alan" style={{ flex: "0 1 90px" }}>
                  <label>İskonto %</label>
                  <input
                    inputMode="decimal"
                    value={h.k.isk}
                    onChange={(e) => guncelle(h.k.anahtar, { isk: e.target.value })}
                    placeholder="0"
                    style={!Number.isFinite(h.isk) ? { borderColor: "var(--amber)" } : undefined}
                  />
                </div>
                <div className="alan" style={{ flex: "1 1 100px" }}>
                  <label>Lot</label>
                  <input value={h.k.lot} onChange={(e) => guncelle(h.k.anahtar, { lot: e.target.value })} placeholder="İsteğe bağlı" />
                </div>
                <div className="alan" style={{ flex: "1 1 110px", alignItems: "flex-end" }}>
                  <label>Tutar</label>
                  <b className="num" style={{ minHeight: 42, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
                    {tl(h.tutar)}
                    {h.iskonto > 0 && (
                      <span className="soluk" style={{ fontSize: 12, fontWeight: 600 }}>
                        {tl(h.brut)} − {tl(h.iskonto)}
                      </span>
                    )}
                  </b>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }} className={h.yetersiz ? "amber" : "soluk"}>
                  {h.urun
                    ? h.yetersiz
                      ? `Stokta ${sayi(h.urun.stok)} ${h.urun.birim} görünüyor — satış yine kaydedilir, stok eksiye düşer (üretim girişi henüz yoksa normal).`
                      : `Stokta ${sayi(h.urun.stok)} ${h.urun.birim}`
                    : h.k.urunAdi
                      ? "Bu adla satılabilir ürün yok."
                      : ""}
                </span>
                {kalemler.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-cizgi"
                    style={{ minHeight: 30, padding: "4px 10px", fontSize: 12.5 }}
                    onClick={() => setKalemler((ks) => ks.filter((k) => k.anahtar !== h.k.anahtar))}
                  >
                    Satırı sil
                  </button>
                )}
              </div>
            </div>
          ))}
          <datalist id="satis-urunleri">
            {urunler.map((u) => (
              <option key={u.id} value={u.ad} />
            ))}
          </datalist>
          <div>
            <button type="button" className="btn btn-cizgi" onClick={() => setKalemler((ks) => [...ks, bosKalem()])}>
              + Ürün ekle
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="alan" style={{ flex: "0 1 auto" }}>
            <label>Ödeme</label>
            <div className="secim">
              <button type="button" className={!odeme ? "aktif" : undefined} onClick={() => setOdeme("")}>
                Veresiye
              </button>
              {tahsilatHesaplari.map((h) => (
                <button key={h.id} type="button" className={odeme === h.id ? "aktif" : undefined} onClick={() => setOdeme(h.id)}>
                  {h.ad}
                  <span className="soluk" style={{ fontWeight: 600, fontSize: 12 }}>
                    {" "}
                    · {h.tur === "pos" ? "kartla" : PARA_HESABI_TURU_ADI[h.tur].toLocaleLowerCase("tr-TR")}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="alan" style={{ flex: "0 1 140px" }}>
            <label htmlFor="genel-isk">Genel iskonto %</label>
            <input
              id="genel-isk"
              inputMode="decimal"
              value={genelIsk}
              onChange={(e) => setGenelIsk(e.target.value)}
              placeholder="0"
              title="Faturanın tamamına uygulanır (satır iskontosundan sonra)"
              style={!Number.isFinite(genelOran) ? { borderColor: "var(--amber)" } : undefined}
            />
          </div>
          <div className="toplam">
            {iskontoToplam > 0 && (
              <span className="num soluk">
                Brüt {tl(brutToplam)} · İskonto −{tl(iskontoToplam)}
              </span>
            )}
            <span className="num soluk">
              Ara toplam {tl(ara)} · KDV {tl(kdvToplam)}
            </span>
            <span className="buyuk num">{tl(genel)}</span>
            {maliyetToplam > 0 && (
              <span className="num soluk" style={{ fontSize: 13 }}>
                Tahmini maliyet {tl(maliyetToplam)} · brüt kâr {tl(ara - maliyetToplam)}
              </span>
            )}
          </div>
        </div>

        <div className="alan">
          <label htmlFor="aciklama">Not</label>
          <input id="aciklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İsteğe bağlı" />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
          <button type="button" className="btn btn-ana" disabled={bekliyor} onClick={kaydet}>
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="muh">
        <div className="kart-bas">
          <h2>
            ⇄ Muhasebe karşılığı <span className="etk e-gri">önizleme</span>
          </h2>
          {onizleme.length > 1 && <span className="etk e-yesil">Borç = Alacak ✓</span>}
        </div>
        {onizleme.length === 0 ? (
          <p className="bos">Müşteri ve ürünler girildikçe burada oluşur.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Hesap kodu</th>
                  <th>Hesap adı</th>
                  <th className="sag">Borç</th>
                  <th className="sag">Alacak</th>
                </tr>
              </thead>
              <tbody>
                {onizleme.map((s) => (
                  <tr key={`${s.kod}-${s.borc ? "b" : "a"}`}>
                    <td>
                      <span className="kod">{s.kod}</span>
                    </td>
                    <td data-label="Hesap">{hesapAdlari[s.kod] ?? urunler.find((u) => u.kod === s.kod)?.ad ?? cari?.unvan}</td>
                    <td data-label="Borç" className="sag num">
                      {s.borc ? tl(s.borc) : ""}
                    </td>
                    <td data-label="Alacak" className="sag num">
                      {s.alacak ? tl(s.alacak) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {odeme && (
          <p className="soluk" style={{ margin: 0, padding: "0 20px 14px", fontSize: 13 }}>
            Tahsilat ayrıca kaydedilir: <span className="kod">{tahsilatHesaplari.find((h) => h.id === odeme)?.kod}</span> B ·{" "}
            <span className="kod">{cari?.kod ?? "120…"}</span> A
          </p>
        )}
      </div>
    </>
  );
}
