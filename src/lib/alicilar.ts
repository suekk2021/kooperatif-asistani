import type { createClient } from "@/lib/supabase/server";

/**
 * Formdaki seçili kişi numaralarını okur ve yalnızca gerçekten var olan, operasyonda kişi sayılan
 * (teknik destek hariç) profillere indirir. Sıra ve tekrar temizlenir; `haric` listeden çıkarılır.
 */
export async function aliciIdleriniOku(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  alan: string,
  haric?: string
): Promise<string[]> {
  const istenen = Array.from(new Set(formData.getAll(alan).map((v) => String(v).trim()).filter(Boolean))).slice(0, 100);
  if (istenen.length === 0) return [];
  return aliciIdleriniDogrula(supabase, istenen, haric);
}

export async function aliciIdleriniDogrula(
  supabase: Awaited<ReturnType<typeof createClient>>,
  idler: string[],
  haric?: string
): Promise<string[]> {
  const istenen = Array.from(new Set(idler.filter(Boolean))).filter((id) => id !== haric).slice(0, 100);
  if (istenen.length === 0) return [];
  const { data } = await supabase.from("profiller").select("id").in("id", istenen).neq("rol", "destek");
  const gecerli = new Set((data ?? []).map((p) => p.id));
  return istenen.filter((id) => gecerli.has(id));
}
