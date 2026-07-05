"use server";

import { createClient } from "@/lib/supabase/server";

export type RaporGirdi = {
  kapsam: "genel" | "musteri";
  musteriId?: string;
  periyot: "ay" | "yil";
  ay?: number; // 1-12, periyot="ay" ise zorunlu
  yil: number;
};

export type RaporSonucu = {
  hata?: string;
  baslangic?: string;
  bitis?: string;
  gelir?: number;
  gider?: number;
  net?: number;
  islemSayisi?: number;
  musteriAdi?: string;
};

function ayinSonGunu(yil: number, ay: number): number {
  return new Date(yil, ay, 0).getDate();
}

export async function raporGetir(girdi: RaporGirdi): Promise<RaporSonucu> {
  if (girdi.periyot === "ay" && (!girdi.ay || girdi.ay < 1 || girdi.ay > 12)) {
    return { hata: "Geçerli bir ay seçmelisin." };
  }
  if (!girdi.yil || girdi.yil < 2000) {
    return { hata: "Geçerli bir yıl seçmelisin." };
  }
  if (girdi.kapsam === "musteri" && !girdi.musteriId) {
    return { hata: "Müşteri bazlı rapor için bir müşteri seçmelisin." };
  }

  let baslangic: string;
  let bitis: string;
  if (girdi.periyot === "ay" && girdi.ay) {
    const ayStr = String(girdi.ay).padStart(2, "0");
    baslangic = `${girdi.yil}-${ayStr}-01`;
    bitis = `${girdi.yil}-${ayStr}-${String(ayinSonGunu(girdi.yil, girdi.ay)).padStart(2, "0")}`;
  } else {
    baslangic = `${girdi.yil}-01-01`;
    bitis = `${girdi.yil}-12-31`;
  }

  const supabase = await createClient();
  let sorgu = supabase.from("islemler").select("tur, tutar").gte("tarih", baslangic).lte("tarih", bitis);

  if (girdi.kapsam === "musteri" && girdi.musteriId) {
    sorgu = sorgu.eq("musteri_id", girdi.musteriId);
  }

  const { data: islemler, error } = await sorgu;

  if (error) {
    return { hata: error.message };
  }

  const gelir = (islemler ?? []).filter((i) => i.tur === "gelir").reduce((t, i) => t + i.tutar, 0);
  const gider = (islemler ?? []).filter((i) => i.tur === "gider").reduce((t, i) => t + i.tutar, 0);

  let musteriAdi: string | undefined;
  if (girdi.kapsam === "musteri" && girdi.musteriId) {
    const { data: musteri } = await supabase
      .from("musteriler")
      .select("ad_soyad")
      .eq("id", girdi.musteriId)
      .single();
    musteriAdi = musteri?.ad_soyad;
  }

  return {
    baslangic,
    bitis,
    gelir,
    gider,
    net: gelir - gider,
    islemSayisi: (islemler ?? []).length,
    musteriAdi,
  };
}
