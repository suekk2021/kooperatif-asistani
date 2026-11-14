"use client";

import { useActionState, useState } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { aySonuKaydet } from "@/app/actions/personel";
import { FormMesaji } from "@/components/FormMesaji";
import type { MaasAyOzeti } from "@/types/database";

/** Avans/kesinti düzeltmesi ve "ödendi" tarihi; düğmeye basınca açılır, tablo kalabalık olmasın. */
export function AySonuFormu({ personelId, ay, ozet }: { personelId: string; ay: string; ozet: MaasAyOzeti }) {
  const [acik, setAcik] = useState(false);
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => {
    const s = await aySonuKaydet(personelId, ay, fd);
    if (s.basarili) setAcik(false);
    return s;
  }, {});

  if (!acik) {
    return (
      <>
        <button type="button" className="btn btn-cizgi" onClick={() => setAcik(true)}>
          Düzelt / ödendi
        </button>
        <FormMesaji sonuc={sonuc} />
      </>
    );
  }
  return (
    <form action={action} style={{ display: "grid", gap: 6, minWidth: 220 }}>
      <label style={{ fontSize: 12.5 }}>
        Düzeltme (₺, avans/kesinti için eksi yazın)
        <input
          name="duzeltme"
          inputMode="decimal"
          defaultValue={Number(ozet.duzeltme) ? String(ozet.duzeltme).replace(".", ",") : ""}
          placeholder="örn. -500"
        />
      </label>
      <label style={{ fontSize: 12.5 }}>
        Açıklama
        <input name="duzeltme_aciklama" defaultValue={ozet.duzeltme_aciklama ?? ""} placeholder="örn. Avans" />
      </label>
      <label style={{ fontSize: 12.5 }}>
        Ödendiği tarih
        <input name="odendi_tarihi" type="date" defaultValue={ozet.odendi_tarihi ?? ""} />
      </label>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "…" : "Kaydet"}
        </button>
        <button type="button" className="btn btn-cizgi" onClick={() => setAcik(false)}>
          Vazgeç
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}
