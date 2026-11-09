"use client";

import { useActionState, useEffect, useRef } from "react";
import { cariEkle, type FormSonucu } from "@/app/actions/cariler";
import { FormMesaji } from "@/components/FormMesaji";
import { CARI_TURU_ADI } from "@/lib/imece";
import type { CariTuru } from "@/types/database";

export function YeniCariFormu({ tur }: { tur: CariTuru }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sonuc, action, bekliyor] = useActionState(
    async (_onceki: FormSonucu, formData: FormData) => cariEkle(formData),
    {}
  );

  useEffect(() => {
    if (sonuc.basarili) formRef.current?.reset();
  }, [sonuc]);

  const ad = CARI_TURU_ADI[tur].tekil;
  const ustKod = tur === "musteri" ? "120.01" : "320.01";

  return (
    <details className="kart form-ac" style={{ marginBottom: 16 }}>
      <summary className="kart-ic" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="btn btn-ana">+ Yeni {ad.toLocaleLowerCase("tr-TR")}</span>
        <span className="soluk">Kod otomatik verilir ({ustKod}.001, .002 …) — muhasebe kodu ile aynıdır.</span>
      </summary>
      <div className="kart-bas">
        <h2>Yeni {ad.toLocaleLowerCase("tr-TR")}</h2>
      </div>
      <form ref={formRef} action={action} className="kart-ic">
        <input type="hidden" name="tur" value={tur} />
        <div className="form-satir">
          <div className="alan" style={{ flexBasis: 320 }}>
            <label htmlFor="unvan">Ünvan / ad *</label>
            <input id="unvan" name="unvan" required placeholder={tur === "musteri" ? "Yıldız Market" : "Yılmaz Gıda Ltd."} />
          </div>
          <div className="alan">
            <label htmlFor="telefon">Telefon</label>
            <input id="telefon" name="telefon" inputMode="tel" />
          </div>
          <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
            <label htmlFor="vade_gun">Vade (gün)</label>
            <input id="vade_gun" name="vade_gun" inputMode="numeric" placeholder="30" />
          </div>
        </div>
        <div className="form-satir" style={{ marginTop: 12 }}>
          <div className="alan">
            <label htmlFor="vergi_no">Vergi / TC no</label>
            <input id="vergi_no" name="vergi_no" inputMode="numeric" />
          </div>
          <div className="alan">
            <label htmlFor="vergi_dairesi">Vergi dairesi</label>
            <input id="vergi_dairesi" name="vergi_dairesi" />
          </div>
          <div className="alan">
            <label htmlFor="eposta">E-posta</label>
            <input id="eposta" name="eposta" type="email" />
          </div>
        </div>
        <div className="form-satir" style={{ marginTop: 12 }}>
          <div className="alan" style={{ flexBasis: 320 }}>
            <label htmlFor="adres">Adres</label>
            <input id="adres" name="adres" />
          </div>
          <div className="alan" style={{ flexBasis: 280 }}>
            <label htmlFor="iban">IBAN</label>
            <input id="iban" name="iban" placeholder="TR.." />
          </div>
        </div>
        <div className="form-satir" style={{ marginTop: 12 }}>
          <div className="alan">
            <label htmlFor="notlar">Not</label>
            <input id="notlar" name="notlar" />
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-ana" disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
        <FormMesaji sonuc={sonuc} />
      </form>
    </details>
  );
}
