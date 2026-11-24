import type { Depo, StokDepoDurumu } from "@/types/database";

/** Stokun tutulduğu depolar, ekranda gösterim sırasıyla (Hammadde → Üretim → Mamül). */
export function gorevliDepolar(depolar: Depo[]): Depo[] {
  const sira = { hammadde: 0, uretim: 1, mamul: 2 } as const;
  return depolar.filter((d) => d.gorev && d.aktif).sort((a, b) => sira[a.gorev!] - sira[b.gorev!]);
}

/** kart id → depo id → miktar */
export function depoMiktarlari(satirlar: StokDepoDurumu[]): Record<string, Record<number, number>> {
  const sonuc: Record<string, Record<number, number>> = {};
  for (const s of satirlar) (sonuc[s.stok_karti_id] ??= {})[s.depo_id] = Number(s.miktar);
  return sonuc;
}
