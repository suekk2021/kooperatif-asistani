export type YasDilimi = "vadesi_gelmedi" | "0_30" | "31_60" | "61_90" | "90_ustu" | "belgesiz";

export const YAS_DILIMLERI: { kod: YasDilimi; ad: string }[] = [
  { kod: "vadesi_gelmedi", ad: "Vadesi gelmedi" },
  { kod: "0_30", ad: "1–30 gün gecikmiş" },
  { kod: "31_60", ad: "31–60 gün" },
  { kod: "61_90", ad: "61–90 gün" },
  { kod: "90_ustu", ad: "90 günden fazla" },
  { kod: "belgesiz", ad: "Açılış / belgesiz" },
];

export type YaslandirmaFaturasi = { tarih: string; vade_tarihi: string | null; genel_toplam: number };

export type CariYaslandirma = {
  dilimler: Record<YasDilimi, number>;
  toplam: number;
  gecikmis: number;
  enEskiGecikmeGun: number;
};

function gunFarki(bugun: string, tarih: string): number {
  return Math.round((Date.parse(`${bugun}T12:00:00Z`) - Date.parse(`${tarih}T12:00:00Z`)) / 86_400_000);
}

function dilim(gecikme: number): YasDilimi {
  if (gecikme <= 0) return "vadesi_gelmedi";
  if (gecikme <= 30) return "0_30";
  if (gecikme <= 60) return "31_60";
  if (gecikme <= 90) return "61_90";
  return "90_ustu";
}

/**
 * Tahsilatlar faturaya değil cariye yapıldığı için "ilk giren ilk kapanır" kabul edilir:
 * açık bakiye en yeni faturalardan geriye doğru dağıtılır. Faturalarla açıklanamayan kalan
 * (açılış bakiyesi gibi) "belgesiz" dilimine düşer.
 */
export function cariYaslandir(bakiye: number, faturalar: YaslandirmaFaturasi[], bugun: string): CariYaslandirma {
  const dilimler: Record<YasDilimi, number> = {
    vadesi_gelmedi: 0, "0_30": 0, "31_60": 0, "61_90": 0, "90_ustu": 0, belgesiz: 0,
  };
  let kalan = Math.round(bakiye * 100) / 100;
  let enEskiGecikmeGun = 0;
  const yenidenEskiye = [...faturalar].sort((a, b) => b.tarih.localeCompare(a.tarih));
  for (const f of yenidenEskiye) {
    if (kalan <= 0) break;
    const pay = Math.min(kalan, Number(f.genel_toplam));
    const gecikme = gunFarki(bugun, f.vade_tarihi ?? f.tarih);
    dilimler[dilim(gecikme)] += pay;
    if (gecikme > enEskiGecikmeGun) enEskiGecikmeGun = gecikme;
    kalan = Math.round((kalan - pay) * 100) / 100;
  }
  if (kalan > 0) dilimler.belgesiz += kalan;
  for (const k of Object.keys(dilimler) as YasDilimi[]) dilimler[k] = Math.round(dilimler[k] * 100) / 100;
  const toplam = Math.max(0, Math.round(bakiye * 100) / 100);
  const gecikmis = Math.round((dilimler["0_30"] + dilimler["31_60"] + dilimler["61_90"] + dilimler["90_ustu"]) * 100) / 100;
  return { dilimler, toplam, gecikmis, enEskiGecikmeGun };
}
