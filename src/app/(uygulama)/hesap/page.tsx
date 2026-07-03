import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HesapFormlari } from "@/components/HesapFormlari";

export default async function HesapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold text-ink">Hesap Ayarları</h1>
      <HesapFormlari mevcutEposta={user.email ?? ""} />
    </div>
  );
}
