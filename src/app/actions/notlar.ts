"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notBildirimiGonder } from "@/lib/not-bildirimi";
import { aliciIdleriniOku } from "@/lib/alicilar";

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

  const hedefler = await aliciIdleriniOku(supabase, formData, "hedef_kullanici_idler", user.id);

  const { error } = await supabase.from("notlar").insert({
    icerik,
    kaynak: "web",
    olusturan: user.id,
    hedef_kullanici_id: hedefler[0] ?? null,
    hedef_kullanici_idler: hedefler,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (hedefler.length > 0) {
    await hedeflereBildir(supabase, hedefler, icerik, user.id);
  }

  revalidatePath("/notlar");
}

// Bildirim opsiyoneldir: bot ayarlanmamissa ya da gonderilemezse not kaydi zaten olusturulmus durumdadir.
async function hedeflereBildir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hedefIdler: string[],
  icerik: string,
  gonderenId: string
) {
  const { data: gonderen } = await supabase.from("profiller").select("ad_soyad").eq("id", gonderenId).single();
  // Bot anahtarı tarayıcıya kapalı; sadece sunucu okur (migration 20261110230000).
  const { data: ayarlar } = await createAdminClient().from("ayarlar").select("telegram_bot_token").eq("id", true).single();
  if (!ayarlar?.telegram_bot_token) return;
  await notBildirimiGonder(supabase, ayarlar.telegram_bot_token, hedefIdler, icerik, gonderen?.ad_soyad ?? "Biri");
}
