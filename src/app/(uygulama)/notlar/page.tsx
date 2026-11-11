import { createClient } from "@/lib/supabase/server";
import { mevcutRol, duzenlemeYetkisiVarMi } from "@/lib/rol";
import { notEkle } from "@/app/actions/notlar";
import { NotlarListesi } from "@/components/NotlarListesi";
import { AliciSecici, type AliciKisi } from "@/components/AliciSecici";
import { kimeMetni } from "@/lib/alici-metni";
import { ALICI_ROLLERI, aliciAdi } from "@/lib/roller";

export default async function NotlarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: notlar }, { data: kullanicilar }] = await Promise.all([
    supabase
      .from("notlar")
      .select("id, icerik, kaynak, created_at, telegram_gonderen, hedef_kullanici_id, hedef_kullanici_idler")
      .order("created_at", { ascending: false }),
    // Alıcı olarak seçilebilen roller (bkz. ALICI_ROLLERI, lib/roller.ts).
    supabase.from("profiller").select("id, ad_soyad, rol").in("rol", ALICI_ROLLERI).order("ad_soyad", { ascending: true }),
  ]);

  const kisiler = (kullanicilar ?? []) as AliciKisi[];
  const adlar = new Map(kisiler.map((k) => [k.id, aliciAdi(k)]));
  const notlarDuz = (notlar ?? []).map((n) => ({
    ...n,
    kime: kimeMetni(n.hedef_kullanici_idler?.length ? n.hedef_kullanici_idler : n.hedef_kullanici_id ? [n.hedef_kullanici_id] : [], adlar, kisiler.length - 1),
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
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-soft">Kime? (boş bırakırsan genel not olur)</p>
              <AliciSecici kisiler={kisiler} name="hedef_kullanici_idler" haricId={user?.id} />
              <button
                type="submit"
                className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep"
              >
                Not Ekle
              </button>
            </div>
            <p className="text-xs text-ink-soft/70">
              Herkes, bir iş grubu ya da tek tek kişiler seçebilirsin. Seçilenlerin Telegram numarası kayıtlıysa
              (Ayarlar &gt; Kullanıcılar) not onlara otomatik bildirilir. Notlar giriş yapan herkese görünür; &quot;kime&quot;
              yalnızca bildirim içindir.
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
