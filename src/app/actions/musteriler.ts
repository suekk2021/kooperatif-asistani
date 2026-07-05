"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Musteri } from "@/types/database";

export type MusteriSonuc = { hata?: string; basarili?: string };

export async function musterileriGetir(): Promise<Musteri[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("musteriler").select("*").order("ad_soyad", { ascending: true });
  return data ?? [];
}

export async function musteriGetir(id: string): Promise<Musteri | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("musteriler").select("*").eq("id", id).single();
  return data ?? null;
}

export async function musteriEkle(formData: FormData): Promise<MusteriSonuc> {
  const adSoyad = String(formData.get("ad_soyad") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim() || null;
  const adres = String(formData.get("adres") ?? "").trim() || null;
  const notlar = String(formData.get("notlar") ?? "").trim() || null;

  if (!adSoyad) {
    return { hata: "Müşteri adı zorunlu." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("musteriler").insert({
    ad_soyad: adSoyad,
    telefon,
    adres,
    notlar,
    olusturan: user?.id ?? null,
  });

  if (error) {
    return { hata: error.message };
  }

  revalidatePath("/musteriler");
  return { basarili: `${adSoyad} eklendi.` };
}

export async function musteriGuncelle(id: string, formData: FormData): Promise<MusteriSonuc> {
  const adSoyad = String(formData.get("ad_soyad") ?? "").trim();
  const telefon = String(formData.get("telefon") ?? "").trim() || null;
  const adres = String(formData.get("adres") ?? "").trim() || null;
  const notlar = String(formData.get("notlar") ?? "").trim() || null;

  if (!adSoyad) {
    return { hata: "Müşteri adı zorunlu." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("musteriler")
    .update({ ad_soyad: adSoyad, telefon, adres, notlar })
    .eq("id", id);

  if (error) {
    return { hata: error.message };
  }

  revalidatePath("/musteriler");
  revalidatePath(`/musteriler/${id}`);
  return { basarili: "Müşteri güncellendi." };
}

export async function musteriSil(id: string): Promise<MusteriSonuc> {
  const supabase = await createClient();
  const { error } = await supabase.from("musteriler").delete().eq("id", id);

  if (error) {
    return { hata: error.message };
  }

  revalidatePath("/musteriler");
  return { basarili: "Müşteri silindi." };
}
