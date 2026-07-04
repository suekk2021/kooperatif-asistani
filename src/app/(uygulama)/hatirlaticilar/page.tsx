import { createClient } from "@/lib/supabase/server";
import { hatirlaticiEkle } from "@/app/actions/hatirlaticilar";
import { HatirlaticilarListesi } from "@/components/HatirlaticilarListesi";

export default async function HatirlaticilarPage() {
  const supabase = await createClient();
  const { data: hatirlaticilar } = await supabase
    .from("hatirlaticilar")
    .select("id, baslik, hatirlatma_tarihi, tamamlandi, telegram_gonderen")
    .order("hatirlatma_tarihi", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Yeni Hatırlatıcı</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Tarihi geldiğinde Telegram üzerinden otomatik bildirim gönderilir. Sesli veya yazılı olarak
          Telegram asistanına da ekletebilirsiniz.
        </p>
        <form action={hatirlaticiEkle} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            name="baslik"
            required
            placeholder="Örn: Ceviz ödemesi yapılacak"
            className="col-span-2 rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            name="hatirlatma_tarihi"
            type="date"
            required
            className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="col-span-1 rounded-md bg-pine px-3 py-2 text-sm font-medium text-white hover:bg-pine-deep"
          >
            Ekle
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm Hatırlatıcılar</h2>
        <HatirlaticilarListesi hatirlaticilar={hatirlaticilar ?? []} />
      </div>
    </div>
  );
}
