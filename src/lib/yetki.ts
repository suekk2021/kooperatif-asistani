import { createClient } from "@/lib/supabase/server";
import { yoneticiMi } from "@/lib/rol";
import { gunIstanbul, bugunIstanbul } from "@/lib/tarih";
import type { KullaniciRolu } from "@/types/database";

// Veritabanındaki islem_izni() / iptal_izni() ile aynı kural (migration 20261111100000).
// Buradaki kopya sadece düğmeleri göstermek/gizlemek içindir; asıl engel veritabanında.

export type Oturum = { id: string; rol: KullaniciRolu | null };

export async function oturum(): Promise<Oturum | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiller").select("rol").eq("id", user.id).single();
  return { id: user.id, rol: (data?.rol as KullaniciRolu) ?? null };
}

export type Islem = "alis" | "uretim" | "sayim" | "satis" | "kasa" | "acilis";

export function islemIzni(rol: KullaniciRolu | null, islem: Islem): boolean {
  if (yoneticiMi(rol)) return true;
  if (islem === "alis" || islem === "uretim" || islem === "sayim") return rol === "on_muhasebe" || rol === "depo";
  if (islem === "satis" || islem === "kasa" || islem === "acilis") return rol === "on_muhasebe";
  return false;
}

export function iptalEdebilir(o: Oturum | null, kayit: { olusturan: string | null; created_at: string }): boolean {
  if (!o) return false;
  if (yoneticiMi(o.rol)) return true;
  return o.rol === "on_muhasebe" && kayit.olusturan === o.id && gunIstanbul(kayit.created_at) === bugunIstanbul();
}

/** İptal düğmesi yerine gösterilecek kısa açıklama (kayıt giren ama iptal edemeyen kişiye). */
export const IPTAL_YETKI_NOTU = "Bu kaydı iptal etmek için kooperatif yönetimine (Başkan ya da Operasyon yöneticisi) başvurun (ön muhasebe yalnızca kendi girdiğini aynı gün iptal edebilir).";
