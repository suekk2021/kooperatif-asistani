import { YapimAsamasinda } from "@/components/YapimAsamasinda";

export default function AktarimPage() {
  return (
    <YapimAsamasinda
      baslik="Muhasebe Aktarımı"
      aciklama="Seçilen dönemin bütün kayıtları, hesap kodlu fişler halinde Excel"
      adim="Adım 5 · Mikro şablonu bekleniyor"
      gelecekler={[
        "Dönem seç → kontrol: her fişte borç = alacak, kodu eksik satır yok",
        "Genel Excel çıktısı (hesap kodu sütunlarıyla); Mikro'ya özel şablon muhasebeciden gelince",
        "Dönemi kapat ve kilitle — kapatılan aya geriye dönük kayıt girilemez (veritabanında hazır)",
      ]}
    />
  );
}
