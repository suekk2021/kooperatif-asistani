"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KORUNAN_ROLLER, ROLLER, rolBilgisi } from "@/lib/roller";
import type { KullaniciRolu, Profil } from "@/types/database";

export type KullaniciSonuc = { hata?: string; basarili?: string };

async function mevcutKullanici(): Promise<{ id: string; rol: KullaniciRolu | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiller").select("rol").eq("id", user.id).single();
  return { id: user.id, rol: (profil?.rol as KullaniciRolu) ?? null };
}

/** Korunan rolü (başkan, teknik destek) sadece aynı roldeki kişi verir/değiştirir; teknik destek kurulumda hepsini yapabilir. */
function korunanaDokunabilir(benimRol: KullaniciRolu | null | undefined, hedefRol: KullaniciRolu | null | undefined) {
  if (!hedefRol || !KORUNAN_ROLLER.includes(hedefRol)) return true;
  return benimRol === hedefRol || benimRol === "destek";
}

/** Yönetici (başkan / operasyon / teknik destek) değilse veya korunan rolü vermeye çalışıyorsa hata mesajı döner. */
async function yetkiKontrol(verilecekRol?: KullaniciRolu): Promise<string | null> {
  const ben = await mevcutKullanici();
  if (!rolBilgisi(ben?.rol)?.yonetici) return "Bu işlemi sadece Başkan veya Operasyon yöneticisi yapabilir.";
  if (!korunanaDokunabilir(ben?.rol, verilecekRol)) return `${rolBilgisi(verilecekRol)?.ad} rolünü bu hesap veremez.`;
  return null;
}

export async function kullanicilariGetir(): Promise<Profil[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiller").select("*").order("created_at", { ascending: true });
  return data ?? [];
}

export async function kullaniciEkle(formData: FormData): Promise<KullaniciSonuc> {
  const adSoyad = String(formData.get("ad_soyad") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const sifre = String(formData.get("sifre") ?? "");
  const gorev = String(formData.get("gorev") ?? "").trim() || null;
  const rol = String(formData.get("rol") ?? "on_muhasebe") as KullaniciRolu;

  if (!ROLLER.some((r) => r.deger === rol)) return { hata: "Rol seçilmedi." };
  const yetkiHatasi = await yetkiKontrol(rol);
  if (yetkiHatasi) return { hata: yetkiHatasi };
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
  if (error) return { hata: error.message };

  // Tetikleyici (handle_new_user) profili varsayılan rol "on_muhasebe" ile açar; seçilen rol ve görev burada yazılır.
  if (data.user) {
    await admin.from("profiller").update({ rol, gorev }).eq("id", data.user.id);
  }

  revalidatePath("/ayarlar");
  return { basarili: `${adSoyad} için hesap oluşturuldu. E-posta ve geçici şifreyi kendisine iletin.` };
}

export async function kullaniciGuncelle(
  id: string,
  degisiklik: { rol?: KullaniciRolu; gorev?: string | null; telegram_chat_id?: string | null }
): Promise<KullaniciSonuc> {
  const yetkiHatasi = await yetkiKontrol(degisiklik.rol);
  if (yetkiHatasi) return { hata: yetkiHatasi };

  const ben = await mevcutKullanici();
  if (degisiklik.rol && ben?.id === id) return { hata: "Kendi rolünüzü değiştiremezsiniz." };

  const supabase = await createClient();
  if (degisiklik.rol) {
    const { data: hedef } = await supabase.from("profiller").select("rol").eq("id", id).single();
    if (!korunanaDokunabilir(ben?.rol, hedef?.rol)) return { hata: `${rolBilgisi(hedef?.rol)?.ad} rolündeki kişinin rolünü bu hesap değiştiremez.` };
  }

  const guncel: Record<string, string | null> = {};
  if (degisiklik.rol) guncel.rol = degisiklik.rol;
  if (degisiklik.gorev !== undefined) guncel.gorev = degisiklik.gorev?.trim() || null;
  if (degisiklik.telegram_chat_id !== undefined) guncel.telegram_chat_id = degisiklik.telegram_chat_id?.trim() || null;

  const { error } = await supabase.from("profiller").update(guncel).eq("id", id);
  if (error) return { hata: error.message };

  revalidatePath("/ayarlar");
  return { basarili: "Kaydedildi." };
}

export async function kullaniciSil(id: string): Promise<KullaniciSonuc> {
  const yetkiHatasi = await yetkiKontrol();
  if (yetkiHatasi) return { hata: yetkiHatasi };
  const ben = await mevcutKullanici();
  if (ben?.id === id) return { hata: "Kendi hesabınızı buradan silemezsiniz." };

  const supabase = await createClient();
  const { data: hedef } = await supabase.from("profiller").select("rol").eq("id", id).single();
  // Teknik destek hesabını yöneticiler her zaman silebilir (erişimi kesme hakkı kooperatifte).
  if (hedef?.rol === "baskan" && ben?.rol !== "baskan" && ben?.rol !== "destek") return { hata: "Başkanı sadece Başkan silebilir." };

  const admin = createAdminClient();
  // auth.users silinince profil (on delete cascade) de silinir.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { hata: error.message };

  revalidatePath("/ayarlar");
  return { basarili: "Kullanıcı silindi." };
}
