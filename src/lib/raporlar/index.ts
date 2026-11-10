import type { Istemci } from "./sorgu";
import type { Donem, Rapor } from "./tipler";
import { satisRaporu } from "./satis";
import { fireRaporu } from "./fire";
import { yaslandirmaRaporu } from "./yaslandirma";
import { mizanRaporu } from "./mizan";
import { kdvRaporu } from "./kdv";

export type RaporKodu = "satis" | "fire" | "yaslandirma" | "mizan" | "kdv";

export const RAPORLAR: { kod: RaporKodu; ad: string; aciklama: string; donemli: boolean }[] = [
  { kod: "satis", ad: "Satış ve kârlılık", aciklama: "Ürün ve müşteri bazında ciro, maliyet, kâr", donemli: true },
  { kod: "fire", ad: "Fire ve kaçak", aciklama: "Üretim firesi, parti listesi, sayım farkları", donemli: true },
  { kod: "yaslandirma", ad: "Alacak yaşlandırma", aciklama: "Kim ne kadar borçlu, ne kadar gecikmiş", donemli: false },
  { kod: "mizan", ad: "Mizan", aciklama: "Hesap kodlu borç/alacak/bakiye", donemli: true },
  { kod: "kdv", ad: "KDV özeti", aciklama: "Hesaplanan ve indirilecek KDV", donemli: true },
];

export function raporKodu(r: string | undefined): RaporKodu {
  return RAPORLAR.some((x) => x.kod === r) ? (r as RaporKodu) : "satis";
}

export function raporUret(s: Istemci, kod: RaporKodu, d: Donem, bugun: string): Promise<Rapor> {
  switch (kod) {
    case "satis":
      return satisRaporu(s, d);
    case "fire":
      return fireRaporu(s, d);
    case "yaslandirma":
      return yaslandirmaRaporu(s, bugun);
    case "mizan":
      return mizanRaporu(s, d);
    case "kdv":
      return kdvRaporu(s, d);
  }
}
