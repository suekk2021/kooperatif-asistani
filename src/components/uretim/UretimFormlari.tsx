"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { girdiEkle, girdiSil, partiBaslat, partiTamamla } from "@/app/actions/uretim";
import { FormMesaji } from "@/components/FormMesaji";
import type { StokKarti } from "@/types/database";

type KartOzeti = Pick<StokKarti, "id" | "ad" | "kod" | "birim">;

export function YeniPartiFormu({ urunler }: { urunler: KartOzeti[] }) {
  const router = useRouter();
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu & { id?: string }, fd: FormData) => {
    const s = await partiBaslat(fd);
    if (s.id) router.push(`/uretim/${s.id}`);
    return s;
  }, {});

  return (
    <form action={action} className="kart kart-ic" style={{ marginBottom: 16 }}>
      <div className="form-satir" style={{ alignItems: "flex-end" }}>
        <div className="alan" style={{ flex: "2 1 240px" }}>
          <label htmlFor="urun_karti_id">Ne üretilecek?</label>
          <select id="urun_karti_id" name="urun_karti_id" required defaultValue="">
            <option value="" disabled>
              Ürün seçin
            </option>
            {urunler.map((u) => (
              <option key={u.id} value={u.id}>
                {u.ad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan" style={{ flex: "1 1 160px" }}>
          <label htmlFor="sorumlu">Sorumlu</label>
          <input id="sorumlu" name="sorumlu" placeholder="Ayşe" />
        </div>
        <button type="submit" className="btn btn-ana dev" style={{ flex: "1 1 180px", width: "auto" }} disabled={bekliyor}>
          {bekliyor ? "Başlatılıyor…" : "▶ Partiyi başlat"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
    </form>
  );
}

export function GirdiFormu({ partiId, malzemeler }: { partiId: string; malzemeler: KartOzeti[] }) {
  const [ad, setAd] = useState("");
  const miktarRef = useRef<HTMLInputElement>(null);
  const kart = malzemeler.find((m) => m.ad.toLocaleLowerCase("tr-TR").trim() === ad.toLocaleLowerCase("tr-TR").trim());
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => {
    const s = await girdiEkle(partiId, fd);
    if (s.basarili) {
      setAd("");
      if (miktarRef.current) miktarRef.current.value = "";
    }
    return s;
  }, {});

  return (
    <form action={action}>
      <input type="hidden" name="stok_karti_id" value={kart?.id ?? ""} />
      <div className="form-satir" style={{ alignItems: "flex-end" }}>
        <div className="alan" style={{ flex: "2 1 200px" }}>
          <label htmlFor="malzeme">Malzeme {kart && <span className="kod">{kart.kod}</span>}</label>
          <input
            id="malzeme"
            list="parti-malzemeleri"
            autoComplete="off"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder="Un, peynir, kutu…"
            style={{ minHeight: 52, fontSize: 17, ...(ad && !kart ? { borderColor: "var(--amber)" } : {}) }}
          />
          <datalist id="parti-malzemeleri">
            {malzemeler.map((m) => (
              <option key={m.id} value={m.ad} />
            ))}
          </datalist>
        </div>
        <div className="alan" style={{ flex: "1 1 120px" }}>
          <label htmlFor="miktar">Tartılan {kart ? `(${kart.birim})` : ""}</label>
          <input id="miktar" name="miktar" ref={miktarRef} inputMode="decimal" placeholder="0" style={{ minHeight: 52, fontSize: 17 }} />
        </div>
        <button type="submit" className="btn btn-ana" style={{ minHeight: 52, flex: "1 1 120px", justifyContent: "center" }} disabled={bekliyor}>
          {bekliyor ? "…" : "+ Ekle"}
        </button>
      </div>
      {ad && !kart && <p className="amber" style={{ margin: "8px 0 0", fontSize: 13 }}>Listeden seçin (hammadde, ambalaj veya yarı mamul kartı).</p>}
      <FormMesaji sonuc={sonuc.basarili ? {} : sonuc} />
    </form>
  );
}

export function GirdiSilDugmesi({ partiId, girdiId }: { partiId: string; girdiId: number }) {
  const [bekliyor, baslat] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-cizgi"
      style={{ minHeight: 34, padding: "4px 10px", fontSize: 13 }}
      disabled={bekliyor}
      onClick={() => baslat(async () => void (await girdiSil(partiId, girdiId)))}
    >
      {bekliyor ? "…" : "Sil"}
    </button>
  );
}

const FIRE_NEDENLERI = ["Yırtık hamur", "Şekil bozukluğu", "Donma hatası", "Paketleme hatası", "Yanık / pişirme", "Diğer"];

export function PartiBitirFormu({ partiId, birim, varsayilanSkt }: { partiId: string; birim: string; varsayilanSkt: string }) {
  const [bozuk, setBozuk] = useState("");
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => partiTamamla(partiId, fd), {});
  const bozukVar = Number(bozuk.replace(",", ".")) > 0;

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-satir">
        <div className="alan" style={{ flex: "1 1 140px" }}>
          <label htmlFor="uretilen">Paketlenen ({birim}) *</label>
          <input id="uretilen" name="uretilen" inputMode="decimal" required placeholder="0" style={{ minHeight: 52, fontSize: 18 }} />
        </div>
        <div className="alan" style={{ flex: "1 1 140px" }}>
          <label htmlFor="bozuk">Bozuk / atılan ({birim})</label>
          <input
            id="bozuk"
            name="bozuk"
            inputMode="decimal"
            placeholder="0"
            value={bozuk}
            onChange={(e) => setBozuk(e.target.value)}
            style={{ minHeight: 52, fontSize: 18 }}
          />
        </div>
      </div>
      {bozukVar && (
        <div className="alan">
          <label htmlFor="bozuk_neden">Neden bozuldu?</label>
          <select id="bozuk_neden" name="bozuk_neden" defaultValue={FIRE_NEDENLERI[0]} style={{ minHeight: 48 }}>
            {FIRE_NEDENLERI.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
      <div className="form-satir">
        <div className="alan" style={{ flex: "1 1 160px" }}>
          <label htmlFor="skt">Son kullanma tarihi</label>
          <input id="skt" name="skt" type="date" defaultValue={varsayilanSkt} />
        </div>
        <div className="alan" style={{ flex: "1 1 160px" }}>
          <label htmlFor="lot_no">Lot no</label>
          <input id="lot_no" name="lot_no" placeholder="Boş bırakılırsa otomatik" />
        </div>
      </div>
      <button type="submit" className="btn btn-ana dev" disabled={bekliyor}>
        {bekliyor ? "Kapatılıyor…" : "■ Partiyi bitir"}
      </button>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}
