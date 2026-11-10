"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { evrakIslem, evrakKaydet } from "@/app/actions/cek-senet";
import { FormMesaji } from "@/components/FormMesaji";

type Cari = { id: string; unvan: string; kod: string; tur: "musteri" | "tedarikci" };
type Hesap = { id: string; ad: string; kod: string };

function sayiCoz(s: string): number {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
}

export function YeniEvrakFormu({ cariler, bugun }: { cariler: Cari[]; bugun: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [yon, setYon] = useState<"alinan" | "verilen">("alinan");
  const [tur, setTur] = useState<"cek" | "senet">("cek");
  const [cariId, setCariId] = useState("");
  const [tutar, setTutar] = useState("");
  const [vade, setVade] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [seri, setSeri] = useState("");
  const [banka, setBanka] = useState("");
  const [borclu, setBorclu] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu & { id?: string }>({});
  const [bekliyor, baslat] = useTransition();

  const uygunCariler = cariler.filter((c) => c.tur === (yon === "alinan" ? "musteri" : "tedarikci"));

  if (!acik) {
    return (
      <button type="button" className="btn btn-ana" onClick={() => setAcik(true)}>
        + Çek / senet gir
      </button>
    );
  }

  function kaydet() {
    const t = sayiCoz(tutar);
    if (!cariId) return setSonuc({ hata: yon === "alinan" ? "Müşteriyi seçin." : "Tedarikçiyi seçin." });
    if (!(t > 0)) return setSonuc({ hata: "Tutarı girin." });
    if (!vade) return setSonuc({ hata: "Vade tarihini girin." });
    baslat(async () => {
      const s = await evrakKaydet({ tur, yon, cari_id: cariId, tutar: t, vade, tarih, seri_no: seri, banka, borclu, aciklama });
      setSonuc(s);
      if (s.id) router.push(`/cek-senet/${s.id}`);
    });
  }

  return (
    <div className="kart kart-ic" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16, width: "100%" }}>
      <div className="form-satir">
        <div className="alan" style={{ flex: "0 1 auto" }}>
          <label>Kimden / kime</label>
          <div className="secim">
            <button type="button" className={yon === "alinan" ? "aktif" : undefined} onClick={() => { setYon("alinan"); setCariId(""); }}>
              Müşteriden aldık
            </button>
            <button type="button" className={yon === "verilen" ? "aktif" : undefined} onClick={() => { setYon("verilen"); setCariId(""); }}>
              Tedarikçiye verdik
            </button>
          </div>
        </div>
        <div className="alan" style={{ flex: "0 1 auto" }}>
          <label>Evrak</label>
          <div className="secim">
            <button type="button" className={tur === "cek" ? "aktif" : undefined} onClick={() => setTur("cek")}>
              Çek
            </button>
            <button type="button" className={tur === "senet" ? "aktif" : undefined} onClick={() => setTur("senet")}>
              Senet
            </button>
          </div>
        </div>
      </div>
      <div className="form-satir">
        <div className="alan" style={{ flex: "2 1 240px" }}>
          <label htmlFor="ev-cari">{yon === "alinan" ? "Müşteri *" : "Tedarikçi *"}</label>
          <select id="ev-cari" value={cariId} onChange={(e) => setCariId(e.target.value)}>
            <option value="">Seçin</option>
            {uygunCariler.map((c) => (
              <option key={c.id} value={c.id}>
                {c.unvan} ({c.kod})
              </option>
            ))}
          </select>
        </div>
        <div className="alan" style={{ flex: "1 1 140px" }}>
          <label htmlFor="ev-tutar">Tutar (₺) *</label>
          <input id="ev-tutar" inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder="0,00" />
        </div>
        <div className="alan" style={{ flexBasis: 150 }}>
          <label htmlFor="ev-vade">Vade *</label>
          <input id="ev-vade" type="date" value={vade} onChange={(e) => setVade(e.target.value)} />
        </div>
        <div className="alan" style={{ flexBasis: 150 }}>
          <label htmlFor="ev-tarih">{yon === "alinan" ? "Alındığı tarih" : "Verildiği tarih"}</label>
          <input id="ev-tarih" type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)} />
        </div>
      </div>
      <div className="form-satir">
        <div className="alan">
          <label htmlFor="ev-seri">{tur === "cek" ? "Çek no" : "Senet no"}</label>
          <input id="ev-seri" value={seri} onChange={(e) => setSeri(e.target.value)} placeholder="İsteğe bağlı" />
        </div>
        {tur === "cek" && (
          <div className="alan">
            <label htmlFor="ev-banka">Banka / şube</label>
            <input id="ev-banka" value={banka} onChange={(e) => setBanka(e.target.value)} placeholder="Ziraat Suluova" />
          </div>
        )}
        {yon === "alinan" && (
          <div className="alan">
            <label htmlFor="ev-borclu">{tur === "cek" ? "Keşideci (çeki yazan)" : "Borçlu"}</label>
            <input id="ev-borclu" value={borclu} onChange={(e) => setBorclu(e.target.value)} placeholder="Müşteriden farklıysa" />
          </div>
        )}
        <div className="alan" style={{ flex: "2 1 220px" }}>
          <label htmlFor="ev-not">Not</label>
          <input id="ev-not" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="İsteğe bağlı" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
        <button type="button" className="btn btn-cizgi" onClick={() => setAcik(false)}>
          Vazgeç
        </button>
        <button type="button" className="btn btn-ana" disabled={bekliyor} onClick={kaydet}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

const ISLEM_ADI = { tahsil: "Tahsil et", ciro: "Tedarikçiye ciro et", karsiliksiz: "Karşılıksız / protestolu", odeme: "Ödendi olarak işle" } as const;

export function EvrakIslemFormu({
  evrakId,
  islemler,
  hesaplar,
  tedarikciler,
  bugun,
}: {
  evrakId: string;
  islemler: (keyof typeof ISLEM_ADI)[];
  hesaplar: Hesap[];
  tedarikciler: Cari[];
  bugun: string;
}) {
  const [islem, setIslem] = useState<keyof typeof ISLEM_ADI | "">("");
  const [tarih, setTarih] = useState(bugun);
  const [hesap, setHesap] = useState("");
  const [cari, setCari] = useState("");
  const [sonuc, setSonuc] = useState<FormSonucu>({});
  const [bekliyor, baslat] = useTransition();

  function kaydet() {
    if (!islem) return;
    if ((islem === "tahsil" || islem === "odeme") && !hesap) return setSonuc({ hata: "Kasa veya banka hesabını seçin." });
    if (islem === "ciro" && !cari) return setSonuc({ hata: "Tedarikçiyi seçin." });
    baslat(async () => {
      const s = await evrakIslem(evrakId, { islem, tarih, hesap_id: hesap || undefined, cari_id: cari || undefined });
      setSonuc(s);
      if (s.basarili) setIslem("");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="secim">
        {islemler.map((i) => (
          <button key={i} type="button" className={islem === i ? "aktif" : undefined} onClick={() => { setIslem(i); setSonuc({}); }}>
            {ISLEM_ADI[i]}
          </button>
        ))}
      </div>
      {islem && (
        <div className="form-satir" style={{ alignItems: "flex-end" }}>
          <div className="alan" style={{ flexBasis: 150 }}>
            <label htmlFor="is-tarih">Tarih</label>
            <input id="is-tarih" type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)} />
          </div>
          {(islem === "tahsil" || islem === "odeme") && (
            <div className="alan">
              <label htmlFor="is-hesap">{islem === "tahsil" ? "Paranın girdiği hesap" : "Paranın çıktığı hesap"}</label>
              <select id="is-hesap" value={hesap} onChange={(e) => setHesap(e.target.value)}>
                <option value="">Seçin</option>
                {hesaplar.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.ad} ({h.kod})
                  </option>
                ))}
              </select>
            </div>
          )}
          {islem === "ciro" && (
            <div className="alan">
              <label htmlFor="is-cari">Ciro edilen tedarikçi</label>
              <select id="is-cari" value={cari} onChange={(e) => setCari(e.target.value)}>
                <option value="">Seçin</option>
                {tedarikciler.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.unvan} ({c.kod})
                  </option>
                ))}
              </select>
            </div>
          )}
          {islem === "karsiliksiz" && (
            <p className="soluk" style={{ margin: 0, fontSize: 13, flex: "2 1 260px" }}>
              Tutar müşterinin borcuna geri yazılır; tahsilatı müşteriden yeniden takip edersiniz.
            </p>
          )}
          <div className="alan" style={{ flex: "0 0 auto" }}>
            <button type="button" className="btn btn-ana" disabled={bekliyor} onClick={kaydet}>
              {bekliyor ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>
      )}
      <FormMesaji sonuc={sonuc} />
    </div>
  );
}
