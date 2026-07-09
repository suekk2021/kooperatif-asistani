import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { musteriGetir } from "@/app/actions/musteriler";
import { MusteriDetayFormu } from "@/components/MusteriDetayFormu";
import { YeniIslemFormu } from "@/components/YeniIslemFormu";

function formatTL(tutar: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
}

export default async function MusteriDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const musteri = await musteriGetir(id);
  if (!musteri) {
    notFound();
  }

  const supabase = await createClient();
  const { data: islemler } = await supabase
    .from("islemler")
    .select("id, tur, tutar, tarih, aciklama, kategori")
    .eq("musteri_id", id)
    .order("tarih", { ascending: false });

  const liste = islemler ?? [];
  const toplamGelir = liste.filter((i) => i.tur === "gelir").reduce((t, i) => t + i.tutar, 0);
  const toplamGider = liste.filter((i) => i.tur === "gider").reduce((t, i) => t + i.tutar, 0);
  const net = toplamGelir - toplamGider;

  const duzenlenebilir = duzenlemeYetkisiVarMi(await mevcutRol());

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <MusteriDetayFormu musteri={musteri} duzenlenebilir={duzenlenebilir} />
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Cari Hesap Özeti</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-ink-soft/70">Müşteriye Satış (Gelir)</p>
            <p className="font-semibold text-income">{formatTL(toplamGelir)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft/70">Müşteriden Alım (Gider)</p>
            <p className="font-semibold text-expense">{formatTL(toplamGider)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft/70">Net Bakiye</p>
            <p className="font-semibold text-ink">{formatTL(net)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-soft/70">
          Pozitif net bakiye, bu müşteriden gelen gelirin ona yapılan ödemeden fazla olduğunu gösterir.
        </p>
      </div>

      {duzenlenebilir && (
        <YeniIslemFormu sabitMusteriId={id} baslik="Bu Müşteriye Gelir/Gider Ekle" />
      )}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-ink">Bu Müşteriyle İlgili İşlemler</h2>
        <ul className="divide-y divide-line">
          {liste.length === 0 && (
            <li className="py-3 text-sm text-ink-soft/70">
              Bu müşteriye bağlı işlem yok. Yukarıdan ekleyebilir ya da Gelir/Gider sayfasından işlem eklerken bu müşteriyi seçebilirsin.
            </li>
          )}
          {liste.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="text-ink">{i.aciklama}</p>
                <p className="text-xs text-ink-soft/70">
                  {i.tarih} {i.kategori ? `· ${i.kategori}` : ""}
                </p>
              </div>
              <span className={i.tur === "gelir" ? "text-income" : "text-expense"}>
                {i.tur === "gelir" ? "+" : "-"}
                {formatTL(i.tutar)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
