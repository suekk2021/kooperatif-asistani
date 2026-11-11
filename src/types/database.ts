export type KullaniciRolu = "baskan" | "operasyon" | "on_muhasebe" | "depo" | "muhasebeci" | "izleyici" | "destek";
// Eski fiş okuma (src/lib/fis.ts) hâlâ kullanıyor; Alış ekranında kalem bazlı okumaya geçince kalkacak.
export type IslemTuru = "gelir" | "gider";
export type OcrSaglayici = "gemini" | "openai";

export type Ayarlar = {
  id: true;
  ocr_saglayici: OcrSaglayici;
  gemini_api_key: string | null;
  openai_api_key: string | null;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  muhasebeci_email: string | null;
  kurum_adi: string;
  logo_url: string | null;
  asistan_promptu: string | null;
  updated_at: string;
};

export type KurumKimligi = {
  kurum_adi: string;
  logo_url: string | null;
};

export type Profil = {
  id: string;
  ad_soyad: string;
  rol: KullaniciRolu;
  telegram_chat_id?: string | null;
  gorev?: string | null;
  created_at: string;
};

// ===== İMECE çekirdeği (supabase/migrations/20261109120000_imece_cekirdek.sql) =====

export type Hesap = {
  kod: string;
  ad: string;
  ust_kod: string | null;
  aciklama: string | null;
  aktif: boolean;
  sistem: boolean;
  created_at: string;
};

export type HesapBakiyesi = {
  kod: string;
  borc: number;
  alacak: number;
  bakiye: number;
};

export type CariTuru = "musteri" | "tedarikci";

export type Cari = {
  id: string;
  tur: CariTuru;
  kod: string;
  unvan: string;
  vergi_no: string | null;
  vergi_dairesi: string | null;
  telefon: string | null;
  eposta: string | null;
  adres: string | null;
  iban: string | null;
  vade_gun: number;
  notlar: string | null;
  aktif: boolean;
  olusturan: string | null;
  created_at: string;
  updated_at: string;
};

export type StokTuru = "hammadde" | "ambalaj" | "yari_mamul" | "mamul" | "ticari_mal";
export type StokBirimi = "kg" | "g" | "lt" | "adet" | "paket" | "koli";

export type StokKarti = {
  id: string;
  tur: StokTuru;
  kod: string;
  ad: string;
  birim: StokBirimi;
  depo_id: number | null;
  kdv_orani: number;
  min_stok: number | null;
  satis_fiyati: number | null;
  notlar: string | null;
  aktif: boolean;
  birlestirildigi_kart: string | null;
  olusturan: string | null;
  created_at: string;
  updated_at: string;
};

export type Depo = { id: number; ad: string; aciklama: string | null; aktif: boolean };
export type KdvOrani = { oran: number; indirilecek_kod: string | null; hesaplanan_kod: string | null; aktif: boolean };

export type Hatirlatici = {
  id: string;
  baslik: string;
  hatirlatma_tarihi: string;
  tamamlandi: boolean;
  telegram_gonderildi: boolean;
  olusturan: string | null;
  telegram_gonderen?: string | null;
  hedef_kullanici_id?: string | null;
  hedef_kullanici_idler?: string[];
  kaynak_chat_id?: string | null;
  created_at: string;
};

export type Not = {
  id: string;
  icerik: string;
  kaynak: "telegram" | "web";
  olusturan: string | null;
  telegram_gonderen?: string | null;
  hedef_kullanici_id?: string | null;
  hedef_kullanici_idler?: string[];
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiller: { Row: Profil; Insert: Partial<Profil>; Update: Partial<Profil> };
      hatirlaticilar: {
        Row: Hatirlatici;
        Insert: Omit<Hatirlatici, "id" | "created_at" | "telegram_gonderildi">;
        Update: Partial<Omit<Hatirlatici, "id" | "created_at">>;
      };
    };
  };
};

// ===== Adım 2 (supabase/migrations/20261110100000_kasa_alis_stok.sql) =====

export type ParaHesabiTuru = "kasa" | "banka" | "pos" | "kredi_karti";

export type KasaBankaHesabi = {
  id: string;
  tur: ParaHesabiTuru;
  kod: string;
  ad: string;
  banka_adi: string | null;
  iban: string | null;
  bagli_banka_id: string | null;
  komisyon_orani: number | null;
  aktif: boolean;
  created_at: string;
};

export type StokDurumu = {
  stok_karti_id: string;
  miktar: number;
  deger: number;
  ortalama_maliyet: number;
};

export type BelgeDurumu = "kayitli" | "iptal";

export type AlisFaturasi = {
  id: string;
  cari_id: string;
  belge_no: string;
  tarih: string;
  vade_tarihi: string | null;
  aciklama: string | null;
  ara_toplam: number;
  kdv_toplam: number;
  genel_toplam: number;
  odeme_hesap_id: string | null;
  durum: BelgeDurumu;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
  olusturan: string | null;
  created_at: string;
  genel_iskonto_orani: number;
  iskonto_toplam: number;
};

export type AlisKalemi = {
  id: number;
  fatura_id: string;
  sira: number;
  stok_karti_id: string | null;
  hesap_kodu: string | null;
  aciklama: string | null;
  miktar: number;
  birim_fiyat: number;
  kdv_orani: number;
  tutar: number;
  kdv_tutari: number;
  iskonto_orani: number;
  iskonto_tutari: number;
};

export type ParaHareketiTuru = "tahsilat" | "odeme" | "virman";

export type ParaHareketi = {
  id: string;
  tarih: string;
  tur: ParaHareketiTuru;
  hesap_id: string;
  karsi_hesap_id: string | null;
  cari_id: string | null;
  tutar: number;
  komisyon: number;
  aciklama: string | null;
  belge_no: string | null;
  alis_fatura_id: string | null;
  satis_fatura_id: string | null;
  durum: BelgeDurumu;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
  olusturan: string | null;
  created_at: string;
};

export type YevmiyeSatiri = {
  id: number;
  fis_id: string;
  sira: number;
  hesap_kodu: string;
  borc: number;
  alacak: number;
  aciklama: string | null;
};

// ===== Adım 3 (supabase/migrations/20261110120000_satis.sql) =====

export type SatisFaturasi = {
  id: string;
  satis_no: number;
  cari_id: string;
  belge_no: string | null;
  tarih: string;
  vade_tarihi: string | null;
  aciklama: string | null;
  ara_toplam: number;
  kdv_toplam: number;
  genel_toplam: number;
  maliyet_toplam: number;
  odeme_hesap_id: string | null;
  durum: BelgeDurumu;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
  olusturan: string | null;
  created_at: string;
  genel_iskonto_orani: number;
  iskonto_toplam: number;
};

export type SatisKalemi = {
  id: number;
  fatura_id: string;
  sira: number;
  stok_karti_id: string;
  lot_no: string | null;
  miktar: number;
  birim_fiyat: number;
  kdv_orani: number;
  tutar: number;
  kdv_tutari: number;
  birim_maliyet: number;
  maliyet_tutari: number;
  maliyet_tahmini: boolean;
  iskonto_orani: number;
  iskonto_tutari: number;
};

// ===== Adım 4 (supabase/migrations/20261110140000_uretim.sql) =====

export type Recete = {
  id: string;
  urun_karti_id: string;
  cikti_miktari: number;
  aciklama: string | null;
  updated_at: string;
};

export type ReceteKalemi = {
  id: number;
  recete_id: string;
  stok_karti_id: string;
  miktar: number;
};

export type PartiDurumu = "acik" | "tamamlandi" | "iptal";

export type UretimPartisi = {
  id: string;
  parti_no: number;
  urun_karti_id: string;
  tarih: string;
  sorumlu: string | null;
  baslangic: string;
  bitis: string | null;
  lot_no: string | null;
  skt: string | null;
  durum: PartiDurumu;
  uretilen_miktar: number | null;
  bozuk_miktar: number;
  bozuk_neden: string | null;
  malzeme_maliyeti: number | null;
  birim_maliyet: number | null;
  aciklama: string | null;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
  olusturan: string | null;
  created_at: string;
};

export type PartiGirdisi = {
  id: number;
  parti_id: string;
  stok_karti_id: string;
  miktar: number;
  birim_maliyet: number | null;
  maliyet: number | null;
  maliyet_tahmini: boolean;
  created_at: string;
};

// ===== İade (supabase/migrations/20261111120000_iade_iskonto.sql) =====

export type Iade = {
  id: string;
  iade_no: number;
  tur: "satis" | "alis";
  satis_fatura_id: string | null;
  alis_fatura_id: string | null;
  cari_id: string;
  tarih: string;
  belge_no: string | null;
  aciklama: string | null;
  ara_toplam: number;
  kdv_toplam: number;
  genel_toplam: number;
  maliyet_toplam: number;
  odeme_hesap_id: string | null;
  durum: BelgeDurumu;
  iptal_nedeni: string | null;
  fis_id: string | null;
  iptal_fis_id: string | null;
  olusturan: string | null;
  created_at: string;
};

export type IadeKalemi = {
  id: number;
  iade_id: string;
  sira: number;
  satis_kalem_id: number | null;
  alis_kalem_id: number | null;
  stok_karti_id: string;
  lot_no: string | null;
  miktar: number;
  birim_fiyat: number;
  kdv_orani: number;
  tutar: number;
  kdv_tutari: number;
  stoga_alindi: boolean;
  birim_maliyet: number;
  maliyet_tutari: number;
};
