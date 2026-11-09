import { Iskelet } from "@/components/iskelet/Iskelet";
import { kurumKimligiGetir } from "@/lib/kurum";
import { createClient } from "@/lib/supabase/server";

export default async function UygulamaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [kurum, { data: profil }] = await Promise.all([
    kurumKimligiGetir(),
    supabase.from("profiller").select("ad_soyad, rol").eq("id", user?.id ?? "").maybeSingle(),
  ]);

  return (
    <Iskelet
      kullaniciAdi={profil?.ad_soyad ?? user?.email ?? ""}
      rol={profil?.rol ?? null}
      logoUrl={kurum.logo_url ?? "/logo.png"}
    >
      {children}
    </Iskelet>
  );
}
