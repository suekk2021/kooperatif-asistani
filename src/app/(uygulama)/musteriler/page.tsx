import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { musterileriGetir } from "@/app/actions/musteriler";
import { YeniMusteriFormu } from "@/components/YeniMusteriFormu";
import { MusterilerListesi } from "@/components/MusterilerListesi";

export default async function MusterilerPage() {
  const musteriler = await musterileriGetir();
  const duzenlenebilir = duzenlemeYetkisiVarMi(await mevcutRol());

  return (
    <div className="space-y-6">
      {duzenlenebilir && <YeniMusteriFormu />}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm Müşteriler</h2>
        <MusterilerListesi musteriler={musteriler} duzenlenebilir={duzenlenebilir} />
      </div>
    </div>
  );
}
