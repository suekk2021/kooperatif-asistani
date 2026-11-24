import Link from "next/link";
import { notFound } from "next/navigation";
import { IptalFormu } from "@/components/IptalFormu";
import { KayitIzi } from "@/components/KayitIzi";
import { kodGoster, sayi, tarihTR, tl } from "@/lib/imece";
import { maliyetGorurMu } from "@/lib/roller";
import { createClient } from "@/lib/supabase/server";
import { IPTAL_YETKI_NOTU, iptalEdebilir, islemIzni, oturum } from "@/lib/yetki";
import type { Depo, StokKarti } from "@/types/database";

type Transfer = {
  id: string;
  transfer_no: number;
  tarih: string;
  kaynak_depo: number;
  hedef_depo: number;
  aciklama: string | null;
  durum: string;
  iptal_nedeni: string | null;
  olusturan: string | null;
  created_at: string;
};
type Kalem = { id: number; stok_karti_id: string; miktar: number; birim_maliyet: number };

export default async function TransferDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: veri } = await supabase.from("depo_transferleri").select("*").eq("id", id).maybeSingle();
  if (!veri) notFound();
  const t = veri as Transfer;

  const [{ data: kalemVeri }, { data: depoVeri }, kim] = await Promise.all([
    supabase.from("depo_transfer_kalemleri").select("*").eq("transfer_id", id).order("id"),
    supabase.from("depolar").select("*"),
    oturum(),
  ]);
  const kalemler = (kalemVeri ?? []) as Kalem[];
  const { data: kartVeri } = await supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", kalemler.map((k) => k.stok_karti_id));
  const kart = new Map(((kartVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim">[]).map((k) => [k.id, k]));
  const depoAdi = new Map(((depoVeri ?? []) as Depo[]).map((d) => [d.id, d.ad]));
  const iptal = t.durum === "iptal";
  const maliyetGorur = maliyetGorurMu(kim?.rol);
  const toplam = kalemler.reduce((s, k) => s + Number(k.miktar) * Number(k.birim_maliyet), 0);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            Transfer #{t.transfer_no} {iptal && <span className="etk e-kirmizi">iptal</span>}
          </h1>
          <p>
            {tarihTR(t.tarih)} · <b>{depoAdi.get(t.kaynak_depo)}</b> → <b>{depoAdi.get(t.hedef_depo)}</b>
            {t.aciklama && ` · ${t.aciklama}`}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok/transfer" className="btn btn-cizgi">
            Transferler
          </Link>
        </div>
      </div>

      {iptal && (
        <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
          Bu transfer iptal edildi: <b>{t.iptal_nedeni}</b>. Mallar çıktığı depoya döndü.
        </p>
      )}

      <div className="kart">
        <div className="tablo-kutu">
          <table className="kart-tablo liste-tablo">
            <thead>
              <tr>
                <th>Malzeme</th>
                <th className="sag">Miktar</th>
                {maliyetGorur && <th className="sag">Birim maliyet</th>}
                {maliyetGorur && <th className="sag">Tutar</th>}
              </tr>
            </thead>
            <tbody>
              {kalemler.map((k) => {
                const c = kart.get(k.stok_karti_id);
                return (
                  <tr key={k.id}>
                    <td className="liste-baslik">
                      <Link href={`/stok/${k.stok_karti_id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        {c?.ad}
                      </Link>{" "}
                      <span className="kod">{kodGoster(c?.kod)}</span>
                    </td>
                    <td data-label="Miktar" className="sag num ana-deger">
                      {sayi(k.miktar)} {c?.birim}
                    </td>
                    {maliyetGorur && (
                      <td data-label="Birim maliyet" className="sag num">
                        {tl(k.birim_maliyet)}
                      </td>
                    )}
                    {maliyetGorur && (
                      <td data-label="Tutar" className="sag num">
                        {tl(Number(k.miktar) * Number(k.birim_maliyet))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {maliyetGorur && (
          <div className="kart-ic soluk num" style={{ borderTop: "1px solid var(--cizgi)", textAlign: "right" }}>
            Taşınan değer <b>{tl(toplam)}</b> (ortalama maliyetle; toplam stok değeri değişmez)
          </div>
        )}
      </div>

      <p className="not">Transfer muhasebe fişi oluşturmaz: mal aynı stok hesabında kalır, yalnız deposu değişir.</p>

      <KayitIzi tablo="depo_transferleri" id={t.id} olusturan={t.olusturan} zaman={t.created_at} />

      {!iptal && kim && islemIzni(kim.rol, "transfer") && (
        <div className="kart kart-ic" style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="soluk" style={{ maxWidth: 560 }}>
            {iptalEdebilir(kim, t)
              ? "Transfer yanlış girildiyse iptal edin: mallar çıktığı depoya döner, sonra doğrusunu yeniden girin."
              : IPTAL_YETKI_NOTU}
          </span>
          {iptalEdebilir(kim, t) && <IptalFormu tur="transfer" id={t.id} etiket="Transferi iptal et" />}
        </div>
      )}
    </>
  );
}
