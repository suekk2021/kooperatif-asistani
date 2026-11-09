"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PARA_HESABI_TURU_ADI, hataMesaji, metin, ondalik } from "@/lib/imece";
import type { ParaHareketiTuru, ParaHesabiTuru } from "@/types/database";
import type { FormSonucu } from "./cariler";

function yenile() {
  revalidatePath("/kasa");
  revalidatePath("/cariler");
  revalidatePath("/panel");
  revalidatePath("/hesap-plani");
}

export async function paraHesabiAc(formData: FormData): Promise<FormSonucu> {
  const tur = metin(formData, "tur") as ParaHesabiTuru | null;
  const ad = metin(formData, "ad");
  if (!tur || !(tur in PARA_HESABI_TURU_ADI)) return { hata: "Hesap türü seçilmedi." };
  if (!ad) return { hata: "Hesap adı zorunlu." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kasa_banka_hesaplari")
    .insert({
      tur,
      ad,
      banka_adi: metin(formData, "banka_adi"),
      iban: metin(formData, "iban"),
      bagli_banka_id: tur === "pos" ? metin(formData, "bagli_banka_id") : null,
      komisyon_orani: tur === "pos" ? ondalik(formData, "komisyon_orani") : null,
    })
    .select("kod")
    .single();

  if (error) return { hata: hataMesaji(error, `"${ad}" adında bir hesap zaten var.`) };
  yenile();
  return { basarili: `${ad} açıldı (kod ${data.kod}).` };
}

export async function paraHareketiKaydet(formData: FormData): Promise<FormSonucu> {
  const tur = metin(formData, "tur") as ParaHareketiTuru | null;
  const tutar = ondalik(formData, "tutar");
  const komisyon = ondalik(formData, "komisyon") ?? 0;
  const hesapId = metin(formData, "hesap_id");
  const karsiHesapId = metin(formData, "karsi_hesap_id");
  const cariId = metin(formData, "cari_id");

  if (tur !== "tahsilat" && tur !== "odeme" && tur !== "virman") return { hata: "İşlem türü seçilmedi." };
  if (!hesapId) return { hata: "Kasa/banka hesabı seçilmedi." };
  if (!tutar || tutar <= 0) return { hata: "Tutar sıfırdan büyük olmalı." };
  if (tur === "virman") {
    if (!karsiHesapId) return { hata: "Paranın gideceği hesap seçilmedi." };
    if (karsiHesapId === hesapId) return { hata: "Aynı hesaba virman yapılamaz." };
    if (komisyon < 0 || komisyon >= tutar) return { hata: "Komisyon, tutardan küçük olmalı." };
  } else if (!cariId) {
    return { hata: tur === "tahsilat" ? "Paranın kimden geldiğini seçin." : "Paranın kime gittiğini seçin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("para_hareketi_kaydet", {
    p: {
      tur,
      tarih: metin(formData, "tarih"),
      hesap_id: hesapId,
      karsi_hesap_id: karsiHesapId,
      cari_id: cariId,
      tutar,
      komisyon: tur === "virman" ? komisyon : 0,
      aciklama: metin(formData, "aciklama"),
      belge_no: metin(formData, "belge_no"),
    },
  });

  if (error) return { hata: hataMesaji(error, "Bu kayıt zaten var.") };
  yenile();
  return { basarili: "Kaydedildi." };
}

export async function paraHareketiIptal(id: string, neden: string): Promise<FormSonucu> {
  if (!neden.trim()) return { hata: "İptal nedeni yazılmalı." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("para_hareketi_iptal", { p_id: id, p_neden: neden.trim() });
  if (error) return { hata: hataMesaji(error, "") };
  yenile();
  return { basarili: "İptal edildi; ters kayıt oluşturuldu." };
}
