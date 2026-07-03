import { createClient } from "@/lib/supabase/server";
import { NotlarListesi } from "@/components/NotlarListesi";

export default async function NotlarPage() {
  const supabase = await createClient();
  const { data: notlar } = await supabase
    .from("notlar")
    .select("id, icerik, kaynak, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-5">
        <h1 className="text-lg font-semibold text-ink">Notlar</h1>
        <p className="mt-1 text-xs text-ink-soft">
          Telegram üzerinden bırakılan serbest notlar. Yeni not eklemek için asistana Telegram&apos;dan yazabilir
          ya da sesli mesaj gönderebilirsiniz.
        </p>
        <div className="mt-4">
          <NotlarListesi notlar={notlar ?? []} />
        </div>
      </div>
    </div>
  );
}
