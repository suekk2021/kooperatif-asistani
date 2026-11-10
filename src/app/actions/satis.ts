"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type SatisKalemGirdisi = {
  stok_karti_id: string;
  lot_no?: string;
  miktar: number;
  birim_fiyat: number;
  kdv_orani: number;
  iskonto_orani?: number;
};

export type SatisGirdisi = {
  genel_iskonto_orani?: number;
  cari_id: string;
  belge_no?: string;
  tarih: string;
  vade_tarihi?: string;
  aciklama?: string;
  odeme_hesap_id: string | null;
  kalemler: SatisKalemGirdisi[];
};

function yenile() {
  revalidatePath("/satis");
  revalidatePath("/stok");
  revalidatePath("/kasa");
  revalidatePath("/cariler", "layout");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function satisKaydet(girdi: SatisGirdisi): Promise<FormSonucu & { id?: string }> {
  if (!girdi.cari_id) return { hata: "Müşteri seçilmedi." };
  if (!girdi.kalemler.length) return { hata: "En az bir ürün girin." };
  const eksik = girdi.kalemler.findIndex((k) => !k.stok_karti_id || !(k.miktar > 0) || !(k.birim_fiyat >= 0));
  if (eksik !== -1) return { hata: `${eksik + 1}. satır eksik: ürün, miktar ve birim fiyat girilmeli.` };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("satis_kaydet", {
    p: { ...girdi, belge_no: girdi.belge_no?.trim() || null, vade_tarihi: girdi.vade_tarihi || null },
  });

  if (error) return { hata: hataMesaji(error, "Bu fatura numarası başka bir satışta kayıtlı.") };
  yenile();
  return { basarili: "Satış kaydedildi.", id: data as string };
}

export async function satisIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("satis_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  revalidatePath(`/satis/${id}`);
  return { basarili: "Satış iptal edildi; stok, alacak ve muhasebe kaydı geri alındı." };
}
