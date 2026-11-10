import type { KullaniciRolu } from "@/types/database";
import type { IkonAdi } from "./Ikonlar";

// kimler: menüde kimlerin göreceği (boşsa herkes). Bu sadece sadelik içindir, güvenlik değil:
// yetkiyi veritabanı kuralları uygular; adresi bilen herkes sayfayı açabilir, yazamıyorsa yazamaz.
export type MenuOgesi = { yol: string; ad: string; ikon: IkonAdi; yakinda?: boolean; kimler?: KullaniciRolu[] };

const KAYIT_GIRENLER: KullaniciRolu[] = ["operasyon", "destek", "on_muhasebe"];
const IZLEYENLER: KullaniciRolu[] = ["muhasebeci", "izleyici"];

export const MENU: { grup: string; ogeler: MenuOgesi[] }[] = [
  {
    grup: "Genel",
    ogeler: [
      { yol: "/panel", ad: "Ana Panel", ikon: "panel" },
      { yol: "/isler", ad: "İşler ve Siparişler", ikon: "isler", yakinda: true },
      { yol: "/asistan", ad: "Asistan", ikon: "asistan", yakinda: true },
      { yol: "/hatirlaticilar", ad: "Hatırlatıcılar", ikon: "hatirlatici" },
      { yol: "/notlar", ad: "Notlar", ikon: "notlar" },
      { yol: "/yardim", ad: "Kılavuz", ikon: "yardim" },
    ],
  },
  {
    grup: "Operasyon",
    ogeler: [
      { yol: "/alis", ad: "Alış", ikon: "alis", kimler: [...KAYIT_GIRENLER, "depo", ...IZLEYENLER] },
      { yol: "/uretim", ad: "Üretim", ikon: "uretim", kimler: [...KAYIT_GIRENLER, "depo"] },
      { yol: "/satis", ad: "Satış", ikon: "satis", kimler: [...KAYIT_GIRENLER, ...IZLEYENLER] },
      { yol: "/stok", ad: "Stok", ikon: "stok", kimler: [...KAYIT_GIRENLER, "depo", ...IZLEYENLER] },
    ],
  },
  {
    grup: "Finans",
    ogeler: [
      { yol: "/kasa", ad: "Kasa ve Banka", ikon: "kasa", kimler: [...KAYIT_GIRENLER, ...IZLEYENLER] },
      { yol: "/cariler", ad: "Cariler", ikon: "cari", kimler: [...KAYIT_GIRENLER, ...IZLEYENLER] },
      { yol: "/cek-senet", ad: "Çek / Senet", ikon: "aktarim", kimler: [...KAYIT_GIRENLER, ...IZLEYENLER] },
    ],
  },
  {
    grup: "Muhasebe",
    ogeler: [
      { yol: "/raporlar", ad: "Raporlar", ikon: "rapor", kimler: [...KAYIT_GIRENLER, ...IZLEYENLER] },
      { yol: "/hesap-plani", ad: "Hesap Planı", ikon: "hesap", kimler: [...KAYIT_GIRENLER, "muhasebeci"] },
      { yol: "/aktarim", ad: "Muhasebe Aktarımı", ikon: "aktarim", yakinda: true },
      { yol: "/islem-gecmisi", ad: "İşlem Geçmişi", ikon: "gecmis", kimler: ["baskan", "operasyon", "destek", "muhasebeci"] },
    ],
  },
];

export function gorurMu(o: MenuOgesi, rol: KullaniciRolu | null) {
  return !o.yakinda && (!o.kimler || (rol !== null && o.kimler.includes(rol)));
}

export type HizliIslem = { yol: string; ad: string; ikon: IkonAdi; renk: "mavi" | "yesil" | "amber" | "mercan" | "lacivert" };
export type Sekme = { yol: string; ad: string; ikon: IkonAdi } | "arti" | "menu";

/** Telefondaki alt çubuk ve ＋ paneli — role göre. */
export function mobilDuzen(rol: KullaniciRolu | null, yazar: boolean): { sekmeler: Sekme[]; hizli: HizliIslem[] } {
  const ana = { yol: "/panel", ad: "Ana sayfa", ikon: "panel" as const };
  if (rol === "depo") {
    return {
      sekmeler: [ana, { yol: "/uretim", ad: "Üretim", ikon: "uretim" }, "arti", { yol: "/stok", ad: "Stok", ikon: "stok" }, "menu"],
      hizli: [
        { yol: "/uretim", ad: "Üretim başlat", ikon: "uretim", renk: "lacivert" },
        { yol: "/alis/yeni", ad: "Mal girişi", ikon: "alis", renk: "amber" },
        { yol: "/stok/sayim", ad: "Sayım", ikon: "sayim", renk: "lacivert" },
      ],
    };
  }
  if (yazar) {
    return {
      sekmeler: [ana, { yol: "/satis", ad: "Satış", ikon: "satis" }, "arti", { yol: "/kasa", ad: "Kasa", ikon: "kasa" }, "menu"],
      hizli: [
        { yol: "/satis/yeni", ad: "Satış", ikon: "satis", renk: "mavi" },
        { yol: "/kasa?islem=tahsilat", ad: "Tahsilat", ikon: "tahsilat", renk: "yesil" },
        { yol: "/alis/yeni", ad: "Alış", ikon: "alis", renk: "amber" },
        { yol: "/kasa?islem=odeme", ad: "Ödeme", ikon: "odeme", renk: "mercan" },
        { yol: "/uretim", ad: "Üretim", ikon: "uretim", renk: "lacivert" },
        { yol: "/stok/sayim", ad: "Sayım", ikon: "sayim", renk: "lacivert" },
        { yol: "/kasa?islem=virman", ad: "Virman", ikon: "virman", renk: "mavi" },
        { yol: "/cek-senet", ad: "Çek / Senet", ikon: "aktarim", renk: "amber" },
      ],
    };
  }
  if (rol === "muhasebeci" || rol === "izleyici") {
    return {
      sekmeler: [
        ana,
        { yol: "/raporlar", ad: "Raporlar", ikon: "rapor" },
        { yol: "/satis", ad: "Satış", ikon: "satis" },
        { yol: "/kasa", ad: "Kasa", ikon: "kasa" },
        "menu",
      ],
      hizli: [],
    };
  }
  return { sekmeler: [ana, { yol: "/hatirlaticilar", ad: "Hatırlatıcı", ikon: "hatirlatici" }, "menu"], hizli: [] };
}
