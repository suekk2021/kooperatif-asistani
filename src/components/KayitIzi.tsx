import { createClient } from "@/lib/supabase/server";

const zamanBicimi = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "Kaydeden: … · zaman" ve iptal edildiyse "İptal eden: … · zaman".
 * İptal edeni değişiklik kaydından okur; onu göremeyen roller (RLS) yalnızca kaydedeni görür.
 */
export async function KayitIzi({ tablo, id, olusturan, zaman }: { tablo: string; id: string; olusturan: string | null; zaman: string }) {
  const supabase = await createClient();
  const { data: iptalKaydi } = await supabase
    .from("degisiklik_kaydi")
    .select("kullanici, zaman")
    .eq("tablo", tablo)
    .eq("kayit", id)
    .eq("islem", "UPDATE")
    .eq("yeni->>durum", "iptal")
    .neq("eski->>durum", "iptal")
    .order("zaman")
    .limit(1)
    .maybeSingle();

  const kisiIdleri = [olusturan, iptalKaydi?.kullanici].filter(Boolean) as string[];
  const { data: kisiler } = kisiIdleri.length
    ? await supabase.from("profiller").select("id, ad_soyad").in("id", kisiIdleri)
    : { data: [] as { id: string; ad_soyad: string }[] };
  const ad = (k: string | null | undefined) => kisiler?.find((x) => x.id === k)?.ad_soyad ?? "bilinmiyor";

  return (
    <p className="soluk" style={{ fontSize: 13, margin: "12px 2px 0" }}>
      Kaydeden: <b>{olusturan ? ad(olusturan) : "sistem"}</b> · {zamanBicimi.format(new Date(zaman))}
      {iptalKaydi && (
        <>
          {" "}
          · İptal eden: <b>{ad(iptalKaydi.kullanici)}</b> · {zamanBicimi.format(new Date(iptalKaydi.zaman))}
        </>
      )}
    </p>
  );
}
