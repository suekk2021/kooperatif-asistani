"use client";

import { useActionState, useEffect, useRef } from "react";
import { birimDonusumuEkle, birimDonusumuGuncelle } from "@/app/actions/birim-donusumleri";
import type { FormSonucu } from "@/app/actions/cariler";
import { FormMesaji } from "@/components/FormMesaji";
import { STOK_BIRIMLERI, sayi, sayiGirdi } from "@/lib/imece";
import type { BirimDonusumu, StokBirimi } from "@/types/database";

function DonusumSatiri({ d, kartId, anaBirim, yazar }: { d: BirimDonusumu; kartId: string; anaBirim: string; yazar: boolean }) {
  const [sonuc, action, bekliyor] = useActionState(
    async (_o: FormSonucu, fd: FormData) => birimDonusumuGuncelle(d.id, kartId, fd),
    {}
  );
  if (!yazar) {
    return (
      <div className="num" style={{ padding: "6px 0" }}>
        1 {d.birim} = <b>{sayi(d.katsayi)}</b> {anaBirim} {!d.aktif && <span className="etk e-gri">kapalı</span>}
      </div>
    );
  }
  return (
    <form
      key={`${d.katsayi}|${d.aktif}`}
      action={action}
      style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0", borderBottom: "1px solid var(--cizgi)" }}
    >
      <span style={{ minWidth: 70 }}>
        1 <b>{d.birim}</b> =
      </span>
      <input name="katsayi" inputMode="decimal" defaultValue={sayiGirdi(d.katsayi)} style={{ maxWidth: 110, textAlign: "right" }} />
      <span>{anaBirim}</span>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, cursor: "pointer" }}>
        <input type="checkbox" name="aktif" defaultChecked={d.aktif} /> satışta kullanılsın
      </label>
      <button type="submit" className="btn btn-cizgi" style={{ minHeight: 32, padding: "4px 12px" }} disabled={bekliyor}>
        {bekliyor ? "…" : "Kaydet"}
      </button>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}

export function BirimDonusumleri({
  kartId,
  anaBirim,
  donusumler,
  yazar,
}: {
  kartId: string;
  anaBirim: StokBirimi;
  donusumler: BirimDonusumu[];
  yazar: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => birimDonusumuEkle(kartId, fd), {});
  useEffect(() => {
    if (sonuc.basarili) formRef.current?.reset();
  }, [sonuc]);
  const bosBirimler = STOK_BIRIMLERI.filter((b) => b !== anaBirim && !donusumler.some((d) => d.birim === b));

  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart-bas">
        <h2>Birim dönüşümleri</h2>
        <span className="soluk">
          Ana birim <b>{anaBirim}</b> · satışta paket/koli seçilse de stok ve fatura {anaBirim} olur
        </span>
      </div>
      <div className="kart-ic">
        {donusumler.length === 0 ? (
          <p className="soluk" style={{ margin: 0 }}>
            Tanımlı başka birim yok; bu ürün yalnız {anaBirim} ile satılır.
          </p>
        ) : (
          donusumler.map((d) => <DonusumSatiri key={d.id} d={d} kartId={kartId} anaBirim={anaBirim} yazar={yazar} />)
        )}
        {yazar && bosBirimler.length > 0 && (
          <form ref={formRef} action={action} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 14 }}>
            <div className="alan" style={{ flex: "0 1 120px" }}>
              <label htmlFor="yeni-birim">Yeni birim</label>
              <select id="yeni-birim" name="birim" defaultValue={bosBirimler.includes("paket") ? "paket" : bosBirimler[0]}>
                {bosBirimler.map((b) => (
                  <option key={b} value={b}>
                    1 {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="alan" style={{ flex: "0 1 160px" }}>
              <label htmlFor="yeni-katsayi">= kaç {anaBirim}?</label>
              <input id="yeni-katsayi" name="katsayi" inputMode="decimal" placeholder={anaBirim === "kg" ? "0,410" : "12"} required />
            </div>
            <button type="submit" className="btn btn-ana" disabled={bekliyor}>
              {bekliyor ? "Ekleniyor…" : "Ekle"}
            </button>
            <FormMesaji sonuc={sonuc} />
          </form>
        )}
      </div>
    </div>
  );
}
