import { musterileriGetir } from "@/app/actions/musteriler";
import { RaporFormu } from "@/components/RaporFormu";

export default async function RaporlarPage() {
  const musteriler = await musterileriGetir();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h1 className="text-lg font-semibold text-ink">Dönemsel Rapor</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Genel (tüm kooperatif) ya da belirli bir müşteri için, aylık veya yıllık gelir/gider özetini gör.
        </p>
        <div className="mt-4">
          <RaporFormu musteriler={musteriler} />
        </div>
      </div>
    </div>
  );
}
