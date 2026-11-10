export const EVRAK_DURUM: Record<string, { ad: string; renk: string }> = {
  portfoyde: { ad: "Portföyde", renk: "e-mavi" },
  tahsil: { ad: "Tahsil edildi", renk: "e-yesil" },
  ciro: { ad: "Ciro edildi", renk: "e-gri" },
  karsiliksiz: { ad: "Karşılıksız", renk: "e-kirmizi" },
  odenmedi: { ad: "Ödenecek", renk: "e-amber" },
  odendi: { ad: "Ödendi", renk: "e-yesil" },
  iptal: { ad: "İptal", renk: "e-kirmizi" },
};

export const EVRAK_ISLEM_ADI: Record<string, string> = {
  giris: "Kayda alındı",
  tahsil: "Tahsil edildi",
  ciro: "Ciro edildi",
  karsiliksiz: "Karşılıksız",
  odeme: "Ödendi",
};

export const evrakAdi = (tur: string) => (tur === "cek" ? "Çek" : "Senet");

/** Vadesi geçmiş ya da bu kadar gün içinde dolacak açık evrak uyarı verir. */
export const VADE_UYARI_GUN = 7;
