export type KullaniciRolu = "baskan" | "on_muhasebe" | "izleyici";
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
  created_at: string;
};

export type Islem = {
  id: string;
  tur: IslemTuru;
  tutar: number;
  tarih: string;
  aciklama: string;
  kategori: string | null;
  fis_gorsel_url: string | null;
  ocr_ham_metin: string | null;
  olusturan: string | null;
  telegram_gonderen?: string | null;
  odendi?: boolean;
  dekont_url?: string | null;
  musteri_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type Musteri = {
  id: string;
  ad_soyad: string;
  telefon: string | null;
  adres: string | null;
  notlar: string | null;
  olusturan: string | null;
  created_at: string;
  updated_at: string;
};

export type Hatirlatici = {
  id: string;
  baslik: string;
  hatirlatma_tarihi: string;
  tamamlandi: boolean;
  telegram_gonderildi: boolean;
  olusturan: string | null;
  telegram_gonderen?: string | null;
  created_at: string;
};

export type Not = {
  id: string;
  icerik: string;
  kaynak: "telegram" | "web";
  olusturan: string | null;
  telegram_gonderen?: string | null;
  hedef_kullanici_id?: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiller: { Row: Profil; Insert: Partial<Profil>; Update: Partial<Profil> };
      islemler: {
        Row: Islem;
        Insert: Omit<Islem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Islem, "id" | "created_at" | "updated_at">>;
      };
      hatirlaticilar: {
        Row: Hatirlatici;
        Insert: Omit<Hatirlatici, "id" | "created_at" | "telegram_gonderildi">;
        Update: Partial<Omit<Hatirlatici, "id" | "created_at">>;
      };
    };
  };
};
