type Json = Record<string, unknown> | null;

export const KAYIT_TURLERI: Record<string, { ad: string; yol?: (id: string) => string }> = {
  alis_faturalari: { ad: "Alış faturası", yol: (id) => `/alis/${id}` },
  satis_faturalari: { ad: "Satış", yol: (id) => `/satis/${id}` },
  iadeler: { ad: "İade", yol: (id) => `/iade/${id}` },
  evraklar: { ad: "Çek/senet", yol: (id) => `/cek-senet/${id}` },
  evrak_hareketleri: { ad: "Çek/senet işlemi", yol: () => "/cek-senet" },
  para_hareketleri: { ad: "Kasa/banka hareketi", yol: () => "/kasa" },
  uretim_partileri: { ad: "Üretim partisi", yol: (id) => `/uretim/${id}` },
  sayimlar: { ad: "Sayım", yol: (id) => `/stok/sayim/${id}` },
  cariler: { ad: "Cari kart", yol: (id) => `/cariler/${id}` },
  stok_kartlari: { ad: "Stok kartı", yol: (id) => `/stok/${id}` },
  kasa_banka_hesaplari: { ad: "Kasa/banka hesabı", yol: () => "/kasa" },
  receteler: { ad: "Reçete", yol: () => "/uretim/receteler" },
  recete_kalemleri: { ad: "Reçete kalemi", yol: () => "/uretim/receteler" },
  hesap_plani: { ad: "Hesap planı", yol: () => "/hesap-plani" },
  acilis_ayarlari: { ad: "Açılış ayarı", yol: () => "/acilis" },
  kdv_oranlari: { ad: "KDV oranı" },
  depolar: { ad: "Depo" },
  kapali_donemler: { ad: "Dönem kilidi" },
  kullanicilar: { ad: "Kişi ve yetki" },
  kullanici_sifre: { ad: "Şifre sıfırlama" },
  ayarlar: { ad: "Ayarlar" },
};

const ALAN_ADLARI: Record<string, string> = {
  unvan: "unvan", ad: "ad", telefon: "telefon", eposta: "e-posta", adres: "adres", vergi_no: "vergi no",
  vergi_dairesi: "vergi dairesi", iban: "IBAN", vade_gun: "vade (gün)", aktif: "aktif", birim: "birim",
  satis_fiyati: "liste fiyatı", min_stok: "asgari stok", kdv_orani: "KDV", notlar: "notlar", durum: "durum",
  iptal_nedeni: "iptal nedeni", uretilen_miktar: "paketlenen", bozuk_miktar: "bozuk", bozuk_neden: "fire nedeni",
  skt: "son kullanma", lot_no: "lot", sorumlu: "sorumlu", aciklama: "açıklama", tarih: "tarih", karsi_hesap: "karşı hesap",
};
const GIZLI_ALANLAR = new Set(["updated_at", "created_at", "fis_id", "iptal_fis_id", "malzeme_maliyeti", "birim_maliyet", "bitis"]);

/** Kayıt için okunabilir kısa ad: "SAT-12", "Fatura 4521 ", "Parti 7", cari ünvanı… */
export function kayitEtiketi(tablo: string, j: Json): string {
  if (!j) return "";
  if (j.teknik) return String(j.hedef ?? "");
  const v = (k: string) => (j[k] === null || j[k] === undefined ? null : String(j[k]));
  if (tablo === "satis_faturalari") return `SAT-${v("satis_no")}${v("belge_no") ? ` (${v("belge_no")})` : ""}`;
  if (tablo === "alis_faturalari") return `Fatura ${v("belge_no")}`;
  if (tablo === "uretim_partileri") return `Parti ${v("parti_no")}`;
  if (tablo === "sayimlar") return `Sayım ${v("sayim_no")}`;
  if (tablo === "iadeler") return `İADE-${v("iade_no")}`;
  if (tablo === "evraklar") return `${v("tur") === "cek" ? "Çek" : "Senet"} #${v("evrak_no")} · ${Number(v("tutar")).toLocaleString("tr-TR")} ₺`;
  if (tablo === "evrak_hareketleri") return v("islem") ?? "";
  if (tablo === "para_hareketleri") return [v("tur"), v("tutar") && `${Number(v("tutar")).toLocaleString("tr-TR")} ₺`, v("aciklama")].filter(Boolean).join(" · ");
  return v("unvan") ?? v("ad") ?? v("kod") ?? v("oran") ?? v("donem") ?? "";
}

export type Ozet = { fiil: string; ayrinti: string[] };

/** "ekledi" / "değiştirdi: unvan A → B" / "iptal etti (neden)" / "sildi" */
export function islemOzeti(islem: string, eski: Json, yeni: Json): Ozet {
  if (yeni?.teknik) return { fiil: String(yeni.fiil ?? "değiştirdi"), ayrinti: Array.isArray(yeni.ozet) ? yeni.ozet.map(String) : [] };
  if (islem === "INSERT") return { fiil: "ekledi", ayrinti: [] };
  if (islem === "DELETE") return { fiil: "sildi", ayrinti: [] };
  if (yeni?.durum === "iptal" && eski?.durum !== "iptal") {
    return { fiil: "iptal etti", ayrinti: yeni.iptal_nedeni ? [`Neden: ${String(yeni.iptal_nedeni)}`] : [] };
  }
  if (yeni?.durum === "tamamlandi" && eski?.durum === "acik") return { fiil: "tamamladı", ayrinti: [] };
  const ayrinti: string[] = [];
  for (const k of Object.keys(yeni ?? {})) {
    if (GIZLI_ALANLAR.has(k)) continue;
    const a = eski?.[k] ?? null;
    const b = yeni?.[k] ?? null;
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    const yaz = (x: unknown) => (x === null || x === "" ? "—" : x === true ? "evet" : x === false ? "hayır" : String(x));
    ayrinti.push(`${ALAN_ADLARI[k] ?? k}: ${yaz(a)} → ${yaz(b)}`);
  }
  return { fiil: "değiştirdi", ayrinti };
}
