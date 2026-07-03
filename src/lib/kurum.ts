import { createClient } from "@/lib/supabase/server";
import type { KurumKimligi } from "@/types/database";

const VARSAYILAN: KurumKimligi = {
  kurum_adi: "Suluova Üreten Eller Kadın Kooperatifi",
  logo_url: null,
};

/** Giris ekrani dahil, oturum olmadan da erisilebilen genel kurum adi/logosu (bkz. public.kurum_kimligi view'i). */
export async function kurumKimligiGetir(): Promise<KurumKimligi> {
  const supabase = await createClient();
  const { data } = await supabase.from("kurum_kimligi").select("kurum_adi, logo_url").single();
  return data ?? VARSAYILAN;
}
