"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CARI_TURU_ADI, hataMesaji, metin, ondalik } from "@/lib/imece";
import type { CariTuru } from "@/types/database";

export type FormSonucu = { hata?: string; basarili?: string };

export async function cariEkle(formData: FormData): Promise<FormSonucu> {
  const tur = metin(formData, "tur") as CariTuru | null;
  const unvan = metin(formData, "unvan");
  if (tur !== "musteri" && tur !== "tedarikci") return { hata: "Cari türü seçilmedi." };
  if (!unvan) return { hata: "Ünvan / ad zorunlu." };

  const vadeGun = ondalik(formData, "vade_gun");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cariler")
    .insert({
      tur,
      unvan,
      vergi_no: metin(formData, "vergi_no"),
      vergi_dairesi: metin(formData, "vergi_dairesi"),
      telefon: metin(formData, "telefon"),
      eposta: metin(formData, "eposta"),
      adres: metin(formData, "adres"),
      iban: metin(formData, "iban"),
      vade_gun: vadeGun !== null && vadeGun >= 0 ? Math.round(vadeGun) : 0,
      notlar: metin(formData, "notlar"),
    })
    .select("kod")
    .single();

  if (error) {
    return { hata: hataMesaji(error, `"${unvan}" adında bir ${CARI_TURU_ADI[tur].tekil.toLocaleLowerCase("tr-TR")} zaten var.`) };
  }

  revalidatePath("/cariler");
  revalidatePath("/panel");
  return { basarili: `${unvan} eklendi (kod ${data.kod}).` };
}

// Kod ve tür değiştirilemez (veritabanı da engeller). Bakiyesi sıfır olmayan cari pasife
// alınamaz: içinde alacak/borç duran hesap listeden kaybolursa defter ile ekran tutmaz.
export async function cariGuncelle(id: string, formData: FormData): Promise<FormSonucu> {
  const unvan = metin(formData, "unvan");
  if (!unvan) return { hata: "Ünvan / ad zorunlu." };
  const aktif = formData.get("aktif") === "on";
  const vadeGun = ondalik(formData, "vade_gun");

  const supabase = await createClient();
  const { data: cari } = await supabase.from("cariler").select("kod, tur").eq("id", id).single();
  if (!cari) return { hata: "Cari bulunamadı." };

  if (!aktif) {
    const { data: b } = await supabase.from("hesap_bakiyeleri").select("bakiye").eq("kod", cari.kod).single();
    if (b && Math.abs(Number(b.bakiye)) >= 0.01) {
      return { hata: `Bakiyesi sıfır olmayan cari pasife alınamaz (bakiye ${Number(b.bakiye).toLocaleString("tr-TR")} ₺). Önce hesabı kapatın.` };
    }
  }

  const { error } = await supabase
    .from("cariler")
    .update({
      unvan,
      vergi_no: metin(formData, "vergi_no"),
      vergi_dairesi: metin(formData, "vergi_dairesi"),
      telefon: metin(formData, "telefon"),
      eposta: metin(formData, "eposta"),
      adres: metin(formData, "adres"),
      iban: metin(formData, "iban"),
      vade_gun: vadeGun !== null && vadeGun >= 0 ? Math.round(vadeGun) : 0,
      notlar: metin(formData, "notlar"),
      aktif,
    })
    .eq("id", id);

  if (error) return { hata: hataMesaji(error, `"${unvan}" adında başka bir ${CARI_TURU_ADI[cari.tur as CariTuru].tekil.toLocaleLowerCase("tr-TR")} var.`) };
  revalidatePath("/cariler", "layout");
  revalidatePath("/panel");
  return { basarili: aktif ? "Kaydedildi." : "Kaydedildi; cari pasife alındı (listelerde görünmez)." };
}
