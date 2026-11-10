"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { paraHareketiKaydet, paraHesabiAc } from "@/app/actions/kasa";
import { FormMesaji } from "@/components/FormMesaji";
import { PARA_HESABI_TURU_ADI } from "@/lib/imece";
import type { Cari, KasaBankaHesabi, ParaHesabiTuru } from "@/types/database";

type Sekme = "tahsilat" | "odeme" | "virman" | "hesap";

const SEKMELER: { id: Sekme; ad: string; aciklama: string }[] = [
  { id: "tahsilat", ad: "+ Tahsilat", aciklama: "Müşteriden para geldi" },
  { id: "odeme", ad: "Ödeme", aciklama: "Tedarikçiye para ödendi" },
  { id: "virman", ad: "Virman", aciklama: "Hesaplar arası: POS → banka, kasadan bankaya, kart borcu ödeme" },
  { id: "hesap", ad: "Yeni hesap", aciklama: "Kasa, banka, POS veya şirket kredi kartı aç" },
];

export function ParaIslemleri({
  hesaplar,
  cariler,
  bugun,
  baslangic,
}: {
  hesaplar: KasaBankaHesabi[];
  cariler: Pick<Cari, "id" | "unvan" | "tur">[];
  bugun: string;
  /** Alt çubuktaki ＋ düğmesinden gelince ilgili form açık gelir (?islem=tahsilat). */
  baslangic?: string;
}) {
  const istenen = SEKMELER.find((s) => s.id === baslangic)?.id ?? null;
  const [sekme, setSekme] = useState<Sekme | null>(istenen ?? (hesaplar.length <= 1 ? "hesap" : null));
  const [yeniTur, setYeniTur] = useState<ParaHesabiTuru>("banka");
  const formRef = useRef<HTMLFormElement>(null);

  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => {
    return fd.get("islem") === "hesap" ? paraHesabiAc(fd) : paraHareketiKaydet(fd);
  }, {});

  useEffect(() => {
    if (sonuc.basarili) formRef.current?.reset();
  }, [sonuc]);

  // Tahsilat: kasa/banka/POS'a para girer. Ödeme: kasa/banka/kredi kartından çıkar.
  const girisHesaplari = hesaplar.filter((h) => h.tur !== "kredi_karti");
  const cikisHesaplari = hesaplar.filter((h) => h.tur !== "pos");
  const bankalar = hesaplar.filter((h) => h.tur === "banka");
  const secenek = (h: KasaBankaHesabi) => (
    <option key={h.id} value={h.id}>
      {h.ad} ({h.kod})
    </option>
  );
  const cariListesi = (tercih: "musteri" | "tedarikci") =>
    [...cariler].sort((a, b) => (a.tur === tercih ? 0 : 1) - (b.tur === tercih ? 0 : 1) || a.unvan.localeCompare(b.unvan, "tr"));
  const aktif = SEKMELER.find((s) => s.id === sekme);

  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart-ic" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`btn ${sekme === s.id ? "btn-ana" : "btn-cizgi"}`}
            onClick={() => setSekme(sekme === s.id ? null : s.id)}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {sekme && aktif && (
        <form ref={formRef} action={action} className="kart-ic" style={{ borderTop: "1px solid var(--cizgi)" }} key={sekme}>
          <p className="soluk" style={{ margin: "0 0 12px" }}>
            {aktif.aciklama}
          </p>
          <input type="hidden" name="islem" value={sekme} />

          {sekme === "hesap" ? (
            <>
              <div className="form-satir">
                <div className="alan" style={{ flexBasis: 150, flexGrow: 0 }}>
                  <label htmlFor="tur">Tür</label>
                  <select id="tur" name="tur" value={yeniTur} onChange={(e) => setYeniTur(e.target.value as ParaHesabiTuru)}>
                    {(Object.keys(PARA_HESABI_TURU_ADI) as ParaHesabiTuru[]).map((t) => (
                      <option key={t} value={t}>
                        {PARA_HESABI_TURU_ADI[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="alan" style={{ flexBasis: 260 }}>
                  <label htmlFor="ad">Hesap adı *</label>
                  <input
                    id="ad"
                    name="ad"
                    required
                    placeholder={
                      { kasa: "Şube kasası", banka: "Ziraat vadesiz", pos: "Ziraat POS", kredi_karti: "Ziraat şirket kartı" }[yeniTur]
                    }
                  />
                </div>
                {yeniTur !== "kasa" && (
                  <div className="alan">
                    <label htmlFor="banka_adi">Banka</label>
                    <input id="banka_adi" name="banka_adi" placeholder="Ziraat" />
                  </div>
                )}
              </div>
              {yeniTur === "banka" && (
                <div className="form-satir" style={{ marginTop: 12 }}>
                  <div className="alan">
                    <label htmlFor="iban">IBAN</label>
                    <input id="iban" name="iban" placeholder="TR.." />
                  </div>
                </div>
              )}
              {yeniTur === "pos" && (
                <div className="form-satir" style={{ marginTop: 12 }}>
                  <div className="alan">
                    <label htmlFor="bagli_banka_id">Para hangi bankaya geçiyor?</label>
                    <select id="bagli_banka_id" name="bagli_banka_id" defaultValue="">
                      <option value="">—</option>
                      {bankalar.map(secenek)}
                    </select>
                  </div>
                  <div className="alan" style={{ flexBasis: 150, flexGrow: 0 }}>
                    <label htmlFor="komisyon_orani">Komisyon %</label>
                    <input id="komisyon_orani" name="komisyon_orani" inputMode="decimal" placeholder="2" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <input type="hidden" name="tur" value={sekme} />
              <div className="form-satir">
                <div className="alan" style={{ flexBasis: 150, flexGrow: 0 }}>
                  <label htmlFor="tarih">Tarih</label>
                  <input id="tarih" name="tarih" type="date" defaultValue={bugun} required />
                </div>
                <div className="alan">
                  <label htmlFor="hesap_id">
                    {sekme === "tahsilat" ? "Para nereye girdi?" : sekme === "odeme" ? "Para nereden çıktı?" : "Kaynak hesap"}
                  </label>
                  <select id="hesap_id" name="hesap_id" required defaultValue="">
                    <option value="" disabled>
                      Seçin
                    </option>
                    {(sekme === "tahsilat" ? girisHesaplari : sekme === "odeme" ? cikisHesaplari : hesaplar).map(secenek)}
                  </select>
                </div>
                {sekme === "virman" ? (
                  <div className="alan">
                    <label htmlFor="karsi_hesap_id">Hedef hesap</label>
                    <select id="karsi_hesap_id" name="karsi_hesap_id" required defaultValue="">
                      <option value="" disabled>
                        Seçin
                      </option>
                      {hesaplar.filter((h) => h.tur !== "pos").map(secenek)}
                    </select>
                  </div>
                ) : (
                  <div className="alan">
                    <label htmlFor="cari_id">{sekme === "tahsilat" ? "Kimden?" : "Kime?"}</label>
                    <select id="cari_id" name="cari_id" required defaultValue="">
                      <option value="" disabled>
                        Seçin
                      </option>
                      {cariListesi(sekme === "tahsilat" ? "musteri" : "tedarikci").map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.unvan} · {c.tur === "musteri" ? "müşteri" : "tedarikçi"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-satir" style={{ marginTop: 12 }}>
                <div className="alan" style={{ flexBasis: 160, flexGrow: 0 }}>
                  <label htmlFor="tutar">Tutar (₺) *</label>
                  <input id="tutar" name="tutar" inputMode="decimal" required placeholder="0,00" />
                </div>
                {sekme === "virman" && (
                  <div className="alan" style={{ flexBasis: 160, flexGrow: 0 }}>
                    <label htmlFor="komisyon">Komisyon (₺)</label>
                    <input id="komisyon" name="komisyon" inputMode="decimal" placeholder="POS ise" />
                  </div>
                )}
                <div className="alan" style={{ flexBasis: 140, flexGrow: 0 }}>
                  <label htmlFor="belge_no">Belge no</label>
                  <input id="belge_no" name="belge_no" placeholder="Dekont / makbuz" />
                </div>
                <div className="alan">
                  <label htmlFor="aciklama">Açıklama</label>
                  <input id="aciklama" name="aciklama" />
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-ana" disabled={bekliyor}>
              {bekliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
          <FormMesaji sonuc={sonuc} />
        </form>
      )}
    </div>
  );
}
