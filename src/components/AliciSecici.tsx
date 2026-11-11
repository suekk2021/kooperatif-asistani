"use client";

import { useState } from "react";
import { ROLLER, rolBilgisi } from "@/lib/roller";
import type { KullaniciRolu } from "@/types/database";

export type AliciKisi = { id: string; ad_soyad: string; rol: KullaniciRolu | null };

const dugme = (acik: boolean) =>
  `rounded-full px-3 py-1 text-xs font-medium ${acik ? "bg-pine text-white" : "bg-paper text-ink-soft hover:bg-line"}`;

/**
 * Not / hatırlatıcı için "kime" seçimi: Herkes, rol grubu ya da tek tek kişiler (çoklu).
 * Seçim kişi listesine çevrilir; `name` verilirse form için gizli alanlar üretir.
 * Kendisi listeden çıkarılmak istenirse `haricId` verilir.
 */
export function AliciSecici({
  kisiler,
  name,
  baslangic,
  secili,
  onDegisti,
  haricId,
}: {
  kisiler: AliciKisi[];
  name?: string;
  baslangic?: string[];
  secili?: string[];
  onDegisti?: (idler: string[]) => void;
  haricId?: string;
}) {
  const [ic, setIc] = useState<string[]>(baslangic ?? []);
  const liste = kisiler.filter((k) => k.id !== haricId);
  const gecerli = new Set(liste.map((k) => k.id));
  const seciliKume = new Set((secili ?? ic).filter((id) => gecerli.has(id)));

  function degistir(yeni: Set<string>) {
    const dizi = liste.map((k) => k.id).filter((id) => yeni.has(id));
    if (secili === undefined) setIc(dizi);
    onDegisti?.(dizi);
  }

  function kisiyiDegistir(id: string) {
    const yeni = new Set(seciliKume);
    if (yeni.has(id)) yeni.delete(id);
    else yeni.add(id);
    degistir(yeni);
  }

  function grubuDegistir(idler: string[]) {
    const yeni = new Set(seciliKume);
    const hepsiSecili = idler.every((id) => yeni.has(id));
    idler.forEach((id) => (hepsiSecili ? yeni.delete(id) : yeni.add(id)));
    degistir(yeni);
  }

  // Gruplar kişilerin gerçek rollerinden çıkar (roller.ts'e eklenen yeni rol, birine verilince kendiliğinden görünür);
  // sıra roller.ts'deki sıradır.
  const mevcutRoller = new Set(liste.map((k) => k.rol).filter((r): r is KullaniciRolu => Boolean(r)));
  const roller = [...ROLLER.map((r) => r.deger).filter((r) => mevcutRoller.has(r)), ...Array.from(mevcutRoller).filter((r) => !rolBilgisi(r))];
  const hepsi = liste.map((k) => k.id);
  const herkesSecili = hepsi.length > 0 && hepsi.every((id) => seciliKume.has(id));

  return (
    <div className="space-y-2">
      {name && Array.from(seciliKume).map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={herkesSecili} onClick={() => grubuDegistir(hepsi)} className={dugme(herkesSecili)}>
          Herkes
        </button>
        {roller.map((rol) => {
          const uyeler = liste.filter((k) => k.rol === rol).map((k) => k.id);
          const acik = uyeler.every((id) => seciliKume.has(id));
          return (
            <button key={rol} type="button" aria-pressed={acik} onClick={() => grubuDegistir(uyeler)} className={dugme(acik)}>
              {rolBilgisi(rol)?.ad ?? rol} ({uyeler.length})
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {liste.map((k) => {
          const acik = seciliKume.has(k.id);
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={acik}
              onClick={() => kisiyiDegistir(k.id)}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                acik ? "border-pine bg-pine/10 font-medium text-pine" : "border-line text-ink-soft hover:bg-paper"
              }`}
            >
              {acik ? "✓ " : ""}
              {k.ad_soyad}
            </button>
          );
        })}
      </div>
    </div>
  );
}
