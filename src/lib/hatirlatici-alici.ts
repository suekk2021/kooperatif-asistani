export type HatirlaticiAliciGirdisi = {
  hedef_kullanici_id: string | null;
  hedef_kullanici_idler?: string[] | null;
  olusturan: string | null;
  kaynak_chat_id: string | null;
};

/**
 * Bir hatırlatıcının Telegram'da kime gideceği. İlk bulunan kazanır:
 * hedef kişiler (hepsine) → oluşturan → Telegram'dan kurulduysa geldiği sohbet → Ayarlar'daki liste.
 * Son adım, kişisi belli olmayan eski kayıtlar için geçiş dönemi davranışıdır.
 */
export function hatirlaticiAlicilari(
  h: HatirlaticiAliciGirdisi,
  profilChatIdleri: Map<string, string>,
  genelListe: string[]
): string[] {
  const hedefIdler = h.hedef_kullanici_idler?.length ? h.hedef_kullanici_idler : h.hedef_kullanici_id ? [h.hedef_kullanici_id] : [];
  const hedefler = Array.from(
    new Set(hedefIdler.map((id) => profilChatIdleri.get(id)).filter((c): c is string => Boolean(c)))
  );
  if (hedefler.length > 0) return hedefler;
  const olusturan = h.olusturan ? profilChatIdleri.get(h.olusturan) : undefined;
  if (olusturan) return [olusturan];
  if (h.kaynak_chat_id) return [h.kaynak_chat_id];
  return genelListe;
}
