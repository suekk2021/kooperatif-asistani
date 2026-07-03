// Sunucu (Vercel/Supabase) nerede calisirsa calissin, "bugun" her zaman
// Istanbul saat dilimine gore hesaplanir - gece yarisina yakin saatlerde
// UTC ile 1 gunluk kayma olmasin diye.
const ISTANBUL_FORMATLAYICI = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function bugunIstanbul(): string {
  return ISTANBUL_FORMATLAYICI.format(new Date());
}

/** Herhangi bir zaman damgasinin (ISO string/Date) Istanbul'daki takvim gununu (YYYY-MM-DD) dondurur. */
export function gunIstanbul(zaman: string | Date): string {
  return ISTANBUL_FORMATLAYICI.format(new Date(zaman));
}

export function ayBasiIstanbul(): string {
  return `${bugunIstanbul().slice(0, 7)}-01`;
}
