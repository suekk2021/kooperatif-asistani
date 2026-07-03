"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KullaniciRolu, Profil } from "@/types/database";

export type KullaniciSonuc = { hata?: string; basarili?: string };

async function mevcutKullanici(): Promise<{ id: string; baskanMi: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase.from("profiller").select("rol").eq("id", user.id).single();
  return { id: user.id, baskanMi: profil?.rol === "baskan" };
}

async function baskanMi(): Promise<boolean> {
  return Boolean((await mevcutKullanici())?.baskanMi);
}

export async function kullanicilariGetir(): Promise<Profil[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiller").select("*").order("created_at", { ascending: true });
  return data ?? [];
}

export async function kullaniciEkle(formData: FormData): Promise<KullaniciSonuc> {
  if (!(await baskanMi())) {
    return { hata: "Yeni kullanıcı eklemeyi sadece Başkan yapabilir." };
  }

  const adSoyad = String(formData.get("ad_soyad") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const sifre = String(formData.get("sifre") ?? "");
  const rol = String(formData.get("rol") ?? "on_muhasebe") as KullaniciRolu;

  if (!adSoyad || !email || sifre.length < 6) {
    return { hata: "Ad soyad, e-posta zorunlu; şifre en az 6 karakter olmalı." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: sifre,
    email_confirm: true,
    user_metadata: { ad_soyad: adSoyad },
  });

  if (error) {
    return { hata: error.message };
  }

  // Tetikleyici (handle_new_user) profili otomatik olusturur (varsayilan rol: on_muhasebe).
  // Secilen rol baskan ise burada guncelliyoruz.
  if (rol === "baskan" && data.user) {
    await admin.from("profiller").update({ rol: "baskan" }).eq("id", data.user.id);
  }

  revalidatePath("/ayarlar");
  return { basarili: `${adSoyad} için hesap oluşturuldu.` };
}

export async function kullaniciRolGuncelle(id: string, rol: KullaniciRolu): Promise<KullaniciSonuc> {
  if (!(await baskanMi())) {
    return { hata: "Rol değiştirmeyi sadece Başkan yapabilir." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiller").update({ rol }).eq("id", id);

  if (error) {
    return { hata: error.message };
  }

  revalidatePath("/ayarlar");
  return { basarili: "Rol güncellendi." };
}

export async function kullaniciSil(id: string): Promise<KullaniciSonuc> {
  const kullanici = await mevcutKullanici();
  if (!kullanici?.baskanMi) {
    return { hata: "Kullanıcı silmeyi sadece Başkan yapabilir." };
  }

  if (kullanici.id === id) {
    return { hata: "Kendi hesabını buradan silemezsin." };
  }

  const admin = createAdminClient();
  // Kullanicinin auth.users kaydini silmek yeterli - profiller.id "on delete cascade"
  // ile bagli oldugu icin profil satiri da otomatik silinir.
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return { hata: error.message };
  }

  revalidatePath("/ayarlar");
  return { basarili: "Kullanıcı silindi." };
}
