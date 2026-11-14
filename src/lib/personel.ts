import type { GunTuru, PersonelDurumu, PersonelUcreti, UcretTipi } from "@/types/database";

export const MAAS_YETKI_NOTU =
  "Bu bölüm yalnız Başkan, Operasyon yöneticisi, ön muhasebe ve bilgi işlem içindir. Personel ücretleri kişisel veridir (KVKK); başkalarıyla paylaşmayın.";

export const DURUM_ADI: Record<PersonelDurumu, string> = {
  giris_bekliyor: "Girişi bekliyor",
  calisiyor: "Çalışıyor",
  ayrildi: "Ayrıldı",
};

export const UCRET_TIPI_ADI: Record<UcretTipi, string> = { gunluk: "Günlük", saatlik: "Saatlik" };

export const GUN_TURU_ADI: Record<GunTuru, string> = {
  calisti: "Çalıştı",
  eksik: "Eksik gün",
  izinli: "İzinli",
  raporlu: "Raporlu",
  resmi_tatil: "Resmi tatil",
  hafta_tatili: "Hafta tatili",
};

export const GUN_TURLERI = Object.keys(GUN_TURU_ADI) as GunTuru[];

/** Tarihte geçerli ücret: başlangıcı o tarihe kadar olan en son satır (veritabanındaki maas_ay_ozeti ile aynı kural). */
export function gecerliUcret(ucretler: PersonelUcreti[], tarih: string): PersonelUcreti | undefined {
  return ucretler
    .filter((u) => u.baslangic <= tarih)
    .sort((a, b) => (a.baslangic < b.baslangic ? 1 : -1))[0];
}

/** "2026-06" -> ayın günleri ["2026-06-01", …]. */
export function ayinGunleri(ay: string): string[] {
  const [y, a] = ay.split("-").map(Number);
  const son = new Date(Date.UTC(y, a, 0)).getUTCDate();
  return Array.from({ length: son }, (_, i) => `${ay}-${String(i + 1).padStart(2, "0")}`);
}

const GUN_ADLARI = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export function gunAdi(tarih: string): string {
  return GUN_ADLARI[new Date(`${tarih}T12:00:00Z`).getUTCDay()];
}
export function pazarMi(tarih: string): boolean {
  return new Date(`${tarih}T12:00:00Z`).getUTCDay() === 0;
}

/** Ay seçicinin ‹ › düğmeleri için. */
export function ayKaydir(ay: string, fark: number): string {
  const [y, a] = ay.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1 + fark, 1));
  return d.toISOString().slice(0, 7);
}
