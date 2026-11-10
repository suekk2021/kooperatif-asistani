"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { iadeKaydet } from "@/app/actions/iade";
import { FormMesaji } from "@/components/FormMesaji";
import { sayi, tl } from "@/lib/imece";

export type IadeEdilebilirKalem = {
  kalem_id: number;
  ad: string;
  kod: string;
  birim: string;
  satilan: number;
  kalan: number;
  net_birim: number;
  kdv_orani: number;
};

function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}
const yuvarla = (n: number) => Math.round(n * 100) / 100;

export function IadeFormu({
  tur,
  faturaId,
  kalemler,
  paraHesaplari,
  bugun,
}: {
  tur: "satis" | "alis";
  faturaId: string;
  kalemler: IadeEdilebilirKalem[];
  paraHesaplari: { id: string; ad: string; kod: string }[];
  bugun: string;
}) {
  const router = useRouter();
  const [miktarlar, setMiktarlar] = useState<Record<number, string>>({});
  const [stoga, setStoga] = useState<Record<number, boolean>>({});
  const [tarih, setTarih] = useState(bugun);
  const [belgeNo, setBelgeNo] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [odeme, setOdeme] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu & { id?: string }>({});
  const [bekliyor, baslat] = useTransition();

  const satirlar = kalemler.map((k) => {
    const miktar = sayiCoz(miktarlar[k.kalem_id] ?? "");
    const tutar = Number.isFinite(miktar) ? yuvarla(k.net_birim * miktar) : 0;
    const kdv = yuvarla((tutar * k.kdv_orani) / 100);
    const fazla = Number.isFinite(miktar) && miktar > k.kalan + 1e-9;
    return { k, miktar, tutar, kdv, fazla, gecersiz: !Number.isFinite(miktar) || miktar < 0 };
  });
  const ara = yuvarla(satirlar.reduce((t, s) => t + s.tutar, 0));
  const kdvToplam = yuvarla(satirlar.reduce((t, s) => t + s.kdv, 0));
  const genel = yuvarla(ara + kdvToplam);

  function kaydet() {
    const hatali = satirlar.find((s) => s.fazla || s.gecersiz);
    if (hatali) return setSonuc({ hata: `${hatali.k.ad}: en fazla ${sayi(hatali.k.kalan)} ${hatali.k.birim} iade edilebilir.` });
    if (genel <= 0) return setSonuc({ hata: "İade edilecek en az bir üründe miktar girin." });
    baslat(async () => {
      const s = await iadeKaydet({
        tur,
        fatura_id: faturaId,
        tarih,
        belge_no: belgeNo || undefined,
        aciklama: aciklama || undefined,
        odeme_hesap_id: odeme || null,
        kalemler: satirlar
          .filter((x) => x.miktar > 0)
          .map((x) => ({ kalem_id: x.k.kalem_id, miktar: x.miktar, stoga_al: tur === "satis" ? stoga[x.k.kalem_id] ?? true : undefined })),
      });
      setSonuc(s);
      if (s.id) router.push(`/iade/${s.id}`);
    });
  }

  return (
    <div className="kart kart-ic" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 150 }}>
          <label htmlFor="tarih">İade tarihi</label>
          <input id="tarih" type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)} />
        </div>
        <div className="alan">
          <label htmlFor="belge">İade faturası / irsaliye no</label>
          <input id="belge" value={belgeNo} onChange={(e) => setBelgeNo(e.target.value)} placeholder="Varsa" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {satirlar.map(({ k, tutar, fazla, gecersiz }) => (
          <div key={k.kalem_id} style={{ border: "1px solid var(--cizgi)", borderRadius: 12, padding: 12, opacity: k.kalan <= 0 ? 0.55 : 1 }}>
            <div className="form-satir" style={{ alignItems: "flex-end" }}>
              <div className="alan" style={{ flex: "2 1 220px" }}>
                <label>
                  {k.ad} <span className="kod">{k.kod}</span>
                </label>
                <span className="soluk" style={{ fontSize: 13 }}>
                  {tur === "satis" ? "Satılan" : "Alınan"} {sayi(k.satilan)} {k.birim} · iade edilebilir <b>{sayi(k.kalan)}</b> · birim {tl(k.net_birim)} (iskonto sonrası)
                </span>
              </div>
              <div className="alan" style={{ flex: "1 1 110px" }}>
                <label>İade miktarı ({k.birim})</label>
                <input
                  inputMode="decimal"
                  disabled={k.kalan <= 0}
                  value={miktarlar[k.kalem_id] ?? ""}
                  onChange={(e) => setMiktarlar((m) => ({ ...m, [k.kalem_id]: e.target.value }))}
                  placeholder="0"
                  style={fazla || gecersiz ? { borderColor: "var(--amber)" } : undefined}
                />
              </div>
              {tur === "satis" && (
                <div className="alan" style={{ flex: "1 1 200px" }}>
                  <label>Gelen ürün</label>
                  <div className="secim">
                    <button type="button" className={stoga[k.kalem_id] !== false ? "aktif" : undefined} onClick={() => setStoga((s) => ({ ...s, [k.kalem_id]: true }))}>
                      Sağlam · stoğa al
                    </button>
                    <button type="button" className={stoga[k.kalem_id] === false ? "aktif" : undefined} onClick={() => setStoga((s) => ({ ...s, [k.kalem_id]: false }))}>
                      Bozuk · imha
                    </button>
                  </div>
                </div>
              )}
              <div className="alan" style={{ flex: "0 1 110px", alignItems: "flex-end" }}>
                <label>Tutar</label>
                <b className="num" style={{ minHeight: 42, display: "flex", alignItems: "center" }}>
                  {tl(tutar)}
                </b>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, justifyContent: "space-between", alignItems: "flex-end" }}>
        <div className="alan" style={{ flex: "0 1 auto" }}>
          <label>{tur === "satis" ? "Müşteriye para iadesi" : "Tedarikçiden para iadesi"}</label>
          <div className="secim">
            <button type="button" className={!odeme ? "aktif" : undefined} onClick={() => setOdeme("")}>
              {tur === "satis" ? "Yok · borcundan düş" : "Yok · borcumuzdan düş"}
            </button>
            {paraHesaplari.map((h) => (
              <button key={h.id} type="button" className={odeme === h.id ? "aktif" : undefined} onClick={() => setOdeme(h.id)}>
                {h.ad}
              </button>
            ))}
          </div>
        </div>
        <div className="toplam">
          <span className="num soluk">
            Ara toplam {tl(ara)} · KDV {tl(kdvToplam)}
          </span>
          <span className="buyuk num">{tl(genel)}</span>
        </div>
      </div>

      <div className="alan">
        <label htmlFor="aciklama">İade nedeni / not</label>
        <input id="aciklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn: soğuk zincir kırılmış, paket yırtık" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
        <button type="button" className="btn btn-ana" disabled={bekliyor} onClick={kaydet}>
          {bekliyor ? "Kaydediliyor…" : "İadeyi kaydet"}
        </button>
      </div>
    </div>
  );
}
