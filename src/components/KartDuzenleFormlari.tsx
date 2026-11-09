"use client";

import { useActionState } from "react";
import { cariGuncelle, type FormSonucu } from "@/app/actions/cariler";
import { stokKartiGuncelle } from "@/app/actions/stok";
import { FormMesaji } from "@/components/FormMesaji";
import { STOK_BIRIMLERI } from "@/lib/imece";
import type { Cari, Depo, KdvOrani, StokKarti } from "@/types/database";

function AktifKutusu({ aktif, aciklama }: { aktif: boolean; aciklama: string }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer" }}>
      <input type="checkbox" name="aktif" defaultChecked={aktif} style={{ marginTop: 3 }} />
      <span>
        <b>Aktif</b> <span className="soluk">— {aciklama}</span>
      </span>
    </label>
  );
}

export function CariDuzenleFormu({ cari }: { cari: Cari }) {
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => cariGuncelle(cari.id, fd), {});
  return (
    <form action={action} className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 300 }}>
          <label htmlFor="unvan">Ünvan / ad *</label>
          <input id="unvan" name="unvan" required defaultValue={cari.unvan} />
        </div>
        <div className="alan">
          <label htmlFor="telefon">Telefon</label>
          <input id="telefon" name="telefon" defaultValue={cari.telefon ?? ""} inputMode="tel" />
        </div>
        <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
          <label htmlFor="vade_gun">Vade (gün)</label>
          <input id="vade_gun" name="vade_gun" defaultValue={cari.vade_gun || ""} inputMode="numeric" />
        </div>
      </div>
      <div className="form-satir">
        <div className="alan">
          <label htmlFor="vergi_no">Vergi / TC no</label>
          <input id="vergi_no" name="vergi_no" defaultValue={cari.vergi_no ?? ""} inputMode="numeric" />
        </div>
        <div className="alan">
          <label htmlFor="vergi_dairesi">Vergi dairesi</label>
          <input id="vergi_dairesi" name="vergi_dairesi" defaultValue={cari.vergi_dairesi ?? ""} />
        </div>
        <div className="alan">
          <label htmlFor="eposta">E-posta</label>
          <input id="eposta" name="eposta" type="email" defaultValue={cari.eposta ?? ""} />
        </div>
      </div>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 300 }}>
          <label htmlFor="adres">Adres</label>
          <input id="adres" name="adres" defaultValue={cari.adres ?? ""} />
        </div>
        <div className="alan" style={{ flexBasis: 260 }}>
          <label htmlFor="iban">IBAN</label>
          <input id="iban" name="iban" defaultValue={cari.iban ?? ""} />
        </div>
      </div>
      <div className="alan">
        <label htmlFor="notlar">Not</label>
        <input id="notlar" name="notlar" defaultValue={cari.notlar ?? ""} />
      </div>
      <AktifKutusu aktif={cari.aktif} aciklama="işaret kaldırılırsa cari listelerden ve seçimlerden kalkar; bakiyesi sıfır olmalı" />
      <div>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}

export function StokKartiDuzenleFormu({
  kart,
  depolar,
  kdvOranlari,
  hareketVar,
}: {
  kart: StokKarti;
  depolar: Depo[];
  kdvOranlari: KdvOrani[];
  hareketVar: boolean;
}) {
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => stokKartiGuncelle(kart.id, fd), {});
  const urunMu = kart.tur === "mamul" || kart.tur === "ticari_mal" || kart.tur === "yari_mamul";
  return (
    <form action={action} className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 300 }}>
          <label htmlFor="ad">Ad *</label>
          <input id="ad" name="ad" required defaultValue={kart.ad} />
        </div>
        <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
          <label htmlFor="birim">Birim</label>
          <select id="birim" name="birim" defaultValue={kart.birim} disabled={hareketVar}>
            {STOK_BIRIMLERI.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          {/* disabled select formda gönderilmez; hareketi olan kartta mevcut birim aynen gider */}
          {hareketVar && <input type="hidden" name="birim" value={kart.birim} />}
        </div>
        <div className="alan">
          <label htmlFor="depo_id">Depo</label>
          <select id="depo_id" name="depo_id" defaultValue={kart.depo_id ? String(kart.depo_id) : ""}>
            <option value="">—</option>
            {depolar.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ad}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 120, flexGrow: 0 }}>
          <label htmlFor="kdv_orani">KDV</label>
          <select id="kdv_orani" name="kdv_orani" defaultValue={String(Number(kart.kdv_orani))}>
            {kdvOranlari.map((k) => (
              <option key={k.oran} value={Number(k.oran)}>
                %{Number(k.oran)}
              </option>
            ))}
          </select>
        </div>
        <div className="alan">
          <label htmlFor="min_stok">Asgari stok (uyarı sınırı)</label>
          <input id="min_stok" name="min_stok" defaultValue={kart.min_stok ?? ""} inputMode="decimal" />
        </div>
        {urunMu && (
          <div className="alan">
            <label htmlFor="satis_fiyati">Liste satış fiyatı (KDV hariç)</label>
            <input id="satis_fiyati" name="satis_fiyati" defaultValue={kart.satis_fiyati ?? ""} inputMode="decimal" />
          </div>
        )}
      </div>
      <div className="alan">
        <label htmlFor="notlar">Not</label>
        <input id="notlar" name="notlar" defaultValue={kart.notlar ?? ""} />
      </div>
      {hareketVar && <p className="soluk" style={{ margin: 0, fontSize: 13 }}>Bu kartın hareketi olduğu için birimi değiştirilemez.</p>}
      <AktifKutusu aktif={kart.aktif} aciklama="işaret kaldırılırsa kart listelerden ve seçimlerden kalkar; stoğu sıfır olmalı" />
      <div>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}
