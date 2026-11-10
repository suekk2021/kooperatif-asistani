import { createClient } from "@/lib/supabase/server";
import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { hatirlaticiEkle } from "@/app/actions/hatirlaticilar";
import { HatirlaticilarListesi } from "@/components/HatirlaticilarListesi";

export default async function HatirlaticilarPage() {
  const supabase = await createClient();
  const [{ data: hatirlaticilar }, { data: kisiler }] = await Promise.all([
    supabase
      .from("hatirlaticilar")
      .select(
        "id, baslik, hatirlatma_tarihi, tamamlandi, telegram_gonderen, hedef_kullanici_id, profiller:profiller!olusturan(ad_soyad), hedef:profiller!hedef_kullanici_id(ad_soyad)"
      )
      .order("hatirlatma_tarihi", { ascending: true }),
    // Teknik destek hesabı operasyonda kişi olarak seçilmez (bkz. lib/roller.ts).
    supabase.from("profiller").select("id, ad_soyad").neq("rol", "destek").order("ad_soyad", { ascending: true }),
  ]);

  const tekil = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);
  const hatirlaticilarDuz = (hatirlaticilar ?? []).map((h) => ({
    ...h,
    profiller: tekil(h.profiller),
    hedef: tekil(h.hedef),
  }));

  const duzenlenebilir = duzenlemeYetkisiVarMi(await mevcutRol());

  return (
    <div className="space-y-6">
      <div className="sayfa-bas" style={{ marginBottom: 0 }}>
        <div>
          <h1>Hatırlatıcılar</h1>
          <p>Günü gelince Telegram&apos;dan haber verir</p>
        </div>
      </div>
      {duzenlenebilir && (
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-sm font-semibold text-ink">Yeni Hatırlatıcı</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Tarihi geldiğinde seçtiğin kişiye Telegram&apos;dan bildirim gider. Kimseyi seçmezsen sana gelir.
            Telegram asistanına sesli ya da yazılı söylersen, hatırlatıcı söyleyen kişiye gider.
          </p>
          <form action={hatirlaticiEkle} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
            <input
              name="baslik"
              required
              placeholder="Örn: Ceviz ödemesi yapılacak"
              className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              name="hatirlatma_tarihi"
              type="date"
              required
              className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-1"
            />
            <select
              name="hedef_kullanici_id"
              defaultValue=""
              aria-label="Kime hatırlatılsın"
              className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="">Kime: bana</option>
              {(kisiler ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  Kime: {k.ad_soyad}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-pine px-3 py-2 text-sm font-medium text-white hover:bg-pine-deep sm:col-span-1"
            >
              Ekle
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="text-sm font-semibold text-ink">Tüm Hatırlatıcılar</h2>
        <HatirlaticilarListesi
          hatirlaticilar={hatirlaticilarDuz}
          kisiler={kisiler ?? []}
          duzenlenebilir={duzenlenebilir}
        />
      </div>
    </div>
  );
}
