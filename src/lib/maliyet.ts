import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** ortalama = stoktaki ortalama maliyet, son_alis = stok yok ama giriş var, kart = hiç giriş yok, stok kartına yazılan fiyat. */
export type MaliyetKaynagi = "ortalama" | "son_alis" | "kart";
export type BirimMaliyet = { fiyat: number; kaynak: MaliyetKaynagi };

/**
 * Malzemenin bugünkü birim maliyeti. İlk iki adım üretimdeki guncel_birim_maliyet() SQL fonksiyonuyla aynı
 * (stokta miktar varsa ortalama maliyet, yoksa son giriş maliyeti). Hiç giriş yoksa yalnız reçete tahmini için
 * hammadde/ambalaj/yardımcı kartına yazılmış fiyat kullanılır (alış girilmeden reçete maliyeti görülebilsin diye).
 */
export async function guncelBirimMaliyetler(supabase: Supabase): Promise<Map<string, BirimMaliyet>> {
  const [{ data: durumVeri }, { data: hareketVeri }, { data: kartVeri }] = await Promise.all([
    supabase.from("stok_durumu").select("stok_karti_id, miktar, ortalama_maliyet"),
    supabase
      .from("stok_hareketleri")
      .select("stok_karti_id, birim_maliyet")
      .gt("miktar", 0)
      .neq("kaynak_tur", "iptal")
      .order("tarih", { ascending: false })
      .order("id", { ascending: false }),
    supabase.from("stok_kartlari").select("id, satis_fiyati").in("tur", ["hammadde", "ambalaj", "yardimci"]).not("satis_fiyati", "is", null),
  ]);
  const sonuc = new Map<string, BirimMaliyet>();
  for (const k of (kartVeri ?? []) as { id: string; satis_fiyati: number }[]) {
    sonuc.set(k.id, { fiyat: Number(k.satis_fiyati), kaynak: "kart" });
  }
  const sonGirisGoruldu = new Set<string>();
  for (const h of (hareketVeri ?? []) as { stok_karti_id: string; birim_maliyet: number | null }[]) {
    if (sonGirisGoruldu.has(h.stok_karti_id) || h.birim_maliyet === null) continue;
    sonGirisGoruldu.add(h.stok_karti_id);
    sonuc.set(h.stok_karti_id, { fiyat: Number(h.birim_maliyet), kaynak: "son_alis" });
  }
  for (const d of (durumVeri ?? []) as { stok_karti_id: string; miktar: number; ortalama_maliyet: number }[]) {
    if (Number(d.miktar) > 0) sonuc.set(d.stok_karti_id, { fiyat: Number(d.ortalama_maliyet), kaynak: "ortalama" });
  }
  return sonuc;
}

/** Reçetenin ürün birimi (kg/adet) başına malzeme maliyeti; fiyatı bilinmeyen malzeme varsa eksik=true. */
export function receteBirimMaliyeti(
  ciktiMiktari: number,
  kalemler: { stok_karti_id: string; miktar: number }[],
  birimMaliyet: Map<string, BirimMaliyet>
): { birim: number | null; eksik: boolean } {
  if (!(ciktiMiktari > 0) || !kalemler.length) return { birim: null, eksik: false };
  let toplam = 0;
  let bilinen = 0;
  for (const k of kalemler) {
    const bm = birimMaliyet.get(k.stok_karti_id);
    if (!bm) continue;
    toplam += bm.fiyat * Number(k.miktar);
    bilinen += 1;
  }
  return { birim: bilinen ? toplam / ciktiMiktari : null, eksik: bilinen < kalemler.length };
}

/** Kâr oranı (%), maliyet üzerine: (fiyat − maliyet) / maliyet. Fatih Bey, 16 Kas 2026: 300,78 maliyet, 847,60 fiyat → %181,8. */
export function karPayi(fiyat: number | null, maliyet: number | null): number | null {
  return fiyat && maliyet ? ((fiyat - maliyet) / maliyet) * 100 : null;
}
