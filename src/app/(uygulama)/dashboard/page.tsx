import { createClient } from "@/lib/supabase/server";
import { ayBasiIstanbul } from "@/lib/tarih";

function formatTL(tutar: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const ayBasiStr = ayBasiIstanbul();

  const [{ data: buAyIslemler }, { data: sonIslemler }, { data: yaklasanHatirlaticilar }] =
    await Promise.all([
      supabase.from("islemler").select("tur, tutar").gte("tarih", ayBasiStr),
      supabase
        .from("islemler")
        .select("id, tur, tutar, tarih, aciklama, kategori")
        .order("tarih", { ascending: false })
        .limit(8),
      supabase
        .from("hatirlaticilar")
        .select("id, baslik, hatirlatma_tarihi")
        .eq("tamamlandi", false)
        .order("hatirlatma_tarihi", { ascending: true })
        .limit(5),
    ]);

  const gelir = (buAyIslemler ?? []).filter((i) => i.tur === "gelir").reduce((t, i) => t + i.tutar, 0);
  const gider = (buAyIslemler ?? []).filter((i) => i.tur === "gider").reduce((t, i) => t + i.tutar, 0);
  const net = gelir - gider;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Bu Ay Gelir</p>
          <p className="mt-1 text-2xl font-semibold text-income">{formatTL(gelir)}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Bu Ay Gider</p>
          <p className="mt-1 text-2xl font-semibold text-expense">{formatTL(gider)}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Net Bakiye</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatTL(net)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Son İşlemler</h2>
          <ul className="mt-3 divide-y divide-line">
            {(sonIslemler ?? []).length === 0 && (
              <li className="py-3 text-sm text-ink-soft/70">Henüz işlem yok.</li>
            )}
            {(sonIslemler ?? []).map((islem) => (
              <li key={islem.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-ink">{islem.aciklama}</p>
                  <p className="text-xs text-ink-soft/70">
                    {islem.tarih} {islem.kategori ? `· ${islem.kategori}` : ""}
                  </p>
                </div>
                <span className={islem.tur === "gelir" ? "text-income" : "text-expense"}>
                  {islem.tur === "gelir" ? "+" : "-"}
                  {formatTL(islem.tutar)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Yaklaşan Hatırlatıcılar</h2>
          <ul className="mt-3 space-y-2">
            {(yaklasanHatirlaticilar ?? []).length === 0 && (
              <li className="text-sm text-ink-soft/70">Yaklaşan hatırlatıcı yok.</li>
            )}
            {(yaklasanHatirlaticilar ?? []).map((h) => (
              <li key={h.id} className="text-sm">
                <p className="text-ink">{h.baslik}</p>
                <p className="text-xs text-ink-soft/70">{h.hatirlatma_tarihi}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
