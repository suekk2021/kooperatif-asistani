"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { sayimKaydet } from "@/app/actions/sayim";
import { FormMesaji } from "@/components/FormMesaji";
import { STOK_TURU_ADI, sayi, tl } from "@/lib/imece";
import type { StokTuru } from "@/types/database";

export type SayimSatiri = { id: string; ad: string; kod: string; tur: StokTuru; birim: string; sistem: number; ortalama: number };

function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

export function SayimFormu({ satirlar, bugun }: { satirlar: SayimSatiri[]; bugun: string }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<StokTuru | "hepsi">("hepsi");
  const [sayilan, setSayilan] = useState<Record<string, string>>({});
  const [sayan, setSayan] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu & { id?: string }>({});
  const [bekliyor, baslat] = useTransition();

  const turler = [...new Set(satirlar.map((s) => s.tur))];
  const gorunen = filtre === "hepsi" ? satirlar : satirlar.filter((s) => s.tur === filtre);
  const girilen = satirlar.filter((s) => Number.isFinite(sayiCoz(sayilan[s.id] ?? "")));
  const toplamFark = girilen.reduce((t, s) => t + (sayiCoz(sayilan[s.id]) - s.sistem) * s.ortalama, 0);

  function kaydet() {
    if (!girilen.length) return setSonuc({ hata: "Hiçbir karta sayılan miktar girilmedi. Sayılmayan kartları boş bırakın." });
    const eksi = girilen.find((s) => sayiCoz(sayilan[s.id]) < 0);
    if (eksi) return setSonuc({ hata: `${eksi.ad}: sayılan miktar eksi olamaz.` });
    baslat(async () => {
      const s = await sayimKaydet({
        tarih: bugun,
        sayan: sayan || undefined,
        aciklama: aciklama || undefined,
        kalemler: girilen.map((g) => ({ stok_karti_id: g.id, sayilan: sayiCoz(sayilan[g.id]) })),
      });
      setSonuc(s);
      if (s.id) router.push(`/stok/sayim/${s.id}`);
    });
  }

  return (
    <div className="kart">
      <div className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-satir">
          <div className="alan">
            <label htmlFor="sayan">Sayan kişi</label>
            <input id="sayan" value={sayan} onChange={(e) => setSayan(e.target.value)} placeholder="Nagihan" />
          </div>
          <div className="alan" style={{ flex: "2 1 260px" }}>
            <label htmlFor="aciklama">Not</label>
            <input id="aciklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Ay sonu sayımı, soğuk depo…" />
          </div>
        </div>
        <div className="secim">
          <button type="button" className={filtre === "hepsi" ? "aktif" : undefined} onClick={() => setFiltre("hepsi")}>
            Hepsi
          </button>
          {turler.map((t) => (
            <button key={t} type="button" className={filtre === t ? "aktif" : undefined} onClick={() => setFiltre(t)}>
              {STOK_TURU_ADI[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="tablo-kutu">
        <table className="kart-tablo">
          <thead>
            <tr>
              <th>Kart</th>
              <th className="sag">Sistemde</th>
              <th className="sag">Sayılan</th>
              <th className="sag">Fark</th>
            </tr>
          </thead>
          <tbody>
            {gorunen.map((s) => {
              const deger = sayiCoz(sayilan[s.id] ?? "");
              const girildi = Number.isFinite(deger);
              const fark = girildi ? deger - s.sistem : 0;
              return (
                <tr key={s.id}>
                  <td>
                    <b>{s.ad}</b> <span className="kod">{s.kod}</span>
                  </td>
                  <td data-label="Sistemde" className="sag num">
                    {sayi(s.sistem)} {s.birim}
                  </td>
                  <td data-label="Sayılan" className="sag">
                    <div className="alan" style={{ alignItems: "flex-end" }}>
                      <input
                        inputMode="decimal"
                        value={sayilan[s.id] ?? ""}
                        onChange={(e) => setSayilan((d) => ({ ...d, [s.id]: e.target.value }))}
                        placeholder="sayılmadı"
                        style={{ maxWidth: 140, textAlign: "right" }}
                      />
                    </div>
                  </td>
                  <td data-label="Fark" className={`sag num${!girildi ? " soluk" : fark < 0 ? " kirmizi" : fark > 0 ? " amber" : " yesil"}`}>
                    {!girildi ? "—" : fark === 0 ? "✓ tutuyor" : `${fark > 0 ? "+" : ""}${sayi(fark)} ${s.birim} · ${tl(fark * s.ortalama)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="kart-ic form-alt" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--cizgi)" }}>
        <span className="soluk num">
          {girilen.length} kart sayıldı · toplam fark{" "}
          <b className={toplamFark < 0 ? "kirmizi" : undefined}>{tl(toplamFark)}</b>
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
          <button type="button" className="btn btn-ana" onClick={kaydet} disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Sayımı kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
