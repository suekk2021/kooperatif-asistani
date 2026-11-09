"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STOK_BIRIMLERI, STOK_TURLERI, hataMesaji, metin, ondalik } from "@/lib/imece";
import type { StokBirimi, StokTuru } from "@/types/database";
import type { FormSonucu } from "./cariler";

export async function stokKartiEkle(formData: FormData): Promise<FormSonucu> {
  const tur = metin(formData, "tur") as StokTuru | null;
  const ad = metin(formData, "ad");
  const birim = metin(formData, "birim") as StokBirimi | null;
  if (!tur || !STOK_TURLERI.includes(tur)) return { hata: "Kart türü seçilmedi." };
  if (!ad) return { hata: "Kart adı zorunlu." };
  if (!birim || !STOK_BIRIMLERI.includes(birim)) return { hata: "Birim seçilmedi." };

  const depoId = ondalik(formData, "depo_id");
  const kdv = ondalik(formData, "kdv_orani");
  const minStok = ondalik(formData, "min_stok");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stok_kartlari")
    .insert({
      tur,
      ad,
      birim,
      depo_id: depoId,
      kdv_orani: kdv ?? 1,
      min_stok: minStok !== null && minStok >= 0 ? minStok : null,
      satis_fiyati: ondalik(formData, "satis_fiyati"),
      notlar: metin(formData, "notlar"),
    })
    .select("kod")
    .single();

  if (error) {
    return { hata: hataMesaji(error, `"${ad}" adında bir stok kartı zaten var. Yeni kart açmak yerine onu kullanın.`) };
  }

  revalidatePath("/stok");
  revalidatePath("/panel");
  return { basarili: `${ad} kartı açıldı (kod ${data.kod}).` };
}

// Kod ve tür değiştirilemez (veritabanı da engeller). Hareket görmüş kartın birimi
// değiştirilemez (500 kg un birdenbire 500 adet olmasın). Stoğu sıfır olmayan kart pasife alınamaz.
export async function stokKartiGuncelle(id: string, formData: FormData): Promise<FormSonucu> {
  const ad = metin(formData, "ad");
  const birim = metin(formData, "birim") as StokBirimi | null;
  if (!ad) return { hata: "Kart adı zorunlu." };
  if (!birim || !STOK_BIRIMLERI.includes(birim)) return { hata: "Birim seçilmedi." };
  const aktif = formData.get("aktif") === "on";
  const minStok = ondalik(formData, "min_stok");

  const supabase = await createClient();
  const [{ data: kart }, { data: durum }, { count: hareketSayisi }] = await Promise.all([
    supabase.from("stok_kartlari").select("birim").eq("id", id).single(),
    supabase.from("stok_durumu").select("miktar").eq("stok_karti_id", id).single(),
    supabase.from("stok_hareketleri").select("id", { count: "exact", head: true }).eq("stok_karti_id", id),
  ]);
  if (!kart) return { hata: "Kart bulunamadı." };
  if (birim !== kart.birim && (hareketSayisi ?? 0) > 0) {
    return { hata: "Bu kartın hareketi var; birimi değiştirilemez. Yanlışsa yeni kart açıp eskisini sıfırlayın." };
  }
  if (!aktif && Math.abs(Number(durum?.miktar ?? 0)) >= 0.001) {
    return { hata: `Stoğu sıfır olmayan kart pasife alınamaz (stok ${Number(durum?.miktar).toLocaleString("tr-TR")} ${kart.birim}).` };
  }

  const { error } = await supabase
    .from("stok_kartlari")
    .update({
      ad,
      birim,
      depo_id: ondalik(formData, "depo_id"),
      kdv_orani: ondalik(formData, "kdv_orani") ?? 1,
      min_stok: minStok !== null && minStok >= 0 ? minStok : null,
      satis_fiyati: ondalik(formData, "satis_fiyati"),
      notlar: metin(formData, "notlar"),
      aktif,
    })
    .eq("id", id);

  if (error) return { hata: hataMesaji(error, `"${ad}" adında başka bir stok kartı var.`) };
  revalidatePath("/stok", "layout");
  revalidatePath("/panel");
  return { basarili: aktif ? "Kaydedildi." : "Kaydedildi; kart pasife alındı (listelerde görünmez)." };
}
