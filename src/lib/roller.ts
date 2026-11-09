import type { KullaniciRolu } from "@/types/database";

// Veritabanındaki yetki fonksiyonlarıyla aynı kural (supabase/migrations/20261110160000_roller.sql):
// yazar = yazabilir(), yonetici = yonetici_mi(). Biri değişirse diğeri de değişmeli.
export const ROLLER: {
  deger: KullaniciRolu;
  ad: string;
  aciklama: string;
  yazar: boolean;
  yonetici: boolean;
}[] = [
  { deger: "baskan", ad: "Başkan", aciklama: "Her şeyi görür ve girer; kişi ekler, rol verir.", yazar: true, yonetici: true },
  {
    deger: "operasyon",
    ad: "Operasyon yöneticisi",
    aciklama: "Üretim ve finans takibi; her şeyi görür ve girer; kişi ekler.",
    yazar: true,
    yonetici: true,
  },
  { deger: "on_muhasebe", ad: "Ön muhasebe", aciklama: "Alış, satış, kasa, cari, stok ve üretim kaydı girer.", yazar: true, yonetici: false },
  { deger: "depo", ad: "Depo / üretim görevlisi", aciklama: "Mal girişi, üretim partisi ve stok kaydı girer.", yazar: true, yonetici: false },
  {
    deger: "muhasebeci",
    ad: "Muhasebeci",
    aciklama: "Her şeyi görür, rapor ve aktarım dosyası alır; kayıt giremez.",
    yazar: false,
    yonetici: false,
  },
  { deger: "izleyici", ad: "İzleyici", aciklama: "Sadece görür.", yazar: false, yonetici: false },
  {
    deger: "destek",
    ad: "Teknik destek",
    aciklama:
      "Programın geliştiricisi. Hataları görüp düzeltmek için her şeye erişir; kişi listelerinde, @ çağırmada ve bildirimlerde yer almaz. Yaptığı her değişiklik kayda geçer; yöneticiler bu hesabı silebilir.",
    yazar: true,
    yonetici: true,
  },
];

/** Operasyonda kişi olarak seçilmeyen roller (görev atama, @ çağırma, bildirim listeleri). */
export const OPERASYON_DISI_ROLLER: KullaniciRolu[] = ["destek"];

/** Bu rolleri sadece aynı roldeki kişi verebilir (başkanı başkan, teknik desteği teknik destek). */
export const KORUNAN_ROLLER: KullaniciRolu[] = ["baskan", "destek"];

export function rolBilgisi(rol: KullaniciRolu | null | undefined) {
  return ROLLER.find((r) => r.deger === rol);
}

export function rolAdi(rol: KullaniciRolu | null | undefined): string {
  return rolBilgisi(rol)?.ad ?? "";
}
