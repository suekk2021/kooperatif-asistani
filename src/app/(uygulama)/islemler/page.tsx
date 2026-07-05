import { createClient } from "@/lib/supabase/server";
import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { musterileriGetir } from "@/app/actions/musteriler";
import { YeniIslemFormu } from "@/components/YeniIslemFormu";
import { IslemlerListesi } from "@/components/IslemlerListesi";

export default async function IslemlerPage() {
  const supabase = await createClient();
  const [{ data: islemler }, musteriler] = await Promise.all([
    supabase
      .from("islemler")
      .select(
        "id, tur, tutar, tarih, aciklama, kategori, telegram_gonderen, odendi, dekont_url, musteri_id, profiller(ad_soyad), musteri:musteriler(ad_soyad)"
      )
      .order("tarih", { ascending: false }),
    musterileriGetir(),
  ]);

  const islemlerDuz = (islemler ?? []).map((i) => ({
    ...i,
    profiller: Array.isArray(i.profiller) ? (i.profiller[0] ?? null) : i.profiller,
    musteri: Array.isArray(i.musteri) ? (i.musteri[0] ?? null) : i.musteri,
  }));

  const duzenlenebilir = duzenlemeYetkisiVarMi(await mevcutRol());

  return (
    <div className="space-y-6">
      {duzenlenebilir && <YeniIslemFormu musteriler={musteriler} />}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm İşlemler</h2>
        <IslemlerListesi islemler={islemlerDuz} duzenlenebilir={duzenlenebilir} musteriler={musteriler} />
      </div>
    </div>
  );
}
