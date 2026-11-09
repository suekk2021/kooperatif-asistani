import type { UretimPartisi } from "@/types/database";

/** Parti süresi dakika olarak (bitmemişse şu ana kadar). */
export function partiSuresiDk(p: Pick<UretimPartisi, "baslangic" | "bitis">): number {
  const bitis = p.bitis ? new Date(p.bitis).getTime() : Date.now();
  return Math.max(0, Math.round((bitis - new Date(p.baslangic).getTime()) / 60000));
}

export function sureYazisi(dk: number): string {
  const s = Math.floor(dk / 60);
  const d = dk % 60;
  return s ? `${s} sa ${d} dk` : `${d} dk`;
}

/** Bozuk / (paketlenen + bozuk) — yüzde. */
export function uretimFiresi(p: Pick<UretimPartisi, "uretilen_miktar" | "bozuk_miktar">): number | null {
  const u = Number(p.uretilen_miktar ?? 0);
  const b = Number(p.bozuk_miktar ?? 0);
  return u + b > 0 ? (b / (u + b)) * 100 : null;
}

export function yuzde(n: number | null | undefined, hane = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return `%${n.toLocaleString("tr-TR", { minimumFractionDigits: hane, maximumFractionDigits: hane })}`;
}

export function saatTR(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
