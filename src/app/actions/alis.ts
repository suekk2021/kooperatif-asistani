"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

export type AlisKalemGirdisi = {
  stok_karti_id?: string;
  hesap_kodu?: string;
  aciklama?: string;
  miktar: number;
  birim_fiyat: number;
  kdv_orani: number;
};

export type AlisGirdisi = {
  cari_id: string;
  belge_no: string;
  tarih: string;
  vade_tarihi?: string;
  aciklama?: string;
  odeme_hesap_id: string | null;
  kalemler: AlisKalemGirdisi[];
};

function yenile() {
  revalidatePath("/alis");
  revalidatePath("/stok");
  revalidatePath("/kasa");
  revalidatePath("/cariler");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function alisKaydet(girdi: AlisGirdisi): Promise<FormSonucu & { id?: string }> {
  if (!girdi.cari_id) return { hata: "Tedarikçi seçilmedi." };
  if (!girdi.belge_no?.trim()) return { hata: "Fatura numarası zorunlu." };
  if (!girdi.kalemler.length) return { hata: "En az bir kalem girin." };
  const eksik = girdi.kalemler.findIndex(
    (k) => (!k.stok_karti_id && !k.hesap_kodu) || !(k.miktar > 0) || !(k.birim_fiyat >= 0)
  );
  if (eksik !== -1) return { hata: `${eksik + 1}. satır eksik: malzeme/gider, miktar ve birim fiyat girilmeli.` };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("alis_kaydet", {
    p: { ...girdi, belge_no: girdi.belge_no.trim(), vade_tarihi: girdi.vade_tarihi || null },
  });

  if (error) return { hata: hataMesaji(error, "Bu tedarikçinin aynı numaralı faturası zaten kayıtlı.") };
  yenile();
  return { basarili: "Fatura kaydedildi.", id: data as string };
}

export async function alisIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("alis_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  revalidatePath(`/alis/${id}`);
  return { basarili: "Fatura iptal edildi; stok, borç ve muhasebe kaydı geri alındı." };
}
