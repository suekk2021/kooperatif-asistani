import Link from "next/link";
import { SayimFormu, type SayimSatiri } from "@/components/stok/SayimFormu";
import { tarihTR, tl } from "@/lib/imece";
import { duzenlemeYetkisiVarMi, mevcutRol } from "@/lib/rol";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { depoMiktarlari, gorevliDepolar } from "@/lib/depo";
import type { Depo, StokDepoDurumu, StokDurumu, StokKarti } from "@/types/database";

type Sayim = { id: string; sayim_no: number; tarih: string; sayan: string | null; aciklama: string | null; durum: string; depo_id: number | null };

export default async function SayimPage() {
  const supabase = await createClient();
  const [{ data: kartVeri }, { data: durumVeri }, { data: depoDurumVeri }, { data: depoVeri }, { data: sayimVeri }, { data: kalemVeri }, rol] = await Promise.all([
    supabase.from("stok_kartlari").select("*").eq("aktif", true).is("birlestirildigi_kart", null).order("tur").order("ad"),
    supabase.from("stok_durumu").select("*"),
    supabase.from("stok_depo_durumu").select("*"),
    supabase.from("depolar").select("*"),
    supabase.from("sayimlar").select("*").order("sayim_no", { ascending: false }).limit(30),
    supabase.from("sayim_kalemleri").select("sayim_id, fark_tutari"),
    mevcutRol(),
  ]);
  const durum = new Map(((durumVeri ?? []) as StokDurumu[]).map((d) => [d.stok_karti_id, d]));
  const depoMiktar = depoMiktarlari((depoDurumVeri ?? []) as StokDepoDurumu[]);
  const depolar = gorevliDepolar((depoVeri ?? []) as Depo[]);
  const depoAdi = new Map(((depoVeri ?? []) as Depo[]).map((d) => [d.id, d.ad]));
  const satirlar: SayimSatiri[] = ((kartVeri ?? []) as StokKarti[]).map((k) => ({
    id: k.id,
    ad: k.ad,
    kod: k.kod,
    tur: k.tur,
    birim: k.birim,
    sistem: depoMiktar[k.id] ?? {},
    ortalama: Number(durum.get(k.id)?.ortalama_maliyet ?? 0),
  }));
  const sayimlar = (sayimVeri ?? []) as Sayim[];
  const farklar = new Map<string, { eksik: number; fazla: number }>();
  for (const k of (kalemVeri ?? []) as { sayim_id: string; fark_tutari: number }[]) {
    const f = farklar.get(k.sayim_id) ?? { eksik: 0, fazla: 0 };
    if (Number(k.fark_tutari) < 0) f.eksik += -Number(k.fark_tutari);
    else f.fazla += Number(k.fark_tutari);
    farklar.set(k.sayim_id, f);
  }

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>Stok sayımı</h1>
          <p>Depoda gerçekten olan miktarı girin; sistemle arasındaki fark &quot;açıklanamayan fark&quot; olarak kaydedilir</p>
        </div>
        <div className="ust-araclar">
          <Link href="/stok" className="btn btn-cizgi">
            Stok
          </Link>
        </div>
      </div>

      {duzenlemeYetkisiVarMi(rol) ? (
        satirlar.length ? (
          <SayimFormu satirlar={satirlar} depolar={depolar} bugun={bugunIstanbul()} />
        ) : (
          <p className="yapim">Sayılacak stok kartı yok.</p>
        )
      ) : (
        <p className="not">Sayım girme yetkiniz yok; aşağıda geçmiş sayımları görebilirsiniz.</p>
      )}
      <p className="not">
        Önce hangi depoyu saydığınızı seçin; her depo ayrı sayılır. Sadece saydığınız kartlara miktar yazın; boş bırakılan kart &quot;sayılmadı&quot; sayılır ve değişmez. Eksik çıkan mal 197,
        fazla çıkan 397 hesabına yazılır; muhasebeci araştırıp kapatır. Program açılışından önceki ilk sayım için Açılış
        ekranını kullanın.
      </p>

      {sayimlar.length > 0 && (
        <div className="kart" style={{ marginTop: 16 }}>
          <div className="kart-bas">
            <h2>Geçmiş sayımlar</h2>
          </div>
          <div className="tablo-kutu">
            <table className="kart-tablo">
              <thead>
                <tr>
                  <th>Sayım</th>
                  <th>Sayan</th>
                  <th className="sag">Eksik</th>
                  <th className="sag">Fazla</th>
                </tr>
              </thead>
              <tbody>
                {sayimlar.map((s) => {
                  const f = farklar.get(s.id) ?? { eksik: 0, fazla: 0 };
                  return (
                    <tr key={s.id} style={s.durum === "iptal" ? { opacity: 0.55 } : undefined}>
                      <td>
                        <Link href={`/stok/sayim/${s.id}`} style={{ fontWeight: 700, color: "inherit" }}>
                          #{s.sayim_no} · {tarihTR(s.tarih)}
                        </Link>
                        {s.depo_id && <span className="soluk"> · {depoAdi.get(s.depo_id)}</span>}
                        {s.durum === "iptal" && <span className="etk e-kirmizi" style={{ marginLeft: 6 }}>iptal</span>}
                        {s.aciklama && <div className="soluk" style={{ fontSize: 12.5 }}>{s.aciklama}</div>}
                      </td>
                      <td data-label="Sayan">{s.sayan}</td>
                      <td data-label="Eksik" className={`sag num${f.eksik ? " kirmizi" : ""}`}>
                        {f.eksik ? tl(f.eksik) : "—"}
                      </td>
                      <td data-label="Fazla" className="sag num">
                        {f.fazla ? tl(f.fazla) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
