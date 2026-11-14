import Link from "next/link";
import { notFound } from "next/navigation";
import { EkOdemeBitirFormu, EkOdemeFormu, PersonelBilgiFormu, UcretEkleFormu } from "@/components/personel/PersonelFormlari";
import { tl, tarihTR } from "@/lib/imece";
import { MAAS_YETKI_NOTU, UCRET_TIPI_ADI, gecerliUcret } from "@/lib/personel";
import { mevcutRol } from "@/lib/rol";
import { aliciAdi, maasGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import type { KullaniciRolu, Personel, PersonelEkOdemesi, PersonelUcreti } from "@/types/database";

const TABLO_ADI: Record<string, string> = {
  personeller: "Kişi bilgisi",
  personel_ucretleri: "Ücret",
  personel_ek_odemeleri: "Ek ödeme",
  puantaj: "Puantaj",
  maas_aylik: "Ay sonu",
};
const ISLEM_ADI: Record<string, string> = { INSERT: "eklendi", UPDATE: "değiştirildi", DELETE: "silindi" };

export default async function PersonelKartiPage({ params }: { params: Promise<{ id: string }> }) {
  const rol = await mevcutRol();
  if (!maasGorurMu(rol)) {
    return (
      <div className="kart kart-ic">
        <p className="not">{MAAS_YETKI_NOTU}</p>
      </div>
    );
  }
  const { id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("personeller").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const personel = p as Personel;

  const [{ data: uv }, { data: ev }, { data: kv }, { data: kisiler }] = await Promise.all([
    supabase.from("personel_ucretleri").select("*").eq("personel_id", id).order("baslangic", { ascending: false }),
    supabase.from("personel_ek_odemeleri").select("*").eq("personel_id", id).order("baslangic", { ascending: false }),
    supabase
      .from("maas_degisiklik_kaydi")
      .select("tablo, islem, kullanici, zaman")
      .eq("personel_id", id)
      .order("zaman", { ascending: false })
      .limit(15),
    supabase.from("profiller").select("id, ad_soyad, rol"),
  ]);
  const ucretler = (uv ?? []) as PersonelUcreti[];
  const ekler = (ev ?? []) as PersonelEkOdemesi[];
  const bugun = bugunIstanbul();
  const guncel = gecerliUcret(ucretler, bugun);

  const adlar = new Map((kisiler ?? []).map((k) => [k.id as string, aliciAdi(k as { ad_soyad: string; rol: KullaniciRolu | null })]));
  const gecmis = kv ?? [];

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>{personel.ad_soyad}</h1>
          <p>
            {guncel ? `Güncel ücret: ${tl(guncel.tutar)} (${UCRET_TIPI_ADI[guncel.ucret_tipi].toLocaleLowerCase("tr")})` : "Ücret girilmedi."}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/personel" className="btn btn-cizgi">
            ← Personel
          </Link>
          <Link href={`/personel/puantaj?ay=${bugun.slice(0, 7)}&p=${id}`} className="btn btn-ana">
            Puantaj
          </Link>
        </div>
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Kişi bilgisi</h2>
        </div>
        <PersonelBilgiFormu personel={personel} />
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Ücret geçmişi</h2>
        </div>
        <p className="soluk kart-ic" style={{ fontSize: 13, paddingBottom: 0 }}>
          Ücret değişince eskisini düzeltmeyin; yeni ücreti geçerli olduğu tarihle ekleyin. Böylece geçmiş aylar eski ücretle kalır. Deneme
          süresi yarım ücreti de böyle girilir: ilk tarihte yarım ücret, tam ücrete geçtiği tarihte tam ücret.
        </p>
        {ucretler.length > 0 && (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Geçerli olduğu tarih</th>
                  <th>Tip</th>
                  <th className="sag">Ücret</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {ucretler.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {tarihTR(u.baslangic)}
                      {u.id === guncel?.id && <span className="soluk"> · güncel</span>}
                    </td>
                    <td>{UCRET_TIPI_ADI[u.ucret_tipi]}</td>
                    <td className="sag num">{tl(u.tutar)}</td>
                    <td className="soluk">{u.aciklama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <UcretEkleFormu personelId={id} sonTip={guncel?.ucret_tipi ?? "gunluk"} />
      </div>

      <div className="kart" style={{ marginBottom: 16 }}>
        <div className="kart-bas">
          <h2>Ek ödemeler (yol, sigorta parası…)</h2>
        </div>
        <p className="soluk kart-ic" style={{ fontSize: 13, paddingBottom: 0 }}>
          &quot;Geldiği her gün&quot;: puantajda çalıştığı her gün için bir kez eklenir (fazla mesaili gün de bir sayılır). &quot;Ayda bir&quot;:
          o ay için bir kez eklenir.
        </p>
        {ekler.length > 0 && (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Ödeme</th>
                  <th>Nasıl</th>
                  <th className="sag">Tutar</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                </tr>
              </thead>
              <tbody>
                {ekler.map((e) => (
                  <tr key={e.id}>
                    <td>{e.ad}</td>
                    <td>{e.birim === "gunluk" ? "Geldiği her gün" : "Ayda bir"}</td>
                    <td className="sag num">{tl(e.tutar)}</td>
                    <td>{tarihTR(e.baslangic)}</td>
                    <td>{e.bitis ? tarihTR(e.bitis) : <EkOdemeBitirFormu id={e.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <EkOdemeFormu personelId={id} />
      </div>

      <div className="kart">
        <div className="kart-bas">
          <h2>Son değişiklikler</h2>
        </div>
        {gecmis.length === 0 ? (
          <p className="bos">Kayıt yok.</p>
        ) : (
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <tbody>
                {gecmis.map((k, i) => (
                  <tr key={i}>
                    <td className="soluk">{new Date(k.zaman as string).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</td>
                    <td>
                      {TABLO_ADI[k.tablo as string] ?? k.tablo} {ISLEM_ADI[k.islem as string] ?? k.islem}
                    </td>
                    <td>{adlar.get(k.kullanici as string) ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
