import Link from "next/link";
import { ReceteFormu } from "@/components/uretim/ReceteFormu";
import { sayi, tl } from "@/lib/imece";
import { guncelBirimMaliyetler, receteBirimMaliyeti } from "@/lib/maliyet";
import { maliyetGorurMu } from "@/lib/roller";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import type { Recete, ReceteKalemi, StokKarti } from "@/types/database";

type Kart = Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "tur" | "satis_fiyati">;

export default async function RecetelerPage() {
  const supabase = await createClient();
  const [{ data: kartVeri }, { data: receteVeri }, rol] = await Promise.all([
    supabase.from("stok_kartlari").select("id, ad, kod, birim, tur, satis_fiyati").eq("aktif", true).is("birlestirildigi_kart", null).order("ad"),
    supabase.from("receteler").select("*, recete_kalemleri(*)"),
    mevcutRol(),
  ]);
  const kartlar = (kartVeri ?? []) as Kart[];
  const kart = new Map(kartlar.map((k) => [k.id, k]));
  const urunler = kartlar.filter((k) => k.tur === "mamul" || k.tur === "yari_mamul");
  const malzemeler = kartlar.filter((k) => ["hammadde", "ambalaj", "yari_mamul"].includes(k.tur));
  const kodSirasi = (a: ReceteKalemi, b: ReceteKalemi) =>
    (kart.get(a.stok_karti_id)?.kod ?? "").localeCompare(kart.get(b.stok_karti_id)?.kod ?? "");
  const receteler = new Map(
    ((receteVeri ?? []) as (Recete & { recete_kalemleri: ReceteKalemi[] })[]).map((r) => [
      r.urun_karti_id,
      { ...r, recete_kalemleri: [...r.recete_kalemleri].sort(kodSirasi) },
    ])
  );
  const yazabilir = duzenlemeYetkisiVarMi(rol);
  const maliyetGorur = maliyetGorurMu(rol);
  const birimMaliyet = maliyetGorur ? await guncelBirimMaliyetler(supabase) : null;
  const istemciMaliyeti = birimMaliyet
    ? Object.fromEntries(malzemeler.map((m) => [m.id, birimMaliyet.get(m.id) ?? null]))
    : null;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Reçeteler</h1>
          <p>Her ürün için &quot;olması gereken&quot; malzeme miktarı — partilerdeki sapma buna göre ölçülür</p>
        </div>
        <div className="ust-araclar">
          {maliyetGorur && (
            <Link href="/uretim/maliyet" className="btn btn-cizgi">
              Aylık maliyet
            </Link>
          )}
          <Link href="/uretim" className="btn btn-cizgi">
            Üretim
          </Link>
        </div>
      </div>

      {urunler.length === 0 ? (
        <div className="yapim">
          <h2>Önce ürün kartı açın</h2>
          <p className="soluk" style={{ margin: 0 }}>
            <Link href="/stok?tur=mamul">Stok → Ürün (mamul)</Link>
          </p>
        </div>
      ) : (
        <div className="kart">
          {urunler.map((u) => {
            const r = receteler.get(u.id);
            const rm = r && birimMaliyet ? receteBirimMaliyeti(Number(r.cikti_miktari), r.recete_kalemleri, birimMaliyet) : null;
            return (
              <details key={u.id} className="hp">
                <summary>
                  {u.ad}{" "}
                  <small>
                    {r
                      ? `${sayi(r.cikti_miktari)} ${u.birim} için ${r.recete_kalemleri.length} malzeme: ${r.recete_kalemleri
                          .map((k) => `${kart.get(k.stok_karti_id)?.ad} ${sayi(k.miktar)} ${kart.get(k.stok_karti_id)?.birim}`)
                          .join(", ")}`
                      : "reçete yok"}
                    {rm?.birim != null && (
                      <b style={{ color: "var(--metin)" }}>
                        {" "}
                        · 1 {u.birim} maliyeti {tl(rm.birim)}
                        {rm.eksik ? " (eksik)" : ""}
                      </b>
                    )}
                  </small>
                </summary>
                {yazabilir ? (
                  <ReceteFormu
                    urun={u}
                    malzemeler={malzemeler}
                    maliyet={istemciMaliyeti ? { birim: istemciMaliyeti, satisFiyati: u.satis_fiyati !== null ? Number(u.satis_fiyati) : null } : null}
                    mevcut={
                      r
                        ? { cikti_miktari: Number(r.cikti_miktari), kalemler: r.recete_kalemleri.map((k) => ({ stok_karti_id: k.stok_karti_id, miktar: Number(k.miktar) })) }
                        : null
                    }
                  />
                ) : (
                  <p className="kart-ic soluk">Reçeteyi değiştirme yetkiniz yok.</p>
                )}
              </details>
            );
          })}
        </div>
      )}
      <p className="not">
        Reçete zorunlu değil. Bilinmiyorsa ilk 2–4 haftanın partilerini reçetesiz girin; gerçek tartımlardan ortalama çıkarıp
        reçeteye yazarız.
      </p>
    </>
  );
}
