import { createClient } from "@/lib/supabase/server";
import { YeniIslemFormu } from "@/components/YeniIslemFormu";
import { IslemlerListesi } from "@/components/IslemlerListesi";

export default async function IslemlerPage() {
  const supabase = await createClient();
  const { data: islemler } = await supabase
    .from("islemler")
    .select("id, tur, tutar, tarih, aciklama, kategori, telegram_gonderen, profiller(ad_soyad)")
    .order("tarih", { ascending: false });

  const islemlerDuz = (islemler ?? []).map((i) => ({
    ...i,
    profiller: Array.isArray(i.profiller) ? (i.profiller[0] ?? null) : i.profiller,
  }));

  return (
    <div className="space-y-6">
      <YeniIslemFormu />

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm İşlemler</h2>
        <IslemlerListesi islemler={islemlerDuz} />
      </div>
    </div>
  );
}
