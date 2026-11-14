"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji, metin, ondalik } from "@/lib/imece";
import { GUN_TURLERI } from "@/lib/personel";
import type { GunTuru, PersonelDurumu, UcretTipi } from "@/types/database";
import type { FormSonucu } from "./cariler";

// Yetkiyi veritabanı uygular (maas_gorur); buradaki kontroller yalnız anlaşılır hata mesajı içindir.

const DURUMLAR: PersonelDurumu[] = ["giris_bekliyor", "calisiyor", "ayrildi"];
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

function tarih(formData: FormData, ad: string): string | null {
  const t = metin(formData, ad);
  return t && TARIH.test(t) ? t : null;
}

export async function personelEkle(formData: FormData): Promise<FormSonucu & { id?: string }> {
  const ad = metin(formData, "ad_soyad");
  const durum = (metin(formData, "durum") ?? "calisiyor") as PersonelDurumu;
  const baslama = tarih(formData, "ise_baslama");
  const ucretTipi = metin(formData, "ucret_tipi") as UcretTipi | null;
  const ucret = ondalik(formData, "ucret");
  const yol = ondalik(formData, "yol");
  if (!ad) return { hata: "Ad soyad zorunlu." };
  if (!DURUMLAR.includes(durum)) return { hata: "Durum seçilmedi." };
  if (ucret !== null && (ucret < 0 || (ucretTipi !== "gunluk" && ucretTipi !== "saatlik"))) {
    return { hata: "Ücret tipi (günlük/saatlik) seçilmeli ve ücret 0'dan küçük olmamalı." };
  }
  if (ucret !== null && !baslama) return { hata: "Ücret girildiyse işe başlama tarihi de girilmeli (ücret o tarihten geçerli olur)." };
  if (yol !== null && (yol < 0 || !baslama)) return { hata: "Yol parası için işe başlama tarihi girilmeli." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("personeller")
    .insert({ ad_soyad: ad, durum, ise_baslama: baslama })
    .select("id")
    .single();
  if (error || !data) return { hata: hataMesaji(error ?? { message: "Kaydedilemedi." }, "Bu personel zaten var.") };

  if (ucret !== null && baslama) {
    const { error: e } = await supabase
      .from("personel_ucretleri")
      .insert({ personel_id: data.id, baslangic: baslama, ucret_tipi: ucretTipi, tutar: ucret });
    if (e) return { hata: `Personel eklendi ama ücret kaydedilemedi: ${hataMesaji(e, "")}. Kartından ekleyin.`, id: data.id };
  }
  if (yol !== null && yol > 0 && baslama) {
    const { error: e } = await supabase
      .from("personel_ek_odemeleri")
      .insert({ personel_id: data.id, ad: "Yol parası", birim: "gunluk", tutar: yol, baslangic: baslama });
    if (e) return { hata: `Personel eklendi ama yol parası kaydedilemedi: ${hataMesaji(e, "")}. Kartından ekleyin.`, id: data.id };
  }

  revalidatePath("/personel", "layout");
  return { basarili: `${ad} eklendi.`, id: data.id };
}

export async function personelGuncelle(id: string, formData: FormData): Promise<FormSonucu> {
  const ad = metin(formData, "ad_soyad");
  const durum = metin(formData, "durum") as PersonelDurumu | null;
  const baslama = tarih(formData, "ise_baslama");
  const ayrilis = tarih(formData, "ayrilis");
  if (!ad) return { hata: "Ad soyad zorunlu." };
  if (!durum || !DURUMLAR.includes(durum)) return { hata: "Durum seçilmedi." };
  if (durum === "ayrildi" && !ayrilis) return { hata: "Ayrıldı seçildiyse ayrılış tarihi girilmeli." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personeller")
    .update({ ad_soyad: ad, durum, ise_baslama: baslama, ayrilis: durum === "ayrildi" ? ayrilis : null, notlar: metin(formData, "notlar") })
    .eq("id", id);
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath("/personel", "layout");
  return { basarili: "Kaydedildi." };
}

export async function ucretEkle(personelId: string, formData: FormData): Promise<FormSonucu> {
  const baslangic = tarih(formData, "baslangic");
  const tip = metin(formData, "ucret_tipi") as UcretTipi | null;
  const tutar = ondalik(formData, "tutar");
  if (!baslangic) return { hata: "Geçerlilik tarihi zorunlu." };
  if (tip !== "gunluk" && tip !== "saatlik") return { hata: "Ücret tipi seçilmedi." };
  if (tutar === null || tutar < 0) return { hata: "Ücret tutarı girilmeli." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personel_ucretleri")
    .insert({ personel_id: personelId, baslangic, ucret_tipi: tip, tutar, aciklama: metin(formData, "aciklama") });
  if (error) return { hata: hataMesaji(error, "Bu tarihten geçerli bir ücret zaten var; tarihi değiştirin.") };
  revalidatePath("/personel", "layout");
  return { basarili: "Ücret eklendi." };
}

export async function ekOdemeEkle(personelId: string, formData: FormData): Promise<FormSonucu> {
  const ad = metin(formData, "ad");
  const birim = metin(formData, "birim");
  const tutar = ondalik(formData, "tutar");
  const baslangic = tarih(formData, "baslangic");
  if (!ad) return { hata: "Ödemenin adı zorunlu (örn. Yol parası)." };
  if (birim !== "gunluk" && birim !== "aylik") return { hata: "Günlük mü aylık mı seçilmeli." };
  if (tutar === null || tutar < 0) return { hata: "Tutar girilmeli." };
  if (!baslangic) return { hata: "Başlangıç tarihi zorunlu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("personel_ek_odemeleri")
    .insert({ personel_id: personelId, ad, birim, tutar, baslangic, bitis: tarih(formData, "bitis") });
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath("/personel", "layout");
  return { basarili: `${ad} eklendi.` };
}

/** Ek ödeme silinmez; bitiş tarihi verilir (geçmiş aylar etkilenmesin). */
export async function ekOdemeBitir(id: string, formData: FormData): Promise<FormSonucu> {
  const bitis = tarih(formData, "bitis");
  if (!bitis) return { hata: "Bitiş tarihi seçin." };
  const supabase = await createClient();
  const { error } = await supabase.from("personel_ek_odemeleri").update({ bitis }).eq("id", id);
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath("/personel", "layout");
  return { basarili: "Bitiş tarihi kaydedildi." };
}

export type PuantajSatiri = { tarih: string; gun_turu: GunTuru; miktar: number; elle_tutar: number | null; aciklama: string | null };

/** Yalnız değişen günler gelir. Gün silinmez: boşaltılan gün 0 olarak kalır (değişiklik kaydında görünsün diye). */
export async function puantajKaydet(personelId: string, ay: string, satirlar: PuantajSatiri[]): Promise<FormSonucu> {
  if (!/^\d{4}-\d{2}$/.test(ay)) return { hata: "Ay geçersiz." };
  for (const s of satirlar) {
    if (!s.tarih.startsWith(ay + "-") || !TARIH.test(s.tarih)) return { hata: "Ay dışında bir gün gönderildi." };
    if (!GUN_TURLERI.includes(s.gun_turu)) return { hata: `${s.tarih}: gün türü geçersiz.` };
    if (!Number.isFinite(s.miktar) || s.miktar < 0 || s.miktar > 24) return { hata: `${s.tarih}: gün/saat 0 ile 24 arasında olmalı.` };
    if (s.elle_tutar !== null && (!Number.isFinite(s.elle_tutar) || s.elle_tutar < 0)) return { hata: `${s.tarih}: elle tutar geçersiz.` };
  }
  if (satirlar.length === 0) return { basarili: "Değişiklik yok." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("puantaj")
    .upsert(satirlar.map((s) => ({ ...s, personel_id: personelId })), { onConflict: "personel_id,tarih" });
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath("/personel", "layout");
  return { basarili: `${satirlar.length} gün kaydedildi.` };
}

export async function aySonuKaydet(personelId: string, ay: string, formData: FormData): Promise<FormSonucu> {
  if (!/^\d{4}-\d{2}$/.test(ay)) return { hata: "Ay geçersiz." };
  const duzeltme = ondalik(formData, "duzeltme") ?? 0;
  const aciklama = metin(formData, "duzeltme_aciklama");
  if (duzeltme !== 0 && !aciklama) return { hata: "Düzeltme tutarı varsa açıklaması da yazılmalı (örn. Avans)." };

  const supabase = await createClient();
  const { error } = await supabase.from("maas_aylik").upsert(
    {
      personel_id: personelId,
      donem: `${ay}-01`,
      duzeltme,
      duzeltme_aciklama: aciklama,
      odendi_tarihi: tarih(formData, "odendi_tarihi"),
    },
    { onConflict: "personel_id,donem" }
  );
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath("/personel", "layout");
  return { basarili: "Kaydedildi." };
}
