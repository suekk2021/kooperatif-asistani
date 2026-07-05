import { createClient } from "@/lib/supabase/server";
import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { notEkle } from "@/app/actions/notlar";
import { NotlarListesi } from "@/components/NotlarListesi";

export default async function NotlarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: notlar }, { data: kullanicilar }] = await Promise.all([
    supabase
      .from("notlar")
      .select("id, icerik, kaynak, created_at, telegram_gonderen, hedef_kullanici_id, hedef:profiller!hedef_kullanici_id(ad_soyad)")
      .order("created_at", { ascending: false }),
    supabase.from("profiller").select("id, ad_soyad").order("ad_soyad", { ascending: true }),
  ]);

  const notlarDuz = (notlar ?? []).map((n) => ({
    ...n,
    hedef: Array.isArray(n.hedef) ? (n.hedef[0] ?? null) : n.hedef,
  }));

  const duzenlenebilir = duzenlemeYetkisiVarMi(await mevcutRol());

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h1 className="text-lg font-semibold text-ink">Notlar</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Telegram üzerinden bırakılan serbest notlar. Yeni not eklemek için asistana Telegram&apos;dan yazabilir
          ya da sesli mesaj gönderebilirsiniz.
        </p>

        {duzenlenebilir && (
          <form action={notEkle} className="mt-4 space-y-2 border-t border-line pt-4">
            <textarea
              name="icerik"
              required
              rows={3}
              placeholder="Bir not bırak..."
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                name="hedef_kullanici_id"
                defaultValue=""
                className="rounded-md border border-line px-3 py-2 text-sm"
              >
                <option value="">Kimseye özel değil (genel not)</option>
                {(kullanicilar ?? [])
                  .filter((k) => k.id !== user?.id)
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      Kime: {k.ad_soyad}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep"
              >
                Not Ekle
              </button>
            </div>
            <p className="text-xs text-ink-soft/70">
              Bir kişi seçersen, o kişinin Telegram Chat ID&apos;si kayıtlıysa (Ayarlar &gt; Kullanıcılar) otomatik
              bildirim gider.
            </p>
          </form>
        )}

        <div className="mt-4">
          <NotlarListesi notlar={notlarDuz} duzenlenebilir={duzenlenebilir} />
        </div>
      </div>
    </div>
  );
}
