import type {
  CariTuru,
  ParaHareketiTuru,
  ParaHesabiTuru,
  StokBirimi,
  StokTuru,
} from "@/types/database";

export const STOK_TURU_ADI: Record<StokTuru, string> = {
  hammadde: "Hammadde",
  ambalaj: "Ambalaj",
  yari_mamul: "Yarı mamul",
  mamul: "Ürün (mamul)",
  ticari_mal: "Ticari mal",
  yardimci: "Yardımcı malzeme",
};

export const STOK_TURLERI = Object.keys(STOK_TURU_ADI) as StokTuru[];

/** Stok kodunu noktasız gösterir: "150.10.003" -> "15010003" (veritabanında noktalı kalır). */
export function kodGoster(kod: string | null | undefined): string {
  return (kod ?? "").replace(/\./g, "");
}

/** Stok kodunun ana hesapları ve bu ana hesapta açılabilecek türler (veritabanındaki kontrolle aynı). */
export const ANA_GRUPLAR: { kod: "150" | "151" | "152" | "153"; ad: string; turler: StokTuru[] }[] = [
  { kod: "150", ad: "İlk madde ve malzeme", turler: ["hammadde", "ambalaj", "yardimci"] },
  { kod: "151", ad: "Yarı mamuller", turler: ["yari_mamul"] },
  { kod: "152", ad: "Mamuller (ürünler)", turler: ["mamul"] },
  { kod: "153", ad: "Ticari mallar", turler: ["ticari_mal"] },
];

export const STOK_BIRIMLERI: StokBirimi[] = ["kg", "g", "lt", "adet", "paket", "koli"];

export const CARI_TURU_ADI: Record<CariTuru, { tekil: string; cogul: string }> = {
  musteri: { tekil: "Müşteri", cogul: "Müşteriler" },
  tedarikci: { tekil: "Tedarikçi", cogul: "Tedarikçiler" },
};

const tlBicimi = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sayiBicimi = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });

/** 1234.5 -> "1.234,50 ₺" */
export function tl(tutar: number | null | undefined): string {
  return `${tlBicimi.format(Number(tutar ?? 0))} ₺`;
}

export function sayi(deger: number | null | undefined): string {
  return sayiBicimi.format(Number(deger ?? 0));
}

/** Formdan gelen metni kırpar; boşsa null döner. */
export function metin(formData: FormData, ad: string): string | null {
  const deger = String(formData.get(ad) ?? "").trim();
  return deger || null;
}

/** "1.250,5" / "12,5" / "12.5" -> sayı; boş veya geçersizse null.
 *  Virgül varsa Türkçe yazım sayılır (nokta binlik ayırıcı); yoksa nokta ondalıktır. */
export function ondalik(formData: FormData, ad: string): number | null {
  const ham = metin(formData, ad);
  if (ham === null) return null;
  const deger = Number(ham.includes(",") ? ham.replace(/\./g, "").replace(",", ".") : ham);
  return Number.isFinite(deger) ? deger : null;
}

export const PARA_HESABI_TURU_ADI: Record<ParaHesabiTuru, string> = {
  kasa: "Kasa",
  banka: "Banka",
  pos: "POS",
  kredi_karti: "Kredi kartı",
};

export const PARA_HAREKETI_TURU_ADI: Record<ParaHareketiTuru, string> = {
  tahsilat: "Tahsilat",
  odeme: "Ödeme",
  virman: "Virman",
};

/** Alış faturasında stoğa girmeyen kalemlerin yazılabileceği hesaplar (veritabanı da aynı kuralı uygular). */
export const GIDER_HESABI_DESENI = /^(25[0-9]|26[0-9]|7[0-9]0)/;

/** "2026-11-09" -> "09.11.2026" */
export function tarihTR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, a, g] = iso.slice(0, 10).split("-");
  return `${g}.${a}.${y}`;
}

/** Veritabanı hatasını kullanıcının anlayacağı cümleye çevirir. */
export function hataMesaji(hata: { code?: string; message: string }, tekrarMesaji: string): string {
  if (hata.code === "23505") return tekrarMesaji;
  if (hata.code === "42501") return "Bu işlem için yetkiniz yok.";
  if (hata.code === "P0001") return hata.message; // fonksiyonlardaki raise exception: zaten Türkçe
  if (hata.code === "23514") return "Girilen değerlerden biri kurallara uymuyor; tutarları ve seçimleri kontrol edin.";
  return hata.message;
}
