"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji, metin, ondalik } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

function yenile(partiId?: string) {
  revalidatePath("/uretim");
  revalidatePath("/stok");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
  if (partiId) revalidatePath(`/uretim/${partiId}`);
}

export async function partiBaslat(formData: FormData): Promise<FormSonucu & { id?: string }> {
  const urun = metin(formData, "urun_karti_id");
  if (!urun) return { hata: "Ürün seçilmedi." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("parti_baslat", {
    p: { urun_karti_id: urun, sorumlu: metin(formData, "sorumlu"), aciklama: metin(formData, "aciklama") },
  });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "Parti başladı.", id: data as string };
}

export async function girdiEkle(partiId: string, formData: FormData): Promise<FormSonucu> {
  const kart = metin(formData, "stok_karti_id");
  const miktar = ondalik(formData, "miktar");
  if (!kart) return { hata: "Malzemeyi listeden seçin." };
  if (!miktar || miktar <= 0) return { hata: "Tartılan miktarı girin." };
  const supabase = await createClient();
  const { error } = await supabase.from("parti_girdileri").insert({ parti_id: partiId, stok_karti_id: kart, miktar });
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath(`/uretim/${partiId}`);
  return { basarili: "Eklendi." };
}

export async function girdiSil(partiId: string, girdiId: number): Promise<FormSonucu> {
  const supabase = await createClient();
  const { error } = await supabase.from("parti_girdileri").delete().eq("id", girdiId);
  if (error) return { hata: hataMesaji(error, "") };
  revalidatePath(`/uretim/${partiId}`);
  return {};
}

export async function partiTamamla(partiId: string, formData: FormData): Promise<FormSonucu> {
  const uretilen = ondalik(formData, "uretilen");
  const bozuk = ondalik(formData, "bozuk") ?? 0;
  if (!uretilen || uretilen <= 0) return { hata: "Paketlenen miktarı girin." };
  if (bozuk < 0) return { hata: "Bozuk miktar eksi olamaz." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("parti_tamamla", {
    p_id: partiId,
    p: {
      uretilen,
      bozuk,
      bozuk_neden: bozuk > 0 ? metin(formData, "bozuk_neden") : null,
      skt: metin(formData, "skt"),
      lot_no: metin(formData, "lot_no"),
    },
  });
  if (error) return { hata: hataMesaji(error, "") };
  yenile(partiId);
  return { basarili: "Parti kapandı; ürün stoğa girdi." };
}

export async function partiIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("parti_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile(id);
  return { basarili: "Parti iptal edildi; stok ve muhasebe kaydı geri alındı." };
}

export type ReceteGirdisi = { urun_karti_id: string; cikti_miktari: number; kalemler: { stok_karti_id: string; miktar: number }[] };

export async function receteKaydet(girdi: ReceteGirdisi): Promise<FormSonucu> {
  if (!girdi.urun_karti_id) return { hata: "Ürün seçilmedi." };
  if (!(girdi.cikti_miktari > 0)) return { hata: "Reçetenin kaç birim ürün için olduğunu girin." };
  const kalemler = girdi.kalemler.filter((k) => k.stok_karti_id && k.miktar > 0);
  if (!kalemler.length) return { hata: "En az bir malzeme girin." };
  if (new Set(kalemler.map((k) => k.stok_karti_id)).size !== kalemler.length) {
    return { hata: "Aynı malzeme iki kez yazılmış; tek satırda toplayın." };
  }

  const supabase = await createClient();
  const { data: recete, error } = await supabase
    .from("receteler")
    .upsert({ urun_karti_id: girdi.urun_karti_id, cikti_miktari: girdi.cikti_miktari }, { onConflict: "urun_karti_id" })
    .select("id")
    .single();
  if (error) return { hata: hataMesaji(error, "") };

  const { error: silHata } = await supabase.from("recete_kalemleri").delete().eq("recete_id", recete.id);
  if (silHata) return { hata: hataMesaji(silHata, "") };
  const { error: ekleHata } = await supabase
    .from("recete_kalemleri")
    .insert(kalemler.map((k) => ({ recete_id: recete.id, stok_karti_id: k.stok_karti_id, miktar: k.miktar })));
  if (ekleHata) return { hata: hataMesaji(ekleHata, "") };

  revalidatePath("/uretim/receteler");
  revalidatePath("/uretim", "layout");
  return { basarili: "Reçete kaydedildi." };
}
