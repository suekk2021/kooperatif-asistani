"use client";

import { useState, useTransition } from "react";
import { alisIptal } from "@/app/actions/alis";
import { satisIptal } from "@/app/actions/satis";
import { partiIptal } from "@/app/actions/uretim";
import { paraHareketiIptal } from "@/app/actions/kasa";
import type { FormSonucu } from "@/app/actions/cariler";
import { FormMesaji } from "@/components/FormMesaji";

const ISLEMLER = { alis: alisIptal, satis: satisIptal, para: paraHareketiIptal, parti: partiIptal };

// Tarayıcının onay penceresi (confirm) yerine satır içinde açılan küçük form:
// iptal nedeni zorunlu, kayıt silinmez, ters kayıt oluşur.
export function IptalFormu({ tur, id, etiket = "İptal et" }: { tur: keyof typeof ISLEMLER; id: string; etiket?: string }) {
  const [acik, setAcik] = useState(false);
  const [neden, setNeden] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  if (!acik) {
    return (
      <button type="button" className="btn btn-cizgi" style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }} onClick={() => setAcik(true)}>
        {etiket}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <div className="alan" style={{ flex: "1 1 200px", minWidth: 180 }}>
          <input
            autoFocus
            placeholder="İptal nedeni (zorunlu)"
            value={neden}
            onChange={(e) => setNeden(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-ana"
          style={{ background: "var(--mercan)" }}
          disabled={bekliyor}
          onClick={() => baslat(async () => setSonuc(await ISLEMLER[tur](id, neden)))}
        >
          {bekliyor ? "İptal ediliyor…" : "İptali onayla"}
        </button>
        <button type="button" className="btn btn-cizgi" onClick={() => setAcik(false)}>
          Vazgeç
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </div>
  );
}
