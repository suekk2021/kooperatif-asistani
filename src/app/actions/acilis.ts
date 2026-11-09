"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji, metin } from "@/lib/imece";
import { mevcutRol, yoneticiMi } from "@/lib/rol";
import type { FormSonucu } from "./cariler";

function yenile() {
  revalidatePath("/acilis");
  revalidatePath("/panel");
  revalidatePath("/kasa");
  revalidatePath("/cariler", "layout");
  revalidatePath("/stok", "layout");
  revalidatePath("/hesap-plani");
}

export async function acilisAyariKaydet(formData: FormData): Promise<FormSonucu> {
  if (!yoneticiMi(await mevcutRol())) return { hata: "Açılış ayarını Başkan veya Operasyon yöneticisi girer." };
  const tarih = metin(formData, "tarih");
  const karsiHesap = metin(formData, "karsi_hesap");
  if (!tarih || !karsiHesap) return { hata: "Açılış tarihi ve karşı hesap birlikte girilmeli." };

  const supabase = await createClient();
  const { error } = await supabase.from("acilis_ayarlari").update({ tarih, karsi_hesap: karsiHesap }).eq("id", true);
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "Açılış ayarı kaydedildi." };
}

export type AcilisGirdisi = {
  para?: { hesap_id: string; tutar: number }[];
  cariler?: { cari_id: string; tutar: number }[];
  stok?: { stok_karti_id: string; miktar: number; birim_maliyet: number; lot_no?: string; skt?: string }[];
};

export async function acilisKaydet(girdi: AcilisGirdisi): Promise<FormSonucu> {
  const adet = (girdi.para?.length ?? 0) + (girdi.cariler?.length ?? 0) + (girdi.stok?.length ?? 0);
  if (!adet) return { hata: "Hiçbir satıra tutar veya miktar girilmedi." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("acilis_kaydet", { p: girdi });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: `${adet} satır açılışa kaydedildi.` };
}

export async function acilisIptal(fisId: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("acilis_iptal", { p_fis: fisId, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "Açılış kaydı iptal edildi." };
}
