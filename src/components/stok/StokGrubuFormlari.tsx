"use client";

import { useActionState, useState } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { stokGrubuEkle, stokGrubuGuncelle } from "@/app/actions/stok-grup";
import { FormMesaji } from "@/components/FormMesaji";
import { ANA_GRUPLAR, STOK_TURU_ADI } from "@/lib/imece";
import type { StokGrubu } from "@/types/database";

// Alanlar her kayıttan sonra baştan kurulur: React form eylemi bitince formu kendisi sıfırlar, seçim kutuları
// ilk seçeneğe döner ama buradaki durum (ana grup, alt grup) eski kalıp ekranla tutarsız olurdu.
function GrupAlanlari({ mevcut, bekliyor }: { mevcut: StokGrubu[]; bekliyor: boolean }) {
  const [anaKod, setAnaKod] = useState("150");
  const [altKod, setAltKod] = useState("");

  const ana = ANA_GRUPLAR.find((a) => a.kod === anaKod)!;
  const ayni = /^[0-9]{2}$/.test(altKod) ? mevcut.find((g) => g.ana_kod === anaKod && g.grup_kodu === altKod) : undefined;
  const biciminYanlis = altKod !== "" && !/^[0-9]{0,2}$/.test(altKod);

  return (
    <>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 220 }}>
          <label htmlFor="ana_kod">Ana grup *</label>
          <select id="ana_kod" name="ana_kod" defaultValue="150" onChange={(e) => setAnaKod(e.target.value)}>
            {ANA_GRUPLAR.map((a) => (
              <option key={a.kod} value={a.kod}>
                {a.kod} · {a.ad}
              </option>
            ))}
          </select>
        </div>
        <div className="alan" style={{ flexBasis: 130, flexGrow: 0 }}>
          <label htmlFor="grup_kodu">Alt grup (2 rakam) *</label>
          <input
            id="grup_kodu"
            name="grup_kodu"
            required
            inputMode="numeric"
            maxLength={2}
            placeholder="10"
            defaultValue=""
            onChange={(e) => setAltKod(e.target.value.trim())}
            autoComplete="off"
          />
        </div>
        <div className="alan" style={{ flexBasis: 260 }}>
          <label htmlFor="ad">Grup adı *</label>
          <input id="ad" name="ad" required placeholder="Ambalaj - koli" autoComplete="off" />
        </div>
        <div className="alan">
          <label htmlFor="tur">Tür *</label>
          <select id="tur" name="tur" key={anaKod} required defaultValue={ana.turler.length === 1 ? ana.turler[0] : ""}>
            {ana.turler.length > 1 && <option value="">Seçiniz</option>}
            {ana.turler.map((t) => (
              <option key={t} value={t}>
                {STOK_TURU_ADI[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {ayni && (
        <p className="mesaj hata">
          {anaKod}
          {altKod} kodu zaten kullanılıyor: {ayni.ad}. Başka bir alt grup numarası yazın.
        </p>
      )}
      {biciminYanlis && <p className="mesaj hata">Alt grup yalnız rakam olmalı (en çok 2 hane).</p>}
      <div style={{ marginTop: 16 }}>
        <button type="submit" className="btn btn-ana" disabled={bekliyor || Boolean(ayni) || biciminYanlis}>
          {bekliyor ? "Kaydediliyor…" : "Grubu ekle"}
        </button>
      </div>
    </>
  );
}

export function YeniStokGrubuFormu({ mevcut }: { mevcut: StokGrubu[] }) {
  const [anahtar, setAnahtar] = useState(0);
  const [sonuc, action, bekliyor] = useActionState(async (_onceki: FormSonucu, formData: FormData) => {
    const s = await stokGrubuEkle(formData);
    setAnahtar((k) => k + 1);
    return s;
  }, {});

  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart-bas">
        <h2>Yeni stok grubu</h2>
      </div>
      <form action={action} className="kart-ic">
        <GrupAlanlari key={anahtar} mevcut={mevcut} bekliyor={bekliyor} />
        <FormMesaji sonuc={sonuc} />
      </form>
    </div>
  );
}

export function StokGrubuSatiri({ grup, kartSayisi }: { grup: StokGrubu; kartSayisi: number }) {
  const [sonuc, action, bekliyor] = useActionState(
    async (_o: FormSonucu, fd: FormData) => stokGrubuGuncelle(grup.id, fd),
    {}
  );
  return (
    <tr>
      <td>
        <span className="kod">
          {grup.ana_kod}
          {grup.grup_kodu}
        </span>
      </td>
      <td colSpan={4}>
        <form action={action} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input name="ad" required defaultValue={grup.ad} style={{ flex: "1 1 220px" }} aria-label="Grup adı" />
          <span className="soluk" style={{ minWidth: 120 }}>
            {STOK_TURU_ADI[grup.tur]}
          </span>
          <span className="soluk num" style={{ minWidth: 70 }}>
            {kartSayisi} kart
          </span>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
            <input type="checkbox" name="aktif" defaultChecked={grup.aktif} /> Açık
          </label>
          <button type="submit" className="btn btn-cizgi" disabled={bekliyor}>
            {bekliyor ? "…" : "Kaydet"}
          </button>
          <FormMesaji sonuc={sonuc} />
        </form>
      </td>
    </tr>
  );
}
