import { createClient } from "@/lib/supabase/server";
import { YeniIslemFormu } from "@/components/YeniIslemFormu";
import { IslemlerListesi } from "@/components/IslemlerListesi";

export default async function IslemlerPage() {
  const supabase = await createClient();
  const { data: islemler } = await supabase
    .from("islemler")
    .select("id, tur, tutar, tarih, aciklama, kategori")
    .order("tarih", { ascending: false });

  return (
    <div className="space-y-6">
      <YeniIslemFormu />

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm İşlemler</h2>
        <IslemlerListesi islemler={islemler ?? []} />
      </div>
    </div>
  );
}
