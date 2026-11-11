import { ROLLER, OPERASYON_DISI_ROLLER, rolBilgisi } from "@/lib/roller";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { KullaniciRolu } from "@/types/database";

/** Yapay zekânın seçebileceği iş grupları: roller.ts'teki roller (teknik destek hariç). Yeni rol eklenince kendiliğinden girer. */
export const GRUP_ROLLERI = ROLLER.map((r) => r.deger).filter((r) => !OPERASYON_DISI_ROLLER.includes(r));

export const GRUP_ACIKLAMASI = ROLLER.filter((r) => GRUP_ROLLERI.includes(r.deger))
  .map((r) => `${r.deger} = ${r.ad} (${r.aciklama})`)
  .join("; ");

export type KimeIstegi = { herkes: boolean; gruplar: KullaniciRolu[]; kisiler: string[] };

/** Yapay zekâ çıktısından "kime" isteğini güvenle okur; hiçbiri doluysa istek vardır. */
export function kimeIsteginiOku(cikarim: Record<string, unknown>): KimeIstegi | null {
  const gruplar = (Array.isArray(cikarim.kime_gruplar) ? cikarim.kime_gruplar : [])
    .map(String)
    .filter((g): g is KullaniciRolu => GRUP_ROLLERI.includes(g as KullaniciRolu));
  const kisiler = (Array.isArray(cikarim.kime_kisiler) ? cikarim.kime_kisiler : [])
    .map((k) => String(k).trim())
    .filter(Boolean);
  const herkes = cikarim.kime_herkes === true;
  if (!herkes && gruplar.length === 0 && kisiler.length === 0) return null;
  return { herkes, gruplar: Array.from(new Set(gruplar)), kisiler };
}

const sade = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const UNVANLAR = new Set(["bey", "hanim", "abi", "abla", "hoca", "sayin", "arkadas"]);

export type AliciCozumu = { idler: string[]; adlar: string[]; sorunlar: string[] };

/**
 * Söylenen "kime"yi kişi listesine çevirir. Emin olunamayan her şey (aynı isimde birden fazla kişi,
 * bulunamayan isim, boş grup) `sorunlar`a yazılır; çağıran bu durumda hiçbir şey göndermemelidir.
 */
export async function aliciCoz(
  supabase: ReturnType<typeof createAdminClient>,
  istek: KimeIstegi,
  haricId?: string
): Promise<AliciCozumu> {
  const { data } = await supabase.from("profiller").select("id, ad_soyad, rol").neq("rol", "destek");
  const tumu = (data ?? []) as { id: string; ad_soyad: string; rol: KullaniciRolu | null }[];
  const secilen = new Map<string, string>();
  const sorunlar: string[] = [];

  if (istek.herkes) tumu.forEach((k) => secilen.set(k.id, k.ad_soyad));

  for (const rol of istek.gruplar) {
    const uyeler = tumu.filter((k) => k.rol === rol);
    if (uyeler.length === 0) sorunlar.push(`"${rolBilgisi(rol)?.ad ?? rol}" grubunda kimse yok.`);
    uyeler.forEach((k) => secilen.set(k.id, k.ad_soyad));
  }

  for (const soylenen of istek.kisiler) {
    const parcalar = sade(soylenen).filter((p) => !UNVANLAR.has(p));
    if (parcalar.length === 0) continue;
    const adaylar = tumu.filter((k) => {
      const adParcalari = sade(k.ad_soyad);
      return parcalar.every((p) => adParcalari.some((a) => a === p || (p.length >= 3 && a.startsWith(p))));
    });
    if (adaylar.length === 0) sorunlar.push(`"${soylenen}" adında bir kişi bulamadım.`);
    else if (adaylar.length > 1) sorunlar.push(`"${soylenen}" için birden fazla kişi var (${adaylar.map((a) => a.ad_soyad).join(", ")}).`);
    else secilen.set(adaylar[0].id, adaylar[0].ad_soyad);
  }

  if (haricId) secilen.delete(haricId);
  return { idler: Array.from(secilen.keys()), adlar: Array.from(secilen.values()), sorunlar };
}
