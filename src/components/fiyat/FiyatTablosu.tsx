"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { fiyatlariKaydet } from "@/app/actions/fiyat-listeleri";
import { FormMesaji } from "@/components/FormMesaji";
import { kodGoster, sayi, sayiGirdi, tl, trSayi } from "@/lib/imece";

export type FiyatSatiri = {
  stok_karti_id: string;
  kod: string;
  ad: string;
  birim: string;
  /** Kartın eski tek "liste satış fiyatı" — yalnız yol göstermek için. */
  kartFiyati: number | null;
  /** Kart pasifse ya da artık satılmıyorsa yalnız listeden çıkarılabilir. */
  satilabilir: boolean;
  donusumler: { birim: string; katsayi: number }[];
};

export function FiyatTablosu({
  listeId,
  satirlar,
  fiyatlar,
  yetkili,
}: {
  listeId: string;
  satirlar: FiyatSatiri[];
  fiyatlar: Record<string, number>;
  yetkili: boolean;
}) {
  const router = useRouter();
  const ilk = useMemo(
    () => Object.fromEntries(satirlar.map((s) => [s.stok_karti_id, sayiGirdi(fiyatlar[s.stok_karti_id] ?? null)])),
    [satirlar, fiyatlar]
  );
  const [girdi, setGirdi] = useState<Record<string, string>>(ilk);
  const [ara, setAra] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  const degisen = satirlar.filter((s) => (girdi[s.stok_karti_id] ?? "").trim() !== (ilk[s.stok_karti_id] ?? "")).length;
  const listede = satirlar.filter((s) => (girdi[s.stok_karti_id] ?? "").trim()).length;
  const aranan = ara.trim().toLocaleLowerCase("tr-TR");
  const gorunen = aranan
    ? satirlar.filter((s) => s.ad.toLocaleLowerCase("tr-TR").includes(aranan) || kodGoster(s.kod).includes(aranan))
    : satirlar;

  function kaydet() {
    setSonuc({});
    baslat(async () => {
      const s = await fiyatlariKaydet(
        listeId,
        satirlar.map((r) => ({ stok_karti_id: r.stok_karti_id, fiyat: girdi[r.stok_karti_id] ?? "" }))
      );
      setSonuc(s);
      if (s.basarili) router.refresh();
    });
  }

  return (
    <div className="kart">
      <div className="kart-bas" style={{ flexWrap: "wrap", gap: 8 }}>
        <h2>Fiyatlar</h2>
        <span className="soluk">
          {listede} ürün listede · fiyatlar <b>ana birim</b> başına, KDV hariç
        </span>
      </div>
      <div className="kart-ic" style={{ paddingBottom: 0 }}>
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ürün ara…" style={{ maxWidth: 320 }} />
      </div>
      {satirlar.length === 0 ? (
        <p className="bos">Satılabilir ürün kartı yok (Stok → tür: Ürün veya Ticari mal).</p>
      ) : (
        <div className="tablo-kutu">
          <table className="kart-tablo liste-tablo">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Ana birim</th>
                <th className="sag">Fiyat (KDV hariç)</th>
                <th>Diğer birimlerde</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.map((s) => {
                const ham = (girdi[s.stok_karti_id] ?? "").trim();
                const f = ham ? trSayi(ham) : NaN;
                const gecerli = Number.isFinite(f) && f > 0;
                return (
                  <tr key={s.stok_karti_id}>
                    <td className="liste-baslik">
                      <b>{s.ad}</b> <span className="kod">{kodGoster(s.kod)}</span>
                      {!s.satilabilir && <span className="etk e-gri"> satışta değil</span>}
                    </td>
                    <td data-label="Ana birim">{s.birim}</td>
                    <td data-label="Fiyat" className="sag">
                      {yetkili ? (
                        <input
                          inputMode="decimal"
                          value={girdi[s.stok_karti_id] ?? ""}
                          onChange={(e) => setGirdi((g) => ({ ...g, [s.stok_karti_id]: e.target.value }))}
                          placeholder={s.kartFiyati !== null ? `kart: ${sayiGirdi(s.kartFiyati)}` : "listede yok"}
                          style={{ maxWidth: 140, textAlign: "right", ...(ham && !gecerli ? { borderColor: "var(--amber)" } : {}) }}
                        />
                      ) : (
                        <span className="num">{gecerli ? tl(f) : <span className="soluk">listede yok</span>}</span>
                      )}
                    </td>
                    <td data-label="Diğer birimlerde" className="soluk" style={{ fontSize: 13 }}>
                      {s.donusumler.length === 0
                        ? "—"
                        : s.donusumler.map((d) => (
                            <div key={d.birim} className="num">
                              1 {d.birim} = {sayi(d.katsayi)} {s.birim}
                              {gecerli && ` → ${tl(Math.round(f * d.katsayi * 100) / 100)}`}
                            </div>
                          ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {yetkili && (
        <div className="kart-ic" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="soluk" style={{ fontSize: 13, marginRight: "auto" }}>
            Fiyatı silinen ürün listeden çıkar; bu listeyi kullanan müşterilere satılamaz.
          </span>
          <FormMesaji sonuc={sonuc} />
          <button type="button" className="btn btn-ana" disabled={bekliyor || degisen === 0} onClick={kaydet}>
            {bekliyor ? "Kaydediliyor…" : degisen ? `Kaydet (${degisen} değişiklik)` : "Kaydet"}
          </button>
        </div>
      )}
    </div>
  );
}
