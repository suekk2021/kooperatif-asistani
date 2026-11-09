import { YapimAsamasinda } from "@/components/YapimAsamasinda";

export default function RaporlarPage() {
  return (
    <YapimAsamasinda
      baslik="Raporlar"
      aciklama="Fire ve kaçak, maliyet, mizan, cari ve stok raporları — hepsi Excel"
      adim="Adım 5"
      gelecekler={[
        "Fire ve kaçak raporu (ürün ve ay bazında)",
        "Üretim verimi, birim maliyet ve kârlılık",
        "Mizan (hesap kodlu), cari ekstre, alacak yaşlandırma, KDV özeti",
        "Stok durum ve hareket raporu",
      ]}
    />
  );
}
