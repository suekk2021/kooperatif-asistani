export type SutunTuru = "metin" | "tl" | "sayi" | "yuzde" | "tarih";

export type Sutun = { ad: string; tur: SutunTuru };

export type Hucre = string | number | null;

export type RaporBolumu = {
  baslik: string;
  sutunlar: Sutun[];
  satirlar: Hucre[][];
  toplam?: Hucre[];
  /** Satıra tıklanınca gidilecek sayfa (ekranda; Excel'de yok). */
  baglantilar?: (string | null)[];
};

export type Rapor = {
  baslik: string;
  donemYazisi: string;
  notlar: string[];
  bolumler: RaporBolumu[];
};

export type Donem = { ay: string; bas: string; son: string };

/** "2026-11" → ayın ilk ve son günü. Geçersizse bu ay. */
export function donemCoz(ay: string | undefined, bugun: string): Donem {
  const gecerli = ay && /^\d{4}-\d{2}$/.test(ay) ? ay : bugun.slice(0, 7);
  const [y, a] = gecerli.split("-").map(Number);
  const son = new Date(Date.UTC(y, a, 0)).toISOString().slice(0, 10);
  return { ay: gecerli, bas: `${gecerli}-01`, son };
}

export function ayAdi(ay: string): string {
  const [y, a] = ay.split("-").map(Number);
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, a - 1, 15)));
}

export const yuvarla = (n: number) => Math.round(n * 100) / 100;
