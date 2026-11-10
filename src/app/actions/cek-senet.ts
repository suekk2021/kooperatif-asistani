"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type EvrakGirdisi = {
  tur: "cek" | "senet";
  yon: "alinan" | "verilen";
  cari_id: string;
  tutar: number;
  vade: string;
  tarih: string;
  seri_no?: string;
  banka?: string;
  sube?: string;
  borclu?: string;
  aciklama?: string;
};

function yenile() {
  revalidatePath("/cek-senet", "layout");
  revalidatePath("/kasa");
  revalidatePath("/cariler", "layout");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function evrakKaydet(girdi: EvrakGirdisi): Promise<FormSonucu & { id?: string }> {
  if (!girdi.cari_id) return { hata: "Cari seçin." };
  if (!(girdi.tutar > 0)) return { hata: "Tutar girin." };
  if (!girdi.vade) return { hata: "Vade tarihini girin." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evrak_kaydet", { p: girdi });
  if (error) return { hata: hataMesaji(error, "Kaydedilemedi.") };
  yenile();
  return { basarili: "Kaydedildi.", id: data as string };
}

export async function evrakIslem(
  id: string,
  girdi: { islem: "tahsil" | "ciro" | "karsiliksiz" | "odeme"; tarih: string; hesap_id?: string; cari_id?: string }
): Promise<FormSonucu> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("evrak_islem", { p_evrak: id, p: girdi });
  if (error) return { hata: hataMesaji(error, "İşlem yapılamadı.") };
  yenile();
  return { basarili: "İşlem kaydedildi." };
}

export async function evrakHareketiIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("evrak_hareketi_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "İptal edilemedi.") };
  yenile();
  return { basarili: "İşlem iptal edildi; evrak önceki durumuna döndü." };
}
