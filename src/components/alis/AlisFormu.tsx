"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { alisKaydet, type AlisKalemGirdisi } from "@/app/actions/alis";
import type { FormSonucu } from "@/app/actions/cariler";
import { FormMesaji } from "@/components/FormMesaji";
import { PARA_HESABI_TURU_ADI, tl } from "@/lib/imece";
import type { Cari, Hesap, KasaBankaHesabi, KdvOrani, StokKarti } from "@/types/database";

type Kalem = {
  anahtar: number;
  tip: "stok" | "gider";
  stokAdi: string;
  hesap_kodu: string;
  aciklama: string;
  miktar: string;
  birim_fiyat: string;
  kdv: number;
  isk: string;
};

/** "1.250,50" / "18,5" / "18.5" -> sayı */
function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}
const yuvarla = (n: number) => Math.round(n * 100) / 100;

let sayac = 0;
const bosKalem = (tip: Kalem["tip"] = "stok"): Kalem => ({
  anahtar: ++sayac,
  tip,
  stokAdi: "",
  hesap_kodu: "",
  aciklama: "",
  miktar: "",
  birim_fiyat: "",
  kdv: 1,
  isk: "",
});
/** Boş = 0; geçersiz ya da 0–99,99 dışı = NaN. */
function iskontoCoz(s: string): number {
  if (!s.trim()) return 0;
  const n = sayiCoz(s);
  return n >= 0 && n < 100 ? n : NaN;
}

export function AlisFormu({
  tedarikciler,
  stokKartlari,
  giderHesaplari,
  kdvOranlari,
  odemeHesaplari,
  hesapAdlari,
  bugun,
}: {
  tedarikciler: Pick<Cari, "id" | "unvan" | "kod" | "vade_gun">[];
  stokKartlari: Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "kdv_orani">[];
  giderHesaplari: Pick<Hesap, "kod" | "ad">[];
  kdvOranlari: KdvOrani[];
  odemeHesaplari: KasaBankaHesabi[];
  hesapAdlari: Record<string, string>;
  bugun: string;
}) {
  const router = useRouter();
  const [cariId, setCariId] = useState("");
  const [belgeNo, setBelgeNo] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [vade, setVade] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [odeme, setOdeme] = useState<string>("");
  const [genelIsk, setGenelIsk] = useState("");
  const [kalemler, setKalemler] = useState<Kalem[]>([bosKalem()]);
  const [ayrinti, setAyrinti] = useState(false);
  const [sonuc, setSonuc] = useState<FormSonucu & { id?: string }>({});
  const [bekliyor, baslat] = useTransition();

  const kartAdla = useMemo(
    () => new Map(stokKartlari.map((k) => [k.ad.toLocaleLowerCase("tr-TR").trim(), k])),
    [stokKartlari]
  );
  const kdvKodu = useMemo(() => new Map(kdvOranlari.map((k) => [Number(k.oran), k.indirilecek_kod])), [kdvOranlari]);
  const cari = tedarikciler.find((t) => t.id === cariId);

  function guncelle(anahtar: number, degisim: Partial<Kalem>) {
    setKalemler((ks) =>
      ks.map((k) => {
        if (k.anahtar !== anahtar) return k;
        const yeni = { ...k, ...degisim };
        // Stok kartı seçilince kartın KDV oranı varsayılan olur.
        if (degisim.stokAdi !== undefined) {
          const kart = kartAdla.get(degisim.stokAdi.toLocaleLowerCase("tr-TR").trim());
          if (kart) yeni.kdv = Number(kart.kdv_orani);
        }
        return yeni;
      })
    );
  }

  const genelOran = iskontoCoz(genelIsk);
  // Veritabanındaki alis_kaydet ile aynı hesap: iskonto maliyetten düşer.
  const hesaplanan = kalemler.map((k) => {
    const kart = k.tip === "stok" ? kartAdla.get(k.stokAdi.toLocaleLowerCase("tr-TR").trim()) : undefined;
    const miktar = sayiCoz(k.miktar);
    const fiyat = sayiCoz(k.birim_fiyat);
    const isk = iskontoCoz(k.isk);
    const gecerli = Number.isFinite(miktar) && Number.isFinite(fiyat);
    const brut = gecerli ? yuvarla(miktar * fiyat) : 0;
    const tutar = gecerli && Number.isFinite(isk) && Number.isFinite(genelOran) ? yuvarla(miktar * fiyat * (1 - isk / 100) * (1 - genelOran / 100)) : brut;
    const iskonto = yuvarla(brut - tutar);
    const kdvTutari = yuvarla((tutar * k.kdv) / 100);
    const hesap = k.tip === "stok" ? kart?.kod : k.hesap_kodu || undefined;
    return { k, kart, miktar, fiyat, isk, brut, tutar, iskonto, kdvTutari, hesap };
  });
  const iskontoToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.iskonto, 0));
  const ara = yuvarla(hesaplanan.reduce((t, h) => t + h.tutar, 0));
  const kdvToplam = yuvarla(hesaplanan.reduce((t, h) => t + h.kdvTutari, 0));
  const genel = yuvarla(ara + kdvToplam);

  // Muhasebe karşılığı önizlemesi (asıl fişi veritabanı aynı kuralla üretir).
  const borcMap = new Map<string, number>();
  for (const h of hesaplanan) {
    if (h.hesap && h.tutar > 0) borcMap.set(h.hesap, yuvarla((borcMap.get(h.hesap) ?? 0) + h.tutar));
    const kk = kdvKodu.get(h.k.kdv);
    if (kk && h.kdvTutari > 0) borcMap.set(kk, yuvarla((borcMap.get(kk) ?? 0) + h.kdvTutari));
  }
  const onizleme = [...borcMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kod, t]) => ({ kod, borc: t, alacak: 0 }));
  if (cari && genel > 0) onizleme.push({ kod: cari.kod, borc: 0, alacak: genel });

  function kaydet() {
    // Düğme kapatılmıyor; eksik ne ise söyleniyor (kapalı düğme kullanıcıya "bozuk" gibi görünüyordu).
    if (!cariId) return setSonuc({ hata: "Tedarikçi seçin." });
    if (!belgeNo.trim()) return setSonuc({ hata: "Fatura numarasını girin." });
    if (genel <= 0) return setSonuc({ hata: "En az bir kalemde miktar ve birim fiyat girin." });
    if (!Number.isFinite(genelOran)) return setSonuc({ hata: "Genel iskonto 0 ile 99 arasında bir yüzde olmalı." });
    const yanlisIsk = hesaplanan.findIndex((h) => !Number.isFinite(h.isk));
    if (yanlisIsk !== -1) return setSonuc({ hata: `${yanlisIsk + 1}. kalemdeki iskonto 0 ile 99 arasında bir yüzde olmalı.` });
    const eksikStok = hesaplanan.findIndex((h) => h.k.tip === "stok" && !h.kart);
    if (eksikStok !== -1) {
      setSonuc({ hata: `${eksikStok + 1}. satırdaki malzeme stok kartlarında yok. Listeden seçin ya da önce Stok ekranından kart açın.` });
      return;
    }
    const kalemGirdileri: AlisKalemGirdisi[] = hesaplanan.map((h) => ({
      ...(h.k.tip === "stok" ? { stok_karti_id: h.kart!.id } : { hesap_kodu: h.k.hesap_kodu }),
      aciklama: h.k.aciklama || undefined,
      miktar: h.miktar,
      birim_fiyat: h.fiyat,
      kdv_orani: h.k.kdv,
      iskonto_orani: h.isk,
    }));
    baslat(async () => {
      const s = await alisKaydet({
        cari_id: cariId,
        belge_no: belgeNo,
        tarih,
        vade_tarihi: vade || undefined,
        aciklama: aciklama || undefined,
        odeme_hesap_id: odeme || null,
        genel_iskonto_orani: genelOran,
        kalemler: kalemGirdileri,
      });
      setSonuc(s);
      if (s.id) router.push(`/alis/${s.id}`);
    });
  }

  return (
    <div className={`mobil-form${ayrinti ? " ayrinti-acik" : ""}`}>
      <div className="kart kart-ic" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="form-satir">
          <div className="alan" style={{ flex: "2 1 260px" }}>
            <label htmlFor="cari">Tedarikçi *</label>
            <select id="cari" value={cariId} onChange={(e) => setCariId(e.target.value)}>
              <option value="">Seçin</option>
              {tedarikciler.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.unvan} ({t.kod})
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="belge">Fatura no *</label>
            <input id="belge" value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} placeholder="YLM2026-0418" />
          </div>
          <div className="alan" style={{ flexBasis: 150 }}>
            <label htmlFor="tarih">Fatura tarihi</label>
            <input id="tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
          <div className="alan mobil-ek" style={{ flexBasis: 150 }}>
            <label htmlFor="vade">Vade</label>
            <input id="vade" type="date" value={vade} onChange={(e) => setVade(e.target.value)} />
          </div>
        </div>
        {cari && !odeme && !vade && cari.vade_gun > 0 && (
          <p className="soluk" style={{ margin: "-8px 0 0", fontSize: 13 }}>
            Vade boş bırakılırsa tedarikçinin vadesi kullanılır: {cari.vade_gun} gün.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hesaplanan.map((h, i) => (
            <div key={h.k.anahtar} style={{ border: "1px solid var(--cizgi)", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div className="secim">
                  <button type="button" className={h.k.tip === "stok" ? "aktif" : undefined} onClick={() => guncelle(h.k.anahtar, { tip: "stok" })}>
                    Malzeme / ürün
                  </button>
                  <button type="button" className={h.k.tip === "gider" ? "aktif" : undefined} onClick={() => guncelle(h.k.anahtar, { tip: "gider", kdv: 20 })}>
                    Gider / demirbaş
                  </button>
                </div>
                <span className="soluk" style={{ fontSize: 13 }}>
                  {i + 1}. kalem
                  {kalemler.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-cizgi"
                      style={{ minHeight: 30, padding: "4px 10px", marginLeft: 8, fontSize: 12.5 }}
                      onClick={() => setKalemler((ks) => ks.filter((k) => k.anahtar !== h.k.anahtar))}
                    >
                      Sil
                    </button>
                  )}
                </span>
              </div>
              <div className="form-satir">
                {h.k.tip === "stok" ? (
                  <div className="alan" style={{ flex: "2 1 240px" }}>
                    <label>
                      Malzeme {h.kart && <span className="kod">{h.kart.kod}</span>}
                    </label>
                    <input
                      list="alis-stok-kartlari"
                      autoComplete="off"
                      value={h.k.stokAdi}
                      onChange={(e) => guncelle(h.k.anahtar, { stokAdi: e.target.value })}
                      placeholder="Yazın, listeden seçin"
                      style={h.k.stokAdi && !h.kart ? { borderColor: "var(--amber)" } : undefined}
                    />
                  </div>
                ) : (
                  <>
                    <div className="alan" style={{ flex: "1 1 200px" }}>
                      <label>Gider hesabı</label>
                      <select value={h.k.hesap_kodu} onChange={(e) => guncelle(h.k.anahtar, { hesap_kodu: e.target.value })}>
                        <option value="">Seçin</option>
                        {giderHesaplari.map((g) => (
                          <option key={g.kod} value={g.kod}>
                            {g.kod} · {g.ad}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="alan" style={{ flex: "1 1 160px" }}>
                      <label>Açıklama</label>
                      <input value={h.k.aciklama} onChange={(e) => guncelle(h.k.anahtar, { aciklama: e.target.value })} placeholder="Elektrik, nakliye…" />
                    </div>
                  </>
                )}
                <div className="alan" style={{ flex: "1 1 100px" }}>
                  <label>Miktar {h.kart && `(${h.kart.birim})`}</label>
                  <input inputMode="decimal" value={h.k.miktar} onChange={(e) => guncelle(h.k.anahtar, { miktar: e.target.value })} placeholder={h.k.tip === "gider" ? "1" : "0"} />
                </div>
                <div className="alan" style={{ flex: "1 1 110px" }}>
                  <label>Birim fiyat (KDV hariç)</label>
                  <input inputMode="decimal" value={h.k.birim_fiyat} onChange={(e) => guncelle(h.k.anahtar, { birim_fiyat: e.target.value })} placeholder="0,00" />
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
                <div className="alan mobil-ek" style={{ flex: "0 1 90px" }}>
                  <label>İskonto %</label>
                  <input
                    inputMode="decimal"
                    value={h.k.isk}
                    onChange={(e) => guncelle(h.k.anahtar, { isk: e.target.value })}
                    placeholder="0"
                    style={!Number.isFinite(h.isk) ? { borderColor: "var(--amber)" } : undefined}
                  />
                </div>
                <div className="alan" style={{ flex: "1 1 110px", alignItems: "flex-end", justifyContent: "flex-end" }}>
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
              {h.k.tip === "stok" && h.k.stokAdi && !h.kart && (
                <p className="amber" style={{ margin: "8px 0 0", fontSize: 13 }}>
                  Bu adla stok kartı yok. Listeden seçin ya da önce Stok ekranından kart açın.
                </p>
              )}
            </div>
          ))}
          <datalist id="alis-stok-kartlari">
            {stokKartlari.map((k) => (
              <option key={k.id} value={k.ad} />
            ))}
          </datalist>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-cizgi" onClick={() => setKalemler((ks) => [...ks, bosKalem("stok")])}>
              + Malzeme ekle
            </button>
            <button type="button" className="btn btn-cizgi" onClick={() => setKalemler((ks) => [...ks, { ...bosKalem("gider"), kdv: 20, miktar: "1" }])}>
              + Gider ekle
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div className="alan" style={{ flex: "0 1 auto" }}>
            <label>Ödeme şekli</label>
            <div className="secim">
              <button type="button" className={!odeme ? "aktif" : undefined} onClick={() => setOdeme("")}>
                Veresiye
              </button>
              {odemeHesaplari.map((h) => (
                <button key={h.id} type="button" className={odeme === h.id ? "aktif" : undefined} onClick={() => setOdeme(h.id)}>
                  {h.ad}
                  <span className="soluk" style={{ fontWeight: 600, fontSize: 12 }}>
                    {" "}
                    · {PARA_HESABI_TURU_ADI[h.tur].toLocaleLowerCase("tr-TR")}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="alan mobil-ek" style={{ flex: "0 1 140px" }}>
            <label htmlFor="genel-isk">Genel iskonto %</label>
            <input
              id="genel-isk"
              inputMode="decimal"
              value={genelIsk}
              onChange={(e) => setGenelIsk(e.target.value)}
              placeholder="0"
              title="Faturanın tamamına uygulanır (satır iskontosundan sonra); maliyetten düşer"
              style={!Number.isFinite(genelOran) ? { borderColor: "var(--amber)" } : undefined}
            />
          </div>
          <div className="toplam">
            {iskontoToplam > 0 && <span className="num soluk">İskonto −{tl(iskontoToplam)} (maliyetten düşüldü)</span>}
            <span className="num soluk">
              Ara toplam {tl(ara)} · KDV {tl(kdvToplam)}
            </span>
            <span className="buyuk num">{tl(genel)}</span>
          </div>
        </div>

        <button type="button" className="mobil-daha" onClick={() => setAyrinti((a) => !a)}>
          {ayrinti ? "Daha az göster" : "Daha fazla: vade, iskonto, not"}
        </button>

        <div className="alan mobil-ek">
          <label htmlFor="aciklama">Not</label>
          <input id="aciklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İsteğe bağlı" />
        </div>

        <div className="form-alt" style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="form-alt-toplam num">
            <small>Toplam</small>
            {tl(genel)}
          </span>
          <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
          <button type="button" className="btn btn-ana" disabled={bekliyor} onClick={kaydet}>
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="muh mobil-ek">
        <div className="kart-bas">
          <h2>
            ⇄ Muhasebe karşılığı <span className="etk e-gri">önizleme</span>
          </h2>
          {onizleme.length > 1 && <span className="etk e-yesil">Borç = Alacak ✓</span>}
        </div>
        {onizleme.length === 0 ? (
          <p className="bos">Tedarikçi ve kalemler girildikçe burada oluşur.</p>
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
                  <tr key={s.kod}>
                    <td>
                      <span className="kod">{s.kod}</span>
                    </td>
                    <td data-label="Hesap">{hesapAdlari[s.kod] ?? stokKartlari.find((k) => k.kod === s.kod)?.ad ?? cari?.unvan}</td>
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
            Peşin ödeme ayrıca kaydedilir: <span className="kod">{cari?.kod ?? "320…"}</span> B ·{" "}
            <span className="kod">{odemeHesaplari.find((h) => h.id === odeme)?.kod}</span> A
          </p>
        )}
      </div>
    </div>
  );
}
