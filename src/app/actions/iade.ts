"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type IadeGirdisi = {
  tur: "satis" | "alis";
  fatura_id: string;
  tarih: string;
  belge_no?: string;
  aciklama?: string;
  odeme_hesap_id: string | null;
  kalemler: { kalem_id: number; miktar: number; stoga_al?: boolean }[];
};

function yenile() {
  revalidatePath("/satis", "layout");
  revalidatePath("/alis", "layout");
  revalidatePath("/iade", "layout");
  revalidatePath("/stok");
  revalidatePath("/kasa");
  revalidatePath("/cariler", "layout");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function iadeKaydet(girdi: IadeGirdisi): Promise<FormSonucu & { id?: string }> {
  const kalemler = girdi.kalemler.filter((k) => k.miktar > 0);
  if (!kalemler.length) return { hata: "İade edilecek en az bir üründe miktar girin." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("iade_kaydet", {
    p: { ...girdi, kalemler, belge_no: girdi.belge_no?.trim() || null, aciklama: girdi.aciklama?.trim() || null },
  });
  if (error) return { hata: hataMesaji(error, "İade kaydedilemedi.") };
  yenile();
  return { basarili: "İade kaydedildi.", id: data as string };
}

export async function iadeIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("iade_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "İade iptal edilemedi.") };
  yenile();
  return { basarili: "İade iptal edildi; stok, cari ve para hareketi geri alındı." };
}
