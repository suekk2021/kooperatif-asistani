"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { stokKartiEkle } from "@/app/actions/stok";
import { FormMesaji } from "@/components/FormMesaji";
import { STOK_BIRIMLERI, STOK_TURLERI, STOK_TURU_ADI } from "@/lib/imece";
import type { Depo, KdvOrani, StokTuru } from "@/types/database";

export function YeniStokKartiFormu({
  varsayilanTur,
  depolar,
  kdvOranlari,
  mevcutAdlar,
}: {
  varsayilanTur: StokTuru;
  depolar: Depo[];
  kdvOranlari: KdvOrani[];
  mevcutAdlar: string[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sonuc, action, bekliyor] = useActionState(
    async (_onceki: FormSonucu, formData: FormData) => stokKartiEkle(formData),
    {}
  );

  useEffect(() => {
    if (sonuc.basarili) formRef.current?.reset();
  }, [sonuc]);

  const urunMu = varsayilanTur === "mamul" || varsayilanTur === "yari_mamul";

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
          <div className="alan" style={{ flexBasis: 300 }}>
            <label htmlFor="ad">Ad *</label>
            <input id="ad" name="ad" required list="mevcut-kartlar" autoComplete="off" placeholder="Un (Tip 550)" />
            <datalist id="mevcut-kartlar">
              {mevcutAdlar.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="alan">
            <label htmlFor="tur">Tür *</label>
            <select id="tur" name="tur" defaultValue={varsayilanTur}>
              {STOK_TURLERI.map((t) => (
                <option key={t} value={t}>
                  {STOK_TURU_ADI[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
            <label htmlFor="birim">Birim *</label>
            <select id="birim" name="birim" defaultValue={urunMu ? "adet" : "kg"}>
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
            <select id="depo_id" name="depo_id" defaultValue={String(depolar[urunMu ? 1 : 0]?.id ?? "")}>
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
          <button type="submit" className="btn btn-ana" disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Kartı aç"}
          </button>
        </div>
        <FormMesaji sonuc={sonuc} />
      </form>
    </details>
  );
}
