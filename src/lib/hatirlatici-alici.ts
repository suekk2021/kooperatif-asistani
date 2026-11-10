export type HatirlaticiAliciGirdisi = {
  hedef_kullanici_id: string | null;
  olusturan: string | null;
  kaynak_chat_id: string | null;
};

/**
 * Bir hatırlatıcının Telegram'da kime gideceği. İlk bulunan kazanır:
 * hedef kişi → oluşturan → Telegram'dan kurulduysa geldiği sohbet → Ayarlar'daki liste.
 * Son adım, kişisi belli olmayan eski kayıtlar için geçiş dönemi davranışıdır.
 */
export function hatirlaticiAlicilari(
  h: HatirlaticiAliciGirdisi,
  profilChatIdleri: Map<string, string>,
  genelListe: string[]
): string[] {
  const hedef = h.hedef_kullanici_id ? profilChatIdleri.get(h.hedef_kullanici_id) : undefined;
  if (hedef) return [hedef];
  const olusturan = h.olusturan ? profilChatIdleri.get(h.olusturan) : undefined;
  if (olusturan) return [olusturan];
  if (h.kaynak_chat_id) return [h.kaynak_chat_id];
  return genelListe;
}
