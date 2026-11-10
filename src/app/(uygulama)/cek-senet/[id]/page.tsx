import Link from "next/link";
import { notFound } from "next/navigation";
import { EvrakIslemFormu } from "@/components/cek-senet/EvrakFormlari";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { tarihTR, tl } from "@/lib/imece";
import { EVRAK_DURUM, EVRAK_ISLEM_ADI, evrakAdi } from "@/lib/cek-senet";
import { iptalEdebilir, islemIzni, oturum, IPTAL_YETKI_NOTU } from "@/lib/yetki";
import type { YevmiyeSatiri } from "@/types/database";

export default async function EvrakDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase.from("evraklar").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  const [{ data: cari }, { data: hareketler }, { data: hesaplar }, { data: tedarikciler }, { data: hesapVeri }, kim] = await Promise.all([
    supabase.from("cariler").select("id, unvan, kod").eq("id", e.cari_id).single(),
    supabase.from("evrak_hareketleri").select("*").eq("evrak_id", id).order("sira"),
    supabase.from("kasa_banka_hesaplari").select("id, ad, kod").eq("aktif", true).in("tur", ["kasa", "banka"]).order("kod"),
    supabase.from("cariler").select("id, unvan, kod, tur").eq("aktif", true).eq("tur", "tedarikci").order("unvan"),
    supabase.from("hesap_plani").select("kod, ad"),
    oturum(),
  ]);
  const hList = hareketler ?? [];
  const fisIdleri = hList.flatMap((h) => [h.fis_id, h.iptal_fis_id]).filter(Boolean) as string[];
  const kisiIdleri = hList.flatMap((h) => [h.cari_id]).filter(Boolean) as string[];
  const [{ data: satirVeri }, { data: hareketCarileri }] = await Promise.all([
    fisIdleri.length ? supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira") : Promise.resolve({ data: [] }),
    kisiIdleri.length ? supabase.from("cariler").select("id, unvan").in("id", kisiIdleri) : Promise.resolve({ data: [] as { id: string; unvan: string }[] }),
  ]);
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));
  const cariAdi = new Map((hareketCarileri ?? []).map((c) => [c.id, c.unvan]));
  const bugun = bugunIstanbul();
  const d = EVRAK_DURUM[e.durum] ?? { ad: e.durum, renk: "e-gri" };
  const girebilir = kim && islemIzni(kim.rol, "kasa");
  const kayitli = hList.filter((h) => h.durum === "kayitli");
  const son = kayitli[kayitli.length - 1];
  const islemler = e.durum === "portfoyde" ? (["tahsil", "ciro", "karsiliksiz"] as const) : e.durum === "odenmedi" ? (["odeme"] as const) : [];
  const giris = hList.find((h) => h.islem === "giris");

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {evrakAdi(e.tur)} #{e.evrak_no} <span className={`etk ${d.renk}`}>{d.ad}</span>
          </h1>
          <p>
            {e.yon === "alinan" ? "Müşteriden alındı" : "Tedarikçiye verildi"} · <Link href={`/cariler/${cari?.id}`}>{cari?.unvan}</Link>{" "}
            <span className="kod">{cari?.kod}</span>
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/cek-senet" className="btn btn-cizgi">
            Çek / senet listesi
          </Link>
        </div>
      </div>

      <div className="izgara g4" style={{ marginBottom: 16 }}>
        <div className="kart kart-ic metrik">
          <div className="etiket">Tutar</div>
          <div className="deger num">{tl(e.tutar)}</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">Vade</div>
          <div className={`deger num${(e.durum === "portfoyde" || e.durum === "odenmedi") && e.vade < bugun ? " kirmizi" : ""}`}>{tarihTR(e.vade)}</div>
        </div>
        <div className="kart kart-ic metrik">
          <div className="etiket">{e.tur === "cek" ? "Çek no / banka" : "Senet no"}</div>
          <div className="alt" style={{ fontSize: 15, marginTop: 8 }}>
            {[e.seri_no, e.banka, e.sube].filter(Boolean).join(" · ") || "—"}
            {e.borclu && <div className="soluk">{e.tur === "cek" ? "Keşideci" : "Borçlu"}: {e.borclu}</div>}
            {e.aciklama && <div className="soluk">Not: {e.aciklama}</div>}
          </div>
        </div>
      </div>

      {girebilir && islemler.length > 0 && (
        <div className="kart kart-ic" style={{ marginBottom: 16 }}>
          <EvrakIslemFormu
            evrakId={e.id}
            islemler={[...islemler]}
            hesaplar={hesaplar ?? []}
            tedarikciler={(tedarikciler ?? []) as { id: string; unvan: string; kod: string; tur: "tedarikci" }[]}
            bugun={bugun}
          />
        </div>
      )}

      <div className="kart">
        <div className="kart-bas">
          <h2>Geçmiş</h2>
        </div>
        {hList.map((h) => (
          <div key={h.id} style={{ borderBottom: "1px solid var(--cizgi)" }}>
            <div className="uyari-satir" style={{ borderBottom: 0 }}>
              <span className={`etk ${h.durum === "iptal" ? "e-kirmizi" : "e-mavi"}`}>{h.durum === "iptal" ? "iptal" : EVRAK_ISLEM_ADI[h.islem]}</span>
              <div>
                <b>
                  {EVRAK_ISLEM_ADI[h.islem]} · {tarihTR(h.tarih)}
                  {h.islem === "ciro" && h.cari_id && ` → ${cariAdi.get(h.cari_id)}`}
                </b>
                {h.iptal_nedeni && <span>İptal nedeni: {h.iptal_nedeni}</span>}
              </div>
              {son?.id === h.id && girebilir && (
                <span style={{ marginLeft: "auto" }}>
                  {iptalEdebilir(kim, h) ? (
                    <IptalFormu tur="evrak" id={h.id} etiket={h.islem === "giris" ? "Kaydı iptal et" : "Bu işlemi geri al"} />
                  ) : (
                    <span className="soluk" style={{ fontSize: 12.5 }}>{IPTAL_YETKI_NOTU}</span>
                  )}
                </span>
              )}
            </div>
            {h.fis_id && <MuhasebeKarsiligi satirlar={satirlar.filter((s) => s.fis_id === h.fis_id)} hesapAdlari={hesapAdlari} />}
          </div>
        ))}
      </div>

      {giris && <KayitIzi tablo="evraklar" id={e.id} olusturan={e.olusturan} zaman={e.created_at} />}
    </>
  );
}
