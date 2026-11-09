"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { telegramMesajGonder } from "@/lib/telegram";

export async function notGuncelle(id: string, icerik: string): Promise<void> {
  if (!icerik.trim()) {
    throw new Error("Not boş olamaz.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notlar").update({ icerik: icerik.trim() }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notlar");
}

export async function notSil(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notlar").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notlar");
}

export async function notEkle(formData: FormData): Promise<void> {
  const icerik = String(formData.get("icerik") ?? "").trim();
  const hedefKullaniciId = String(formData.get("hedef_kullanici_id") ?? "").trim() || null;

  if (!icerik) {
    throw new Error("Not boş olamaz.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Giriş yapmanız gerekiyor.");
  }

  const { error } = await supabase.from("notlar").insert({
    icerik,
    kaynak: "web",
    olusturan: user.id,
    hedef_kullanici_id: hedefKullaniciId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (hedefKullaniciId) {
    await hedefeTelegramBildirimiGonder(supabase, hedefKullaniciId, icerik, user.id);
  }

  revalidatePath("/notlar");
}

// Hedef kullanicinin kayitli bir Telegram chat id'si varsa, notu ona bildirir.
// Chat id yoksa ya da bot ayarlanmamissa sessizce hicbir sey yapmaz - not kaydi
// zaten olusturulmus durumdadir, bildirim opsiyoneldir.
async function hedefeTelegramBildirimiGonder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hedefKullaniciId: string,
  icerik: string,
  gonderenId: string
) {
  const { data: hedef } = await supabase
    .from("profiller")
    .select("ad_soyad, telegram_chat_id")
    .eq("id", hedefKullaniciId)
    .single();

  if (!hedef?.telegram_chat_id) return;

  const { data: gonderen } = await supabase.from("profiller").select("ad_soyad").eq("id", gonderenId).single();
  const { data: ayarlar } = await supabase.from("ayarlar").select("telegram_bot_token").eq("id", true).single();

  if (!ayarlar?.telegram_bot_token) return;

  const metin = `📝 <b>Senin için bir not var</b>\n${gonderen?.ad_soyad ?? "Biri"} sana not bıraktı:\n\n${icerik}`;

  try {
    await telegramMesajGonder(ayarlar.telegram_bot_token, hedef.telegram_chat_id, metin);
  } catch {
    // Bildirim gonderilemese bile not kaydi zaten olusturuldu, sessizce yut.
  }
}
