"use client";

import { useActionState, useState, useTransition } from "react";
import { acilisAyariKaydet, acilisKaydet, type AcilisGirdisi } from "@/app/actions/acilis";
import type { FormSonucu } from "@/app/actions/cariler";
import { FormMesaji } from "@/components/FormMesaji";
import { sayi, tl } from "@/lib/imece";

function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

export function AcilisAyarFormu({
  tarih,
  karsiHesap,
  hesaplar,
}: {
  tarih: string | null;
  karsiHesap: string | null;
  hesaplar: { kod: string; ad: string }[];
}) {
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => acilisAyariKaydet(fd), {});
  return (
    <form action={action} className="form-satir" style={{ alignItems: "flex-end" }}>
      <div className="alan" style={{ flex: "0 1 170px" }}>
        <label htmlFor="tarih">Açılış tarihi</label>
        <input id="tarih" name="tarih" type="date" defaultValue={tarih ?? ""} required />
      </div>
      <div className="alan" style={{ flex: "2 1 260px" }}>
        <label htmlFor="karsi_hesap">Karşı hesap (muhasebecinin söylediği)</label>
        <select id="karsi_hesap" name="karsi_hesap" defaultValue={karsiHesap ?? ""} required>
          <option value="" disabled>
            Seçin
          </option>
          {hesaplar.map((h) => (
            <option key={h.kod} value={h.kod}>
              {h.kod} · {h.ad}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-cizgi" disabled={bekliyor}>
        {bekliyor ? "Kaydediliyor…" : "Ayarı kaydet"}
      </button>
      <div style={{ flexBasis: "100%" }}>
        <FormMesaji sonuc={sonuc} />
      </div>
    </form>
  );
}

export type AcilisSatiri = {
  id: string;
  ad: string;
  kod: string;
  alt?: string; // "Banka", "müşteri", "kg" gibi
  onceki: number; // daha önce açılışa girilmiş tutar/miktar
  oncekiDeger?: number; // stokta önceki açılışın TL değeri
};

const ETIKET = {
  para: { baslik: "Açılış günündeki bakiye (₺)", ipucu: "Kasadaki nakit / bankadaki para. Kredi kartında: o günkü kart borcu." },
  cari: { baslik: "Açılış günündeki bakiye (₺)", ipucu: "Müşteri: bize borcu. Tedarikçi: bizim ona borcumuz. Fazla ödeme/avans varsa eksi yazın." },
  stok: { baslik: "Sayılan miktar", ipucu: "Depoda sayılan miktar ve birim maliyet (bilinmiyorsa son alış fiyatı)." },
};

export function AcilisTablosu({ tur, satirlar, kilitli }: { tur: "para" | "cari" | "stok"; satirlar: AcilisSatiri[]; kilitli: boolean }) {
  const [deger, setDeger] = useState<Record<string, string>>({});
  const [maliyet, setMaliyet] = useState<Record<string, string>>({});
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  const dolu = satirlar.filter((s) => Number.isFinite(sayiCoz(deger[s.id] ?? "")) && sayiCoz(deger[s.id] ?? "") !== 0);
  const toplam = dolu.reduce((t, s) => t + sayiCoz(deger[s.id]) * (tur === "stok" ? sayiCoz(maliyet[s.id] ?? "") || 0 : 1), 0);

  function kaydet() {
    if (kilitli) return setSonuc({ hata: "Önce yukarıdan açılış tarihi ve karşı hesabı girin." });
    if (!dolu.length) return setSonuc({ hata: "Hiçbir satıra değer girilmedi." });
    if (tur === "stok") {
      const maliyetsiz = dolu.find((s) => !(sayiCoz(maliyet[s.id] ?? "") >= 0));
      if (maliyetsiz) return setSonuc({ hata: `${maliyetsiz.ad}: birim maliyet girin (bilinmiyorsa son alış fiyatı).` });
    }
    const girdi: AcilisGirdisi =
      tur === "para"
        ? { para: dolu.map((s) => ({ hesap_id: s.id, tutar: sayiCoz(deger[s.id]) })) }
        : tur === "cari"
          ? { cariler: dolu.map((s) => ({ cari_id: s.id, tutar: sayiCoz(deger[s.id]) })) }
          : { stok: dolu.map((s) => ({ stok_karti_id: s.id, miktar: sayiCoz(deger[s.id]), birim_maliyet: sayiCoz(maliyet[s.id]) })) };
    baslat(async () => {
      const s = await acilisKaydet(girdi);
      setSonuc(s);
      if (s.basarili) {
        setDeger({});
        setMaliyet({});
      }
    });
  }

  if (!satirlar.length) {
    return <p className="bos">Bu sekmede kart yok. Önce ilgili ekrandan kart açın.</p>;
  }

  return (
    <>
      <p className="soluk" style={{ margin: 0, padding: "12px 20px 0", fontSize: 13.5 }}>
        {ETIKET[tur].ipucu} Boş bırakılan satırlar kaydedilmez.
      </p>
      <div className="tablo-kutu">
        <table className="kart-tablo">
          <thead>
            <tr>
              <th>{tur === "para" ? "Hesap" : tur === "cari" ? "Cari" : "Stok kartı"}</th>
              <th className="sag">Daha önce girilen</th>
              <th className="sag">{ETIKET[tur].baslik}</th>
              {tur === "stok" && <th className="sag">Birim maliyet (₺)</th>}
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => (
              <tr key={s.id}>
                <td>
                  <b>{s.ad}</b> <span className="kod">{s.kod}</span>
                  {s.alt && <span className="soluk" style={{ fontSize: 12.5 }}> · {s.alt}</span>}
                </td>
                <td data-label="Daha önce girilen" className={`sag num${s.onceki ? "" : " soluk"}`}>
                  {s.onceki ? (tur === "stok" ? `${sayi(s.onceki)} · ${tl(s.oncekiDeger)}` : tl(s.onceki)) : "—"}
                </td>
                <td data-label={ETIKET[tur].baslik} className="sag">
                  <div className="alan" style={{ alignItems: "flex-end" }}>
                    <input
                      inputMode="decimal"
                      value={deger[s.id] ?? ""}
                      onChange={(e) => setDeger((d) => ({ ...d, [s.id]: e.target.value }))}
                      placeholder="0"
                      style={{ maxWidth: 160, textAlign: "right" }}
                    />
                  </div>
                </td>
                {tur === "stok" && (
                  <td data-label="Birim maliyet" className="sag">
                    <div className="alan" style={{ alignItems: "flex-end" }}>
                      <input
                        inputMode="decimal"
                        value={maliyet[s.id] ?? ""}
                        onChange={(e) => setMaliyet((d) => ({ ...d, [s.id]: e.target.value }))}
                        placeholder="0,00"
                        style={{ maxWidth: 140, textAlign: "right" }}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kart-ic" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--cizgi)" }}>
        <span className="soluk num">
          {dolu.length} satır dolu{tur === "stok" ? ` · değer ${tl(toplam)}` : ` · toplam ${tl(toplam)}`}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <FormMesaji sonuc={sonuc} />
          <button type="button" className="btn btn-ana" onClick={kaydet} disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Açılışa kaydet"}
          </button>
        </div>
      </div>
    </>
  );
}
