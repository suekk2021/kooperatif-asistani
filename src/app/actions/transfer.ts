"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type TransferGirdisi = {
  tarih?: string;
  kaynak_depo: number;
  hedef_depo: number;
  aciklama?: string;
  kalemler: { stok_karti_id: string; miktar: number }[];
};

function yenile() {
  revalidatePath("/stok", "layout");
  revalidatePath("/uretim", "layout");
  revalidatePath("/panel");
}

export async function transferKaydet(girdi: TransferGirdisi): Promise<FormSonucu & { id?: string }> {
  if (!girdi.kaynak_depo || !girdi.hedef_depo) return { hata: "Çıkış ve giriş deposu seçilmeli." };
  if (girdi.kaynak_depo === girdi.hedef_depo) return { hata: "Çıkış ve giriş deposu aynı olamaz." };
  if (!girdi.kalemler.length) return { hata: "Hiçbir malzeme girilmedi." };
  if (girdi.kalemler.some((k) => !(k.miktar > 0))) return { hata: "Miktar sıfırdan büyük olmalı." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transfer_kaydet", { p: girdi });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "Transfer kaydedildi.", id: data as string };
}

export async function transferIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  revalidatePath(`/stok/transfer/${id}`);
  return { basarili: "Transfer iptal edildi; mallar çıktığı depoya döndü." };
}
