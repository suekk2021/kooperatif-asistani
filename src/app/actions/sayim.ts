"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type SayimGirdisi = { tarih?: string; sayan?: string; aciklama?: string; kalemler: { stok_karti_id: string; sayilan: number }[] };

function yenile() {
  revalidatePath("/stok", "layout");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function sayimKaydet(girdi: SayimGirdisi): Promise<FormSonucu & { id?: string }> {
  if (!girdi.kalemler.length) return { hata: "Hiçbir karta sayılan miktar girilmedi." };
  if (girdi.kalemler.some((k) => !(k.sayilan >= 0))) return { hata: "Sayılan miktar eksi olamaz." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sayim_kaydet", { p: girdi });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "Sayım kaydedildi.", id: data as string };
}

export async function sayimIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("sayim_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  revalidatePath(`/stok/sayim/${id}`);
  return { basarili: "Sayım iptal edildi; stoklar sayım öncesine döndü." };
}
