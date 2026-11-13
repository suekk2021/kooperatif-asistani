"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { stokKartiEkle } from "@/app/actions/stok";
import { FormMesaji } from "@/components/FormMesaji";
import { STOK_BIRIMLERI, STOK_TURU_ADI } from "@/lib/imece";
import type { Depo, KdvOrani, StokGrubu } from "@/types/database";

export function YeniStokKartiFormu({
  gruplar,
  depolar,
  kdvOranlari,
  mevcutAdlar,
}: {
  gruplar: StokGrubu[];
  depolar: Depo[];
  kdvOranlari: KdvOrani[];
  mevcutAdlar: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [grupId, setGrupId] = useState("");
  const [kodSon, setKodSon] = useState("");
  const [sonuc, action, bekliyor] = useActionState(async (_onceki: FormSonucu, formData: FormData) => {
    const s = await stokKartiEkle(formData);
    if (s.basarili) {
      setGrupId("");
      setKodSon("");
    }
    return s;
  }, {});

  useEffect(() => {
    if (sonuc.basarili) formRef.current?.reset();
  }, [sonuc]);

  const grup = gruplar.find((g) => g.id === grupId);
  const onEk = grup ? `${grup.ana_kod}${grup.grup_kodu}` : "";
  const kodBicimiYanlis = kodSon !== "" && !/^[0-9]{1,3}$/.test(kodSon);

  return (
    <details className="kart form-ac" style={{ marginBottom: 16 }}>
      <summary className="kart-ic" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="btn btn-ana">+ Yeni stok kartı</span>
        <span className="soluk">Yazarken var olan kartlar önerilir — aynı malzemeye ikinci kart açmayın.</span>
      </summary>
      <div className="kart-bas">
        <h2>Yeni stok kartı</h2>
      </div>
      <form ref={formRef} action={action} className="kart-ic">
        <div className="form-satir">
          <div className="alan" style={{ flexBasis: 260 }}>
            <label htmlFor="grup_id">Stok grubu *</label>
            <select id="grup_id" name="grup_id" required value={grupId} onChange={(e) => setGrupId(e.target.value)}>
              <option value="" disabled>
                Seçiniz
              </option>
              {gruplar.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.ana_kod}
                  {g.grup_kodu} · {g.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="alan" style={{ flexBasis: 220 }}>
            <label htmlFor="kod_son">Kod (son 3 hane; boşsa sıradaki)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="kod">{onEk || "Önce grup seçin"}</span>
              <input
                id="kod_son"
                name="kod_son"
                inputMode="numeric"
                maxLength={3}
                placeholder="003"
                value={kodSon}
                onChange={(e) => setKodSon(e.target.value.trim())}
                autoComplete="off"
                disabled={!grup}
              />
            </div>
            {kodBicimiYanlis && <small className="kirmizi">Yalnız rakam, en çok 3 hane.</small>}
            <small className="soluk">Kaydedilince kod değişmez.</small>
          </div>
          <div className="alan" style={{ flexBasis: 170, flexGrow: 0 }}>
            <label htmlFor="tur_goster">Tür (gruptan gelir)</label>
            <input id="tur_goster" readOnly tabIndex={-1} value={grup ? STOK_TURU_ADI[grup.tur] : ""} placeholder="—" />
          </div>
        </div>
        <div className="form-satir" style={{ marginTop: 12 }}>
          <div className="alan" style={{ flexBasis: 300 }}>
            <label htmlFor="ad">Ad *</label>
            <input id="ad" name="ad" required list="mevcut-kartlar" autoComplete="off" placeholder="Un (Tip 550)" />
            <datalist id="mevcut-kartlar">
              {mevcutAdlar.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
            <label htmlFor="birim">Birim *</label>
            <select id="birim" name="birim" required defaultValue="">
              <option value="" disabled>
                Seçiniz
              </option>
              {STOK_BIRIMLERI.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-satir" style={{ marginTop: 12 }}>
          <div className="alan">
            <label htmlFor="depo_id">Depo</label>
            <select id="depo_id" name="depo_id" defaultValue="">
              <option value="">—</option>
              {depolar.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
            <label htmlFor="kdv_orani">KDV</label>
            <select id="kdv_orani" name="kdv_orani" defaultValue="1">
              {kdvOranlari.map((k) => (
                <option key={k.oran} value={Number(k.oran)}>
                  %{Number(k.oran)}
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="min_stok">Asgari stok (uyarı sınırı)</label>
            <input id="min_stok" name="min_stok" inputMode="decimal" placeholder="Örn. 50" />
          </div>
          <div className="alan">
            <label htmlFor="satis_fiyati">Liste satış fiyatı (KDV hariç, ürünse)</label>
            <input id="satis_fiyati" name="satis_fiyati" inputMode="decimal" placeholder="0,00" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="submit" className="btn btn-ana" disabled={bekliyor || kodBicimiYanlis}>
            {bekliyor ? "Kaydediliyor…" : "Kartı aç"}
          </button>
        </div>
        <FormMesaji sonuc={sonuc} />
      </form>
    </details>
  );
}
