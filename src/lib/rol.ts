import { createClient } from "@/lib/supabase/server";
import { rolBilgisi } from "@/lib/roller";
import type { KullaniciRolu } from "@/types/database";

/** Giris yapan kullanicinin rolunu dondurur (yoksa null). */
export async function mevcutRol(): Promise<KullaniciRolu | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiller").select("rol").eq("id", user.id).single();
  return (data?.rol as KullaniciRolu) ?? null;
}

/** Kayıt girebilen roller (izleyici ve muhasebeci hariç). Veritabanında yazabilir() ile aynı. */
export function duzenlemeYetkisiVarMi(rol: KullaniciRolu | null): boolean {
  return Boolean(rolBilgisi(rol)?.yazar);
}

/** Kişi ekleyen, ayarları değiştiren roller (başkan, operasyon). Veritabanında yonetici_mi() ile aynı. */
export function yoneticiMi(rol: KullaniciRolu | null): boolean {
  return Boolean(rolBilgisi(rol)?.yonetici);
}
