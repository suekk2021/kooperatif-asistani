import type { createClient } from "@/lib/supabase/server";

export type Istemci = Awaited<ReturnType<typeof createClient>>;

/**
 * Supabase bir sorguda en fazla 1000 satır döndürür; yıllık mizan gibi raporlar bunu aşabilir.
 * Sorguyu sayfa sayfa çalıştırıp hepsini toplar. Hata olursa sessizce eksik rapor vermek yerine durur.
 */
export async function hepsiniGetir<T>(
  sorgu: (bas: number, son: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const sayfa = 1000;
  const sonuc: T[] = [];
  for (let bas = 0; ; bas += sayfa) {
    const { data, error } = await sorgu(bas, bas + sayfa - 1);
    if (error) throw new Error(`Rapor verisi okunamadı: ${error.message}`);
    sonuc.push(...(data ?? []));
    if (!data || data.length < sayfa) return sonuc;
  }
}

/** Tek ilişki bazen nesne, bazen dizi döner; ikisini de nesneye çevirir. */
export function tek<T>(x: T | T[] | null | undefined): T | null {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
}
