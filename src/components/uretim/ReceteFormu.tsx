"use client";

import { useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { receteKaydet } from "@/app/actions/uretim";
import { FormMesaji } from "@/components/FormMesaji";
import type { StokKarti } from "@/types/database";

type KartOzeti = Pick<StokKarti, "id" | "ad" | "kod" | "birim">;
type Satir = { anahtar: number; ad: string; miktar: string };

function sayiCoz(s: string) {
  const t = s.trim();
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

let sayac = 0;

export function ReceteFormu({
  urun,
  malzemeler,
  mevcut,
}: {
  urun: KartOzeti;
  malzemeler: KartOzeti[];
  mevcut: { cikti_miktari: number; kalemler: { stok_karti_id: string; miktar: number }[] } | null;
}) {
  const adla = new Map(malzemeler.map((m) => [m.ad.toLocaleLowerCase("tr-TR").trim(), m]));
  const idle = new Map(malzemeler.map((m) => [m.id, m]));
  const [cikti, setCikti] = useState(mevcut ? String(mevcut.cikti_miktari) : "100");
  const [satirlar, setSatirlar] = useState<Satir[]>(() =>
    mevcut?.kalemler.length
      ? mevcut.kalemler.map((k) => ({ anahtar: ++sayac, ad: idle.get(k.stok_karti_id)?.ad ?? "", miktar: String(k.miktar) }))
      : [{ anahtar: ++sayac, ad: "", miktar: "" }]
  );
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  function guncelle(anahtar: number, d: Partial<Satir>) {
    setSatirlar((ss) => ss.map((s) => (s.anahtar === anahtar ? { ...s, ...d } : s)));
  }

  function kaydet() {
    const bulunamayan = satirlar.findIndex((s) => s.ad && !adla.get(s.ad.toLocaleLowerCase("tr-TR").trim()));
    if (bulunamayan !== -1) {
      setSonuc({ hata: `${bulunamayan + 1}. satırdaki malzeme stok kartlarında yok.` });
      return;
    }
    baslat(async () =>
      setSonuc(
        await receteKaydet({
          urun_karti_id: urun.id,
          cikti_miktari: sayiCoz(cikti),
          kalemler: satirlar
            .filter((s) => s.ad)
            .map((s) => ({ stok_karti_id: adla.get(s.ad.toLocaleLowerCase("tr-TR").trim())!.id, miktar: sayiCoz(s.miktar) })),
        })
      )
    );
  }

  return (
    <div className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
      {satirlar.map((s, i) => {
        const kart = adla.get(s.ad.toLocaleLowerCase("tr-TR").trim());
        return (
          <div key={s.anahtar} className="form-satir" style={{ alignItems: "flex-end" }}>
            <div className="alan" style={{ flex: "2 1 200px" }}>
              <label>
                {i + 1}. malzeme {kart && <span className="kod">{kart.kod}</span>}
              </label>
              <input list={`recete-malzeme-${urun.id}`} autoComplete="off" value={s.ad} onChange={(e) => guncelle(s.anahtar, { ad: e.target.value })} />
            </div>
            <div className="alan" style={{ flex: "1 1 110px" }}>
              <label>Miktar {kart ? `(${kart.birim})` : ""}</label>
              <input inputMode="decimal" value={s.miktar} onChange={(e) => guncelle(s.anahtar, { miktar: e.target.value })} />
            </div>
            <button
              type="button"
              className="btn btn-cizgi"
              onClick={() => setSatirlar((ss) => (ss.length > 1 ? ss.filter((x) => x.anahtar !== s.anahtar) : ss))}
            >
              Sil
            </button>
          </div>
        );
      })}
      <datalist id={`recete-malzeme-${urun.id}`}>
        {malzemeler.map((m) => (
          <option key={m.id} value={m.ad} />
        ))}
      </datalist>
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
