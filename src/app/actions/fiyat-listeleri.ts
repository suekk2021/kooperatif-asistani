"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hataMesaji, metin, trSayi } from "@/lib/imece";
import type { FormSonucu } from "./cariler";

function yenile(id?: string) {
  revalidatePath("/satis/fiyat-listeleri");
  if (id) revalidatePath(`/satis/fiyat-listeleri/${id}`);
  revalidatePath("/satis/yeni");
}

export async function fiyatListesiOlustur(formData: FormData): Promise<FormSonucu & { id?: string }> {
  const ad = metin(formData, "ad");
  if (!ad) return { hata: "Liste adı yazılmalı." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fiyat_listeleri")
    .insert({ ad, aciklama: metin(formData, "aciklama") })
    .select("id")
    .single();
  if (error) return { hata: hataMesaji(error, `"${ad}" adında bir fiyat listesi zaten var.`) };
  yenile();
  return { basarili: `${ad} oluşturuldu.`, id: data.id as string };
}

export async function fiyatListesiGuncelle(id: string, formData: FormData): Promise<FormSonucu> {
  const ad = metin(formData, "ad");
  if (!ad) return { hata: "Liste adı yazılmalı." };
  const aktif = formData.get("aktif") === "on";
  const supabase = await createClient();
  if (!aktif) {
    const { count } = await supabase
      .from("cariler")
      .select("id", { count: "exact", head: true })
      .eq("fiyat_listesi_id", id)
      .eq("aktif", true);
    if ((count ?? 0) > 0) {
      return { hata: `Bu liste ${count} müşteriye atanmış; kapatmadan önce müşterilere başka liste seçin (yoksa onlara satış yapılamaz).` };
    }
  }
  const { data, error } = await supabase
    .from("fiyat_listeleri")
    .update({ ad, aciklama: metin(formData, "aciklama"), aktif })
    .eq("id", id)
    .select("id");
  if (error) return { hata: hataMesaji(error, `"${ad}" adında başka bir fiyat listesi var.`) };
  if (!data || data.length === 0) return { hata: "Kaydedilemedi: fiyat listelerini değiştirme yetkiniz yok." };
  yenile(id);
  return { basarili: aktif ? "Kaydedildi." : "Kaydedildi; liste kapatıldı." };
}

export type FiyatGirdisi = { stok_karti_id: string; fiyat: string };

/**
 * Listenin fiyatlarını topluca kaydeder. Fiyatı boş bırakılan ürün listeden çıkar (o müşterilere satılamaz).
 * Yalnız değişen satırlar yazılır ki İşlem Geçmişi'ne gerçek değişiklikler düşsün.
 */
export async function fiyatlariKaydet(listeId: string, girdiler: FiyatGirdisi[]): Promise<FormSonucu> {
  const okunan: { stok_karti_id: string; fiyat: number | null }[] = [];
  for (const g of girdiler) {
    const ham = g.fiyat.trim();
    if (!ham) {
      okunan.push({ stok_karti_id: g.stok_karti_id, fiyat: null });
      continue;
    }
    const f = trSayi(ham);
    if (!Number.isFinite(f) || f <= 0) return { hata: `"${ham}" geçerli bir fiyat değil (sıfırdan büyük olmalı; listeden çıkarmak için boş bırakın).` };
    okunan.push({ stok_karti_id: g.stok_karti_id, fiyat: Math.round(f * 10000) / 10000 });
  }

  const supabase = await createClient();
  const { data: mevcutVeri, error: okumaHatasi } = await supabase
    .from("fiyat_listesi_kalemleri")
    .select("stok_karti_id, fiyat")
    .eq("liste_id", listeId);
  if (okumaHatasi) return { hata: hataMesaji(okumaHatasi, "") };
  const mevcut = new Map((mevcutVeri ?? []).map((m) => [m.stok_karti_id as string, Number(m.fiyat)]));

  const yazilacak = okunan.filter((o) => o.fiyat !== null && mevcut.get(o.stok_karti_id) !== o.fiyat);
  const silinecek = okunan.filter((o) => o.fiyat === null && mevcut.has(o.stok_karti_id)).map((o) => o.stok_karti_id);
  if (!yazilacak.length && !silinecek.length) return { basarili: "Değişiklik yok." };

  if (yazilacak.length) {
    const { data, error } = await supabase
      .from("fiyat_listesi_kalemleri")
      .upsert(
        yazilacak.map((y) => ({ liste_id: listeId, stok_karti_id: y.stok_karti_id, fiyat: y.fiyat })),
        { onConflict: "liste_id,stok_karti_id" }
      )
      .select("id");
    if (error) return { hata: hataMesaji(error, "") };
    if (!data || data.length !== yazilacak.length) return { hata: "Fiyatlar kaydedilemedi: fiyat listelerini değiştirme yetkiniz yok." };
  }
  if (silinecek.length) {
    const { data, error } = await supabase
      .from("fiyat_listesi_kalemleri")
      .delete()
      .eq("liste_id", listeId)
      .in("stok_karti_id", silinecek)
      .select("id");
    if (error) return { hata: hataMesaji(error, "") };
    if (!data || data.length !== silinecek.length) return { hata: "Ürünler listeden çıkarılamadı: fiyat listelerini değiştirme yetkiniz yok." };
  }
  yenile(listeId);
  const parca = [yazilacak.length && `${yazilacak.length} fiyat kaydedildi`, silinecek.length && `${silinecek.length} ürün listeden çıkarıldı`];
  return { basarili: `${parca.filter(Boolean).join(", ")}.` };
}
