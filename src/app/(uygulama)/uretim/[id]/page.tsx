import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { oturum, iptalEdebilir, IPTAL_YETKI_NOTU } from "@/lib/yetki";
import { MuhasebeKarsiligi } from "@/components/MuhasebeKarsiligi";
import { GirdiFormu, GirdiSilDugmesi, PartiBitirFormu } from "@/components/uretim/UretimFormlari";
import { sayi, tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { partiSuresiDk, saatTR, sureYazisi, uretimFiresi, yuzde } from "@/lib/uretim";
import type { PartiGirdisi, Recete, ReceteKalemi, StokKarti, UretimPartisi, YevmiyeSatiri } from "@/types/database";

type Kart = Pick<StokKarti, "id" | "ad" | "kod" | "birim" | "satis_fiyati">;

export default async function PartiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: partiVeri } = await supabase.from("uretim_partileri").select("*").eq("id", id).maybeSingle();
  if (!partiVeri) notFound();
  const p = partiVeri as UretimPartisi;

  const [{ data: girdiVeri }, { data: kartVeri }, { data: receteVeri }, { data: hesapVeri }, rol] = await Promise.all([
    supabase.from("parti_girdileri").select("*").eq("parti_id", id).order("id"),
    supabase.from("stok_kartlari").select("id, ad, kod, birim, satis_fiyati, tur, aktif, birlestirildigi_kart"),
    supabase.from("receteler").select("*, recete_kalemleri(*)").eq("urun_karti_id", p.urun_karti_id).maybeSingle(),
    supabase.from("hesap_plani").select("kod, ad"),
    mevcutRol(),
  ]);
  const girdiler = (girdiVeri ?? []) as PartiGirdisi[];
  const kartlar = (kartVeri ?? []) as (Kart & { tur: string; aktif: boolean; birlestirildigi_kart: string | null })[];
  const kart = new Map(kartlar.map((k) => [k.id, k]));
  const urun = kart.get(p.urun_karti_id)!;
  const recete = receteVeri as (Recete & { recete_kalemleri: ReceteKalemi[] }) | null;
  const hesapAdlari = new Map(((hesapVeri ?? []) as { kod: string; ad: string }[]).map((h) => [h.kod, h.ad]));
  const malzemeler = kartlar.filter(
    (k) => ["hammadde", "ambalaj", "yari_mamul"].includes(k.tur) && k.aktif && !k.birlestirildigi_kart
  );

  const fisIdleri = [p.fis_id, p.iptal_fis_id].filter(Boolean) as string[];
  const { data: satirVeri } = fisIdleri.length
    ? await supabase.from("yevmiye_satirlari").select("*").in("fis_id", fisIdleri).order("sira")
    : { data: [] };
  const satirlar = (satirVeri ?? []) as YevmiyeSatiri[];

  const acik = p.durum === "acik";
  const yazabilir = duzenlemeYetkisiVarMi(rol);
  const iptalOlur = iptalEdebilir(await oturum(), p);
  const dk = partiSuresiDk(p);
  const toplamCikti = Number(p.uretilen_miktar ?? 0) + Number(p.bozuk_miktar ?? 0);
  const fire = uretimFiresi(p);
  const saatlik = !acik && dk > 0 && p.uretilen_miktar ? (Number(p.uretilen_miktar) / dk) * 60 : null;
  const fiyat = urun.satis_fiyati !== null ? Number(urun.satis_fiyati) : null;
  const marj = fiyat && p.birim_maliyet ? ((fiyat - Number(p.birim_maliyet)) / fiyat) * 100 : null;

  // Malzeme bazında toplam tartım + reçeteye göre olması gereken (kapanınca toplam çıktıya göre).
  const toplamGirdi = new Map<string, number>();
  for (const g of girdiler) toplamGirdi.set(g.stok_karti_id, (toplamGirdi.get(g.stok_karti_id) ?? 0) + Number(g.miktar));
  const receteMiktari = new Map((recete?.recete_kalemleri ?? []).map((r) => [r.stok_karti_id, Number(r.miktar)]));
  const karsilastirmaIdleri = [...new Set([...toplamGirdi.keys(), ...receteMiktari.keys()])];
  const olcek = recete && toplamCikti > 0 ? toplamCikti / Number(recete.cikti_miktari) : null;

  // Yeni partide SKT için varsayılan: 6 ay sonrası (donuk ürün). Kullanıcı değiştirebilir.
  const sktTarih = new Date(`${p.tarih}T12:00:00`);
  sktTarih.setMonth(sktTarih.getMonth() + 6);
  const varsayilanSkt = sktTarih.toISOString().slice(0, 10);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {urun.ad} · #{p.parti_no}{" "}
            {acik ? <span className="etk e-mavi">Devam ediyor</span> : p.durum === "iptal" ? <span className="etk e-kirmizi">iptal</span> : <span className="etk e-yesil">Bitti</span>}
          </h1>
          <p>
            {tarihTR(p.tarih)} · başladı {saatTR(p.baslangic)}
            {p.bitis && ` · bitti ${saatTR(p.bitis)}`} · {sureYazisi(dk)}
            {p.sorumlu && ` · sorumlu ${p.sorumlu}`}
            {p.lot_no && ` · lot ${p.lot_no}`}
            {p.skt && ` · SKT ${tarihTR(p.skt)}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/uretim" className="btn btn-cizgi">
            Üretim
          </Link>
        </div>
      </div>

      {p.durum === "iptal" && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu parti iptal edildi: <b>{p.iptal_nedeni}</b>. Stok ve muhasebe kaydı geri alındı.
        </p>
      )}

      {!acik && p.durum !== "iptal" && (
        <div className="izgara g4" style={{ marginBottom: 16 }}>
          <div className="kart kart-ic metrik">
            <div className="etiket">Paketlenen</div>
            <div className="deger num">
              {sayi(p.uretilen_miktar)} <small style={{ fontSize: 15 }}>{urun.birim}</small>
            </div>
            <div className="alt">bozuk {sayi(p.bozuk_miktar)}{p.bozuk_neden ? ` · ${p.bozuk_neden}` : ""}</div>
          </div>
          <div className="kart kart-ic metrik">
            <div className="etiket">Üretim firesi</div>
            <div className={`deger num${fire !== null && fire >= 5 ? " amber" : ""}`}>{yuzde(fire) || "%0"}</div>
            <div className="alt">bozuk / toplam çıktı</div>
          </div>
          <div className="kart kart-ic metrik">
            <div className="etiket">Verim</div>
            <div className="deger num">{saatlik ? sayi(Math.round(saatlik)) : "—"}</div>
            <div className="alt">{urun.birim} / saat · {sureYazisi(dk)}</div>
          </div>
          <div className="kart kart-ic metrik">
            <div className="etiket">Birim maliyet (malzeme)</div>
            <div className="deger num">{tl(p.birim_maliyet)}</div>
            <div className="alt">
              toplam {tl(p.malzeme_maliyeti)}
              {fiyat ? ` · liste fiyatı ${tl(fiyat)} · marj ${yuzde(marj, 0)}` : " · liste fiyatı girilmemiş"}
            </div>
          </div>
        </div>
      )}

      <div className="izgara g-panel">
        <div className="kart">
          <div className="kart-bas">
            <h2>Tartılan malzemeler</h2>
            {recete ? (
              <Link href="/uretim/receteler">Reçete: {sayi(recete.cikti_miktari)} {urun.birim} için</Link>
            ) : (
              <Link href="/uretim/receteler">Reçete yok — ekle</Link>
            )}
          </div>
          {acik && yazabilir && (
            <div className="kart-ic" style={{ borderBottom: "1px solid var(--cizgi)" }}>
              <GirdiFormu partiId={p.id} malzemeler={malzemeler} />
            </div>
          )}
          {girdiler.length === 0 ? (
            <p className="bos">Henüz malzeme girilmedi. Her tartımı ayrı ayrı ekleyebilirsiniz.</p>
          ) : acik ? (
            <div className="tablo-kutu">
              <table className="kart-tablo">
                <tbody>
                  {girdiler.map((g) => {
                    const k = kart.get(g.stok_karti_id);
                    return (
                      <tr key={g.id}>
                        <td>
                          <b>{k?.ad}</b> <span className="soluk" style={{ fontSize: 12.5 }}>{saatTR(g.created_at)}</span>
                        </td>
                        <td data-label="Miktar" className="sag num">
                          <b>
                            {sayi(g.miktar)} {k?.birim}
                          </b>
                        </td>
                        <td data-label="" className="sag">
                          {yazabilir && <GirdiSilDugmesi partiId={p.id} girdiId={g.id} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {karsilastirmaIdleri.length > 0 && (!acik || recete) && (
            <div className="tablo-kutu" style={{ borderTop: acik ? "1px solid var(--cizgi)" : undefined }}>
              <table className="kart-tablo">
                <thead>
                  <tr>
                    <th>Malzeme</th>
                    <th className="sag">Verilen</th>
                    <th className="sag">{acik ? `Reçete (${sayi(recete?.cikti_miktari)} ${urun.birim})` : "Reçeteye göre"}</th>
                    {!acik && <th className="sag">Fark</th>}
                    {!acik && <th className="sag">Maliyet</th>}
                  </tr>
                </thead>
                <tbody>
                  {karsilastirmaIdleri.map((kid) => {
                    const k = kart.get(kid);
                    const verilen = toplamGirdi.get(kid) ?? 0;
                    const rm = receteMiktari.get(kid);
                    const beklenen = rm !== undefined ? (acik ? rm : olcek !== null ? rm * olcek : null) : null;
                    const fark = !acik && beklenen !== null && beklenen > 0 ? ((verilen - beklenen) / beklenen) * 100 : null;
                    const maliyet = girdiler.filter((g) => g.stok_karti_id === kid).reduce((t, g) => t + Number(g.maliyet ?? 0), 0);
                    const tahmini = girdiler.some((g) => g.stok_karti_id === kid && g.maliyet_tahmini);
                    return (
                      <tr key={kid}>
                        <td>
                          <b>{k?.ad}</b> <span className="kod">{k?.kod}</span>
                        </td>
                        <td data-label="Verilen" className="sag num">
                          {sayi(verilen)} {k?.birim}
                        </td>
                        <td data-label="Reçete" className="sag num soluk">
                          {beklenen !== null ? `${sayi(Math.round(beklenen * 1000) / 1000)} ${k?.birim}` : "reçetede yok"}
                        </td>
                        {!acik && (
                          <td data-label="Fark" className={`sag num${fark !== null && Math.abs(fark) >= 5 ? " amber" : ""}`}>
                            {fark !== null ? `${fark > 0 ? "+" : ""}${yuzde(fark)}` : ""}
                          </td>
                        )}
                        {!acik && (
                          <td data-label="Maliyet" className="sag num">
                            {tl(maliyet)}
                            {tahmini && <span className="amber"> *</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!acik && girdiler.some((g) => g.maliyet_tahmini) && (
            <p className="soluk" style={{ margin: 0, padding: "10px 20px 14px", fontSize: 13 }}>
              * Tartım anında stokta yeterli malzeme görünmüyordu; maliyet son alış fiyatından alındı. Alış faturası eksik
              girilmiş olabilir.
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {acik && yazabilir && (
            <div className="kart">
              <div className="kart-bas">
                <h2>Partiyi bitir</h2>
              </div>
              <div className="kart-ic">
                <PartiBitirFormu partiId={p.id} birim={urun.birim} varsayilanSkt={varsayilanSkt} />
              </div>
            </div>
          )}
          {!acik && p.durum !== "iptal" && (
            <div className="kart kart-ic">
              <b>Bu partide kaçak var mı?</b>
              <ul className="soluk" style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13.5, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Üretim firesi {yuzde(fire) || "%0"} (bozuk/atılan).</li>
                <li>
                  {recete
                    ? "Reçeteden %5'ten fazla sapan malzemeler sarı yanar."
                    : "Reçete girilirse her malzemenin reçeteden ne kadar saptığı burada görünür."}
                </li>
                <li>Depodaki gerçek miktar ile sistem stoğu arasındaki fark sayım modülüyle görünecek.</li>
              </ul>
            </div>
          )}
          {acik && iptalOlur && (
            <div className="kart kart-ic" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="soluk" style={{ fontSize: 13 }}>Yanlışlıkla açıldıysa</span>
              <IptalFormu tur="parti" id={p.id} etiket="Partiyi iptal et" />
            </div>
          )}
        </div>
      </div>

      {satirlar.length > 0 && (
        <MuhasebeKarsiligi satirlar={satirlar.filter((s) => s.fis_id === p.fis_id)} hesapAdlari={hesapAdlari} />
      )}
      {p.iptal_fis_id && (
        <MuhasebeKarsiligi baslik="İptal (ters kayıt)" etiket="iptal" satirlar={satirlar.filter((s) => s.fis_id === p.iptal_fis_id)} hesapAdlari={hesapAdlari} />
      )}

      <KayitIzi tablo="uretim_partileri" id={p.id} olusturan={p.olusturan} zaman={p.created_at} />

      {p.durum === "tamamlandi" && yazabilir && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            {iptalOlur
              ? "Yanlış girildiyse parti silinmez, iptal edilir: malzemeler stoğa geri döner, ürün stoktan çıkar, muhasebe kaydı ters kayıtla geri alınır."
              : IPTAL_YETKI_NOTU}
          </span>
          {iptalOlur && <IptalFormu tur="parti" id={p.id} etiket="Partiyi iptal et" />}
        </div>
      )}
    </>
  );
}
