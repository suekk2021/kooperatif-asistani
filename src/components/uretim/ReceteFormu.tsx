"use client";

import { useId, useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { receteKaydet } from "@/app/actions/uretim";
import { FormMesaji } from "@/components/FormMesaji";
import type { StokKarti } from "@/types/database";
import { kodGoster, sayiGirdi, tl, trSayi } from "@/lib/imece";
import { karPayi, type BirimMaliyet } from "@/lib/maliyet";
import { yuzde } from "@/lib/uretim";

type KartOzeti = Pick<StokKarti, "id" | "ad" | "kod" | "birim">;
type Satir = { anahtar: number; ad: string; miktar: string };

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

let sayac = 0;

function MalzemeSecici({
  deger,
  malzemeler,
  degisti,
  secildi,
}: {
  deger: string;
  malzemeler: KartOzeti[];
  degisti: (ad: string) => void;
  secildi: () => void;
}) {
  const [acik, setAcik] = useState(false);
  const [imlec, setImlec] = useState(0);
  // Kutuya girince önce tüm liste görünsün; süzme ancak kullanıcı yazınca başlasın
  const [yazdi, setYazdi] = useState(false);
  const listeId = useId();

  const aranan = kucuk(deger);
  const aranKod = aranan.replace(/\./g, "");
  const sonuclar = yazdi && aranan
    ? malzemeler
        .filter((m) => kucuk(m.ad).includes(aranan) || kodGoster(m.kod).includes(aranKod))
        .sort((a, b) => Number(!kucuk(a.ad).startsWith(aranan)) - Number(!kucuk(b.ad).startsWith(aranan)))
    : malzemeler;

  function sec(m: KartOzeti) {
    degisti(m.ad);
    setAcik(false);
    secildi();
  }

  return (
    <div className="rc-secici">
      {/* Telefonda dar kutuda uzun ad kesilmesin: kutu odakta değilken ad bu yazıyla, alt satıra kayarak görünür (CSS) */}
      {deger && (
        <span className="rc-ad-goster" aria-hidden="true">
          {deger}
        </span>
      )}
      <input
        value={deger}
        autoComplete="off"
        placeholder="Yazın veya seçin"
        role="combobox"
        aria-expanded={acik}
        aria-controls={listeId}
        onFocus={(e) => {
          e.target.select();
          setYazdi(false);
          setAcik(true);
          setImlec(0);
        }}
        onClick={() => setAcik(true)}
        onBlur={() => setAcik(false)}
        onChange={(e) => {
          degisti(e.target.value);
          setYazdi(true);
          setAcik(true);
          setImlec(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAcik(true);
            setImlec((i) => Math.min(i + 1, sonuclar.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setImlec((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && acik && sonuclar[imlec]) {
            e.preventDefault();
            sec(sonuclar[imlec]);
          } else if (e.key === "Escape") {
            setAcik(false);
          }
        }}
      />
      {acik && (
        <ul id={listeId} className="rc-liste" role="listbox">
          {sonuclar.length === 0 ? (
            <li className="rc-yok">Bu adla stok kartı yok</li>
          ) : (
            sonuclar.map((m, i) => (
              <li
                key={m.id}
                role="option"
                aria-selected={i === imlec}
                className={i === imlec ? "secili" : undefined}
                // onMouseDown: tıklama, kutunun odağı kaybetmesinden (liste kapanmadan) önce işlensin
                onMouseDown={(e) => {
                  e.preventDefault();
                  sec(m);
                }}
                onMouseEnter={() => setImlec(i)}
              >
                <span className="rc-kod">{kodGoster(m.kod)}</span>
                <span>{m.ad}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function ReceteFormu({
  urun,
  malzemeler,
  mevcut,
  maliyet,
}: {
  urun: KartOzeti;
  malzemeler: KartOzeti[];
  mevcut: { cikti_miktari: number; kalemler: { stok_karti_id: string; miktar: number }[] } | null;
  /** Yalnız maliyet görme yetkisi olana gelir (malzeme id → bugünkü birim maliyet; null = fiyatı bilinmiyor). */
  maliyet?: { birim: Record<string, BirimMaliyet | null>; satisFiyati: number | null } | null;
}) {
  const adla = new Map(malzemeler.map((m) => [kucuk(m.ad), m]));
  const idle = new Map(malzemeler.map((m) => [m.id, m]));
  const [cikti, setCikti] = useState(mevcut ? sayiGirdi(mevcut.cikti_miktari) : "100");
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    mevcut?.kalemler.length
      ? mevcut.kalemler.map((k) => ({ anahtar: ++sayac, ad: idle.get(k.stok_karti_id)?.ad ?? "", miktar: sayiGirdi(k.miktar) }))
      : [{ anahtar: ++sayac, ad: "", miktar: "" }]
  );
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  function guncelle(anahtar: number, d: Partial<Satir>) {
    setSatirlar((ss) => ss.map((s) => (s.anahtar === anahtar ? { ...s, ...d } : s)));
  }

  function kaydet() {
    const bulunamayan = satirlar.findIndex((s) => s.ad && !adla.get(kucuk(s.ad)));
    if (bulunamayan !== -1) {
      setSonuc({ hata: `${bulunamayan + 1}. satırdaki malzeme stok kartlarında yok.` });
      return;
    }
    baslat(async () => {
      const r = await receteKaydet({
        urun_karti_id: urun.id,
        cikti_miktari: trSayi(cikti.trim()),
        kalemler: satirlar
          .filter((s) => s.ad)
          .map((s) => ({ stok_karti_id: adla.get(kucuk(s.ad))!.id, miktar: trSayi(s.miktar.trim()) })),
      });
      setSonuc(r);
      if (!r.hata) {
        const kod = (s: Satir) => adla.get(kucuk(s.ad))?.kod ?? "￿";
        setSatirlar((ss) => [...ss].sort((a, b) => kod(a).localeCompare(kod(b))));
      }
    });
  }

  // Ekrandaki (henüz kaydedilmemiş olabilir) satırlarla canlı hesap
  const satirTutari = (s: Satir): number | null | undefined => {
    const k = adla.get(kucuk(s.ad));
    const m = trSayi(s.miktar.trim());
    if (!maliyet || !k || !Number.isFinite(m)) return undefined;
    const bm = maliyet.birim[k.id];
    return bm ? bm.fiyat * m : null;
  };
  const kartFiyatli = (s: Satir) => {
    const k = adla.get(kucuk(s.ad));
    return Boolean(maliyet && k && maliyet.birim[k.id]?.kaynak === "kart");
  };
  const ciktiSayi = trSayi(cikti.trim());
  const tutarlar = satirlar.map(satirTutari);
  const fiyatsiz = satirlar.filter((s, i) => tutarlar[i] === null).map((s) => s.ad);
  const toplam = tutarlar.reduce<number>((t, x) => t + (x ?? 0), 0);
  const birimMaliyet = maliyet && ciktiSayi > 0 && tutarlar.some((x) => x != null) ? toplam / ciktiSayi : null;
  const kar = maliyet ? karPayi(maliyet.satisFiyati, birimMaliyet) : null;

  const miktarId = (sira: number) => `recete-${urun.id}-miktar-${sira}`;

  return (
    <div className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-satir" style={{ alignItems: "center" }}>
        <div className="alan" style={{ flex: "0 1 160px" }}>
          <label>Kaç {urun.birim} için?</label>
          <input inputMode="decimal" value={cikti} onChange={(e) => setCikti(e.target.value)} />
        </div>
        <p className="soluk" style={{ flex: "2 1 260px", margin: 0, fontSize: 13 }}>
          Örnek: &quot;100 {urun.birim} {urun.ad} için 40 kg un, 12 kg peynir&quot;. Bilmiyorsanız ilk partilerin gerçek
          tartımlarına göre doldurun; sonra sapma buna göre ölçülür.
        </p>
      </div>
      <div className={`rc-tablo${maliyet ? " rc-maliyetli" : ""}`}>
        <div className="rc-satir rc-bas">
          <span className="rc-solkolon">
            <span className="rc-sira">#</span>
            <span className="rc-kodbas">Kod</span>
          </span>
          <span>Malzeme</span>
          <span style={{ textAlign: "right" }}>Miktar</span>
          <span>Birim</span>
          {maliyet && <span className="rc-tutar">Tutar</span>}
          <span />
        </div>
        {satirlar.map((s, i) => {
          const kart = adla.get(kucuk(s.ad));
          return (
            <div key={s.anahtar} className="rc-satir">
              <span className="rc-solkolon">
                <span className="rc-sira">{i + 1}</span>
                <span className="rc-kod">{kart ? kodGoster(kart.kod) : ""}</span>
              </span>
              <MalzemeSecici
                deger={s.ad}
                malzemeler={malzemeler}
                degisti={(ad) => guncelle(s.anahtar, { ad })}
                secildi={() => document.getElementById(miktarId(i))?.focus()}
              />
              <input
                id={miktarId(i)}
                className="rc-miktar"
                inputMode="decimal"
                aria-label={`${i + 1}. malzeme miktarı`}
                value={s.miktar}
                onChange={(e) => guncelle(s.anahtar, { miktar: e.target.value })}
              />
              <span className="rc-birim">{kart?.birim ?? ""}</span>
              {maliyet && (
                <span
                  className="rc-tutar num"
                  title={tutarlar[i] === null ? "Alış kaydı da kart fiyatı da yok" : kartFiyatli(s) ? "Alış kaydı yok; stok kartındaki fiyattan" : undefined}
                >
                  {tutarlar[i] === null ? "fiyat yok" : tutarlar[i] !== undefined ? tl(tutarlar[i]) : ""}
                  {tutarlar[i] != null && kartFiyatli(s) && <span className="amber"> *</span>}
                </span>
              )}
              <button
                type="button"
                className="rc-sil"
                title="Satırı sil"
                aria-label={`${i + 1}. satırı sil`}
                onClick={() => setSatirlar((ss) => (ss.length > 1 ? ss.filter((x) => x.anahtar !== s.anahtar) : ss))}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      {maliyet && (
        <div className="rc-maliyet">
          <div>
            <span className="soluk">1 {urun.birim} reçete maliyeti</span>
            <b className="num">{birimMaliyet !== null ? tl(birimMaliyet) : "—"}</b>
          </div>
          <div>
            <span className="soluk">Liste satış fiyatı (KDV hariç)</span>
            <b className="num">{maliyet.satisFiyati !== null ? tl(maliyet.satisFiyati) : "girilmemiş"}</b>
          </div>
          <div>
            <span className="soluk">Kâr payı</span>
            <b className={`num${kar !== null && kar < 0 ? " kirmizi" : fiyatsiz.length ? " amber" : ""}`}>
              {kar !== null ? `${yuzde(kar, 0)} · ${tl((maliyet.satisFiyati ?? 0) - (birimMaliyet ?? 0))}` : "—"}
              {kar !== null && fiyatsiz.length > 0 && " (eksik maliyetle, gerçekte daha düşük)"}
            </b>
          </div>
          <p className="soluk">
            Yalnız malzeme ve ambalaj; işçilik ve genel gider hariç. Malzeme fiyatı bugünkü ortalama maliyetten, stok yoksa son
            alıştan alınır.
            {satirlar.some(kartFiyatli) && " * Alış kaydı olmayan malzemede stok kartındaki fiyat kullanıldı."}
            {fiyatsiz.length > 0 && <span className="amber"> Fiyatı bilinmeyen: {fiyatsiz.join(", ")} — maliyet eksik.</span>}
          </p>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn btn-cizgi" onClick={() => setSatirlar((ss) => [...ss, { anahtar: ++sayac, ad: "", miktar: "" }])}>
          + Malzeme
        </button>
        <button type="button" className="btn btn-ana" onClick={kaydet} disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Reçeteyi kaydet"}
        </button>
        <FormMesaji sonuc={sonuc} />
      </div>
    </div>
  );
}
