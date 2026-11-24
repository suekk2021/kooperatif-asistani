"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { transferKaydet } from "@/app/actions/transfer";
import { FormMesaji } from "@/components/FormMesaji";
import { MalzemeSecici } from "@/components/uretim/ReceteFormu";
import { kodGoster, sayi, trSayi } from "@/lib/imece";
import type { Depo, StokKarti } from "@/types/database";

type KartOzeti = Pick<StokKarti, "id" | "ad" | "kod" | "birim">;
type Satir = { anahtar: number; ad: string; miktar: string };

const kucuk = (s: string) => s.toLocaleLowerCase("tr-TR").trim();
let sayac = 0;

export function TransferFormu({
  depolar,
  malzemeler,
  mevcut,
  bugun,
}: {
  depolar: Depo[];
  malzemeler: KartOzeti[];
  /** kart id → depo id → miktar */
  mevcut: Record<string, Record<number, number>>;
  bugun: string;
}) {
  const router = useRouter();
  const adla = new Map(malzemeler.map((m) => [kucuk(m.ad), m]));
  const varsayilan = (g: string) => depolar.find((d) => d.gorev === g)?.id ?? depolar[0]?.id ?? 0;
  const [kaynak, setKaynak] = useState(varsayilan("hammadde"));
  const [hedef, setHedef] = useState(varsayilan("uretim"));
  const [tarih, setTarih] = useState(bugun);
  const [aciklama, setAciklama] = useState("");
  const [satirlar, setSatirlar] = useState<Satir[]>([{ anahtar: ++sayac, ad: "", miktar: "" }]);
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  function guncelle(anahtar: number, d: Partial<Satir>) {
    setSatirlar((ss) => ss.map((s) => (s.anahtar === anahtar ? { ...s, ...d } : s)));
  }

  const dolu = satirlar.filter((s) => s.ad.trim() || s.miktar.trim());
  const eksiyeDusen = dolu.filter((s) => {
    const k = adla.get(kucuk(s.ad));
    const m = trSayi(s.miktar.trim());
    return k && Number.isFinite(m) && m > (mevcut[k.id]?.[kaynak] ?? 0);
  });

  function kaydet() {
    if (kaynak === hedef) return setSonuc({ hata: "Çıkış ve giriş deposu aynı olamaz." });
    if (!dolu.length) return setSonuc({ hata: "Hiçbir malzeme girilmedi." });
    for (const [i, s] of dolu.entries()) {
      if (!adla.get(kucuk(s.ad))) return setSonuc({ hata: `${i + 1}. satırdaki malzeme stok kartlarında yok.` });
      const m = trSayi(s.miktar.trim());
      if (!(m > 0)) return setSonuc({ hata: `${s.ad}: miktar sıfırdan büyük olmalı.` });
    }
    baslat(async () => {
      const r = await transferKaydet({
        tarih,
        kaynak_depo: kaynak,
        hedef_depo: hedef,
        aciklama: aciklama || undefined,
        kalemler: dolu.map((s) => ({ stok_karti_id: adla.get(kucuk(s.ad))!.id, miktar: trSayi(s.miktar.trim()) })),
      });
      setSonuc(r.id ? {} : r);
      if (r.id) router.push(`/stok/transfer/${r.id}`);
    });
  }

  const miktarId = (sira: number) => `transfer-miktar-${sira}`;
  const depoAdi = (id: number) => depolar.find((d) => d.id === id)?.ad ?? "";

  return (
    <div className="kart">
      <div className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-satir">
          <div className="alan">
            <label htmlFor="kaynak">Çıkış deposu</label>
            <select id="kaynak" value={kaynak} onChange={(e) => setKaynak(Number(e.target.value))}>
              {depolar.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="hedef">Giriş deposu</label>
            <select id="hedef" value={hedef} onChange={(e) => setHedef(Number(e.target.value))}>
              {depolar.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="tarih">Tarih</label>
            <input id="tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
          </div>
          <div className="alan" style={{ flex: "2 1 220px" }}>
            <label htmlFor="aciklama">Not</label>
            <input id="aciklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Pazartesi mantı üretimi için…" />
          </div>
        </div>

        <div className="rc-tablo rc-maliyetli">
          <div className="rc-satir rc-bas">
            <span className="rc-solkolon">
              <span className="rc-sira">#</span>
              <span className="rc-kodbas">Kod</span>
            </span>
            <span>Malzeme</span>
            <span style={{ textAlign: "right" }}>Miktar</span>
            <span>Birim</span>
            <span className="rc-tutar">{depoAdi(kaynak)}da</span>
            <span />
          </div>
          {satirlar.map((s, i) => {
            const kart = adla.get(kucuk(s.ad));
            const eldeki = kart ? (mevcut[kart.id]?.[kaynak] ?? 0) : null;
            const m = trSayi(s.miktar.trim());
            const yetmez = kart && eldeki !== null && Number.isFinite(m) && m > eldeki;
            return (
              <div key={s.anahtar} className="rc-satir">
                <span className="rc-solkolon">
                  <span className="rc-sira">{i + 1}</span>
                  <span className="rc-kod">{kart ? kodGoster(kart.kod) : ""}</span>
                </span>
                <MalzemeSecici
                  deger={s.ad}
                  malzemeler={malzemeler}
                  degisti={(ad) => guncelle(s.anahtar, { ad })}
                  secildi={() => document.getElementById(miktarId(i))?.focus()}
                />
                <input
                  id={miktarId(i)}
                  className="rc-miktar"
                  inputMode="decimal"
                  aria-label={`${i + 1}. malzeme miktarı`}
                  value={s.miktar}
                  onChange={(e) => guncelle(s.anahtar, { miktar: e.target.value })}
                />
                <span className="rc-birim">{kart?.birim ?? ""}</span>
                <span className={`rc-tutar num${yetmez ? " kirmizi" : ""}`} title="Çıkış deposunda şu an kayıtlı miktar">
                  {eldeki !== null ? sayi(eldeki) : ""}
                </span>
                <button
                  type="button"
                  className="rc-sil"
                  title="Satırı sil"
                  aria-label={`${i + 1}. satırı sil`}
                  onClick={() => setSatirlar((ss) => (ss.length > 1 ? ss.filter((x) => x.anahtar !== s.anahtar) : ss))}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {eksiyeDusen.length > 0 && (
          <p className="amber" style={{ margin: 0, fontSize: 13.5 }}>
            {eksiyeDusen.map((s) => s.ad).join(", ")}: {depoAdi(kaynak)}da kayıtlı miktardan fazla. Kaydedilirse o depo eksiye
            düşer; mal gerçekten varsa önce alış ya da sayım eksik girilmiş olabilir.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn btn-cizgi" onClick={() => setSatirlar((ss) => [...ss, { anahtar: ++sayac, ad: "", miktar: "" }])}>
            + Malzeme
          </button>
          <button type="button" className="btn btn-ana" onClick={kaydet} disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Transferi kaydet"}
          </button>
          <FormMesaji sonuc={sonuc} />
        </div>
      </div>
    </div>
  );
}
