import { createClient } from "@/lib/supabase/server";
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

/** Izleyici disindaki roller kayit ekleyip duzenleyebilir/silebilir. */
export function duzenlemeYetkisiVarMi(rol: KullaniciRolu | null): boolean {
  return rol !== null && rol !== "izleyici";
}
