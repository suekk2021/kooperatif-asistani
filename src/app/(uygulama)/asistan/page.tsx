import { YapimAsamasinda } from "@/components/YapimAsamasinda";

export default function AsistanPage() {
  return (
    <YapimAsamasinda
      baslik="Asistan"
      aciklama="Telegram'dan yazarak, sesle veya fotoğrafla kayıt girme"
      adim="Adım 5"
      gelecekler={[
        "Telegram konuşmalarının web'den görünmesi",
        "Fatura fotoğrafı → alış taslağı (web'den onaylanır)",
        "\"özet\" → kasa, alacak, borç, bu ayın firesi; stok/SKT/vade uyarıları",
        "Şu an çalışan: hatırlatıcı ve not kaydı",
      ]}
    />
  );
}
