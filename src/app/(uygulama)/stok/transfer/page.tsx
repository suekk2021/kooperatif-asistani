import Link from "next/link";
import { TransferFormu } from "@/components/stok/TransferFormu";
import { depoMiktarlari, gorevliDepolar } from "@/lib/depo";
import { tarihTR } from "@/lib/imece";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { islemIzni, oturum } from "@/lib/yetki";
import type { Depo, StokDepoDurumu, StokKarti } from "@/types/database";

type Transfer = { id: string; transfer_no: number; tarih: string; kaynak_depo: number; hedef_depo: number; aciklama: string | null; durum: string };

export default async function TransferPage() {
  const supabase = await createClient();
  const [{ data: depoVeri }, { data: kartVeri }, { data: durumVeri }, { data: transferVeri }, { data: kalemVeri }, kim] = await Promise.all([
    supabase.from("depolar").select("*"),
    supabase.from("stok_kartlari").select("id, ad, kod, birim").eq("aktif", true).is("birlestirildigi_kart", null).order("kod"),
    supabase.from("stok_depo_durumu").select("*"),
    supabase.from("depo_transferleri").select("*").order("transfer_no", { ascending: false }).limit(30),
    supabase.from("depo_transfer_kalemleri").select("transfer_id"),
    oturum(),
  ]);
  const depolar = gorevliDepolar((depoVeri ?? []) as Depo[]);
  const depoAdi = new Map(((depoVeri ?? []) as Depo[]).map((d) => [d.id, d.ad]));
  const transferler = (transferVeri ?? []) as Transfer[];
  const kalemSayisi = new Map<string, number>();
  for (const k of (kalemVeri ?? []) as { transfer_id: string }[]) kalemSayisi.set(k.transfer_id, (kalemSayisi.get(k.transfer_id) ?? 0) + 1);

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Depolar arası transfer</h1>
          <p>Hammadde deposundan Üretim deposuna malzeme verin. Üretimde reçete malzemeleri yalnız Üretim deposundan düşer.</p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok" className="btn btn-cizgi">
            Stok
          </Link>
        </div>
      </div>

      {kim && islemIzni(kim.rol, "transfer") ? (
        depolar.length >= 2 ? (
          <TransferFormu
            depolar={depolar}
            malzemeler={(kartVeri ?? []) as Pick<StokKarti, "id" | "ad" | "kod" | "birim">[]}
            mevcut={depoMiktarlari((durumVeri ?? []) as StokDepoDurumu[])}
            bugun={bugunIstanbul()}
          />
        ) : (
          <p className="yapim">Depolar henüz tanımlı değil.</p>
        )
      ) : (
        <p className="not">Transfer girme yetkiniz yok (depo görevlisi, ön muhasebe ve kooperatif yönetimi girer); aşağıda geçmiş transferleri görebilirsiniz.</p>
      )}
      <p className="not">
        Transfer malın değerini değiştirmez, yalnız yerini değiştirir; muhasebe fişi oluşmaz. Çıkış deposunda yeterli mal yoksa
        da kaydedilir, o depo eksiye düşer.
      </p>

      {transferler.length > 0 && (
        <div className="kart" style={{ marginTop: 16 }}>
          <div className="kart-bas">
            <h2>Geçmiş transferler</h2>
          </div>
          <div className="tablo-kutu">
            <table className="kart-tablo liste-tablo">
              <thead>
                <tr>
                  <th>Transfer</th>
                  <th>Yön</th>
                  <th className="sag">Kalem</th>
                </tr>
              </thead>
              <tbody>
                {transferler.map((t) => (
                  <tr key={t.id} style={t.durum === "iptal" ? { opacity: 0.55 } : undefined}>
                    <td className="liste-baslik">
                      <Link className="satir-link" href={`/stok/transfer/${t.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                        #{t.transfer_no} · {tarihTR(t.tarih)}
                      </Link>
                      {t.durum === "iptal" && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                      {t.aciklama && <div className="soluk" style={{ fontSize: 12.5 }}>{t.aciklama}</div>}
                    </td>
                    <td data-label="Yön">
                      {depoAdi.get(t.kaynak_depo)} → {depoAdi.get(t.hedef_depo)}
                    </td>
                    <td data-label="Kalem" className="sag num">
                      {kalemSayisi.get(t.id) ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
