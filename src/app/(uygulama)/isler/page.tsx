import { YapimAsamasinda } from "@/components/YapimAsamasinda";

export default function IslerPage() {
  return (
    <YapimAsamasinda
      baslik="İşler ve Siparişler"
      aciklama="Siparişin alınmasından tahsilatına kadar her işin nerede olduğu"
      adim="Adım 5"
      gelecekler={[
        "İş panosu: Alındı → Üretimde → Hazır → Sevk edildi → Faturalandı → Tahsil edildi",
        "Sorumlu kişi ve Telegram bildirimi, geciken işler için uyarı",
      ]}
    />
  );
}
