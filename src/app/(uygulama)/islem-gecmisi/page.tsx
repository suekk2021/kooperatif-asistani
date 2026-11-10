import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mevcutRol, yoneticiMi } from "@/lib/rol";
import { rolAdi } from "@/lib/roller";
import { bugunIstanbul } from "@/lib/tarih";
import { KAYIT_TURLERI, islemOzeti, kayitEtiketi } from "@/lib/islem-gecmisi";
import type { KullaniciRolu } from "@/types/database";

const SAYFA = 200;
const zamanBicimi = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function gunOnce(tarih: string, gun: number) {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - gun);
  return d.toISOString().slice(0, 10);
}

// İstanbul gününün başı/sonu, UTC zaman damgası olarak (Türkiye yıl boyu UTC+3).
const gunBasi = (t: string) => `${t}T00:00:00+03:00`;
const gunSonu = (t: string) => `${t}T23:59:59.999+03:00`;

export default async function IslemGecmisiPage({
  searchParams,
}: {
  searchParams: Promise<{ kisi?: string; tur?: string; bas?: string; son?: string }>;
}) {
  const rol = await mevcutRol();
  if (!yoneticiMi(rol) && rol !== "muhasebeci") redirect("/panel");

  const q = await searchParams;
  const bugun = bugunIstanbul();
  const tarihMi = (t?: string) => (t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : undefined);
  const bas = tarihMi(q.bas) ?? gunOnce(bugun, 7);
  const son = tarihMi(q.son) ?? bugun;

  const supabase = await createClient();
  let sorgu = supabase
    .from("degisiklik_kaydi")
    .select("id, tablo, kayit, islem, eski, yeni, kullanici, zaman")
    .gte("zaman", gunBasi(bas))
    .lte("zaman", gunSonu(son))
    .order("zaman", { ascending: false })
    .limit(SAYFA);
  // Kart açılınca program kendiliğinden hesap planına alt hesap ekler (ve geçiş kayıtları da sistemden gelir):
  // bunlar kimsenin yaptığı bir işlem değil, kart kaydının sonucudur; listelenmez. Hesap planındaki değişiklikler görünür.
  sorgu = sorgu.or("tablo.neq.hesap_plani,islem.neq.INSERT");
  if (q.kisi) sorgu = sorgu.eq("kullanici", q.kisi);
  if (q.tur && KAYIT_TURLERI[q.tur]) sorgu = sorgu.eq("tablo", q.tur);

  const [{ data: kayitlar, error }, { data: kisiler }] = await Promise.all([
    sorgu,
    supabase.from("profiller").select("id, ad_soyad, rol").order("ad_soyad"),
  ]);
  const kisi = new Map((kisiler ?? []).map((k) => [k.id, k]));

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>İşlem geçmişi</h1>
          <p>Programda kim, ne zaman, hangi kaydı ekledi, değiştirdi ya da iptal etti. Bu liste değiştirilemez.</p>
        </div>
      </div>

      <form method="get" className="kart kart-ic form-satir" style={{ marginBottom: 16, alignItems: "flex-end" }}>
        <div className="alan">
          <label htmlFor="kisi">Kişi</label>
          <select id="kisi" name="kisi" defaultValue={q.kisi ?? ""}>
            <option value="">Herkes</option>
            {(kisiler ?? []).filter((k) => k.rol !== "destek").map((k) => (
              <option key={k.id} value={k.id}>
                {k.ad_soyad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan">
          <label htmlFor="tur">Kayıt türü</label>
          <select id="tur" name="tur" defaultValue={q.tur ?? ""}>
            <option value="">Hepsi</option>
            {Object.entries(KAYIT_TURLERI).map(([k, v]) => (
              <option key={k} value={k}>
                {v.ad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan" style={{ flex: "0 1 160px" }}>
          <label htmlFor="bas">Başlangıç</label>
          <input id="bas" type="date" name="bas" defaultValue={bas} max={bugun} />
        </div>
        <div className="alan" style={{ flex: "0 1 160px" }}>
          <label htmlFor="son">Bitiş</label>
          <input id="son" type="date" name="son" defaultValue={son} max={bugun} />
        </div>
        <div className="alan" style={{ flex: "0 0 auto" }}>
          <button type="submit" className="btn">
            Göster
          </button>
        </div>
      </form>

      <div className="kart">
        <div className="kart-bas">
          <h2>Kayıtlar</h2>
          <span className="soluk">
            {(kayitlar ?? []).length === SAYFA ? `son ${SAYFA} işlem — aralığı daraltın` : `${(kayitlar ?? []).length} işlem`}
          </span>
        </div>
        {error ? (
          <p className="bos">İşlem geçmişi okunamadı: {error.message}</p>
        ) : (kayitlar ?? []).length === 0 ? (
          <p className="bos">Bu aralıkta işlem yok.</p>
        ) : (
          (kayitlar ?? []).map((k) => {
            const tur = KAYIT_TURLERI[k.tablo];
            const j = (k.yeni ?? k.eski) as Record<string, unknown> | null;
            const etiket = kayitEtiketi(k.tablo, j);
            const ozet = islemOzeti(k.islem, k.eski as Record<string, unknown> | null, k.yeni as Record<string, unknown> | null);
            const yapan = k.kullanici ? kisi.get(k.kullanici) : null;
            const yol = tur?.yol && k.kayit && k.islem !== "DELETE" ? tur.yol(k.kayit) : null;
            if (ozet.fiil === "değiştirdi" && ozet.ayrinti.length === 0) return null;
            return (
              <div className="uyari-satir" key={k.id}>
                <span className={`etk ${ozet.fiil === "iptal etti" || ozet.fiil === "sildi" ? "e-kirmizi" : ozet.fiil === "ekledi" ? "e-yesil" : ozet.fiil === "sıfırladı" ? "e-amber" : "e-mavi"}`} style={{ marginTop: 2 }}>
                  {ozet.fiil}
                </span>
                <div style={{ minWidth: 0 }}>
                  <b>
                    {yapan ? (yapan.rol === "destek" ? "Teknik destek" : yapan.ad_soyad) : k.kullanici ? "silinmiş kullanıcı" : "sistem / Telegram"}
                    {yapan && yapan.rol !== "destek" && <span className="soluk" style={{ fontWeight: 400 }}> ({rolAdi(yapan.rol as KullaniciRolu)})</span>}
                    {" · "}
                    {tur?.ad ?? k.tablo}
                    {etiket && (yol ? <> <Link href={yol}>{etiket}</Link></> : ` ${etiket}`)}
                  </b>
                  <span>{zamanBicimi.format(new Date(k.zaman))}</span>
                  {ozet.ayrinti.map((a) => (
                    <span key={a} style={{ display: "block" }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
