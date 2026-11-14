"use client";

import { useActionState, useState } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { ekOdemeBitir, ekOdemeEkle, personelEkle, personelGuncelle, ucretEkle } from "@/app/actions/personel";
import { FormMesaji } from "@/components/FormMesaji";
import { DURUM_ADI } from "@/lib/personel";
import type { Personel, PersonelDurumu } from "@/types/database";

/** Başarılı kayıttan sonra formu baştan kurar, hatada yazılanları korur (React form eylemi formu kendisi sıfırlar). */
function useKorunanForm(eylem: (fd: FormData) => Promise<FormSonucu>) {
  const [durum, setDurum] = useState<{ anahtar: number; girdi: Record<string, string> }>({ anahtar: 0, girdi: {} });
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => {
    const yazilan: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") yazilan[k] = v;
    });
    const s = await eylem(fd);
    setDurum((d) => ({ anahtar: d.anahtar + 1, girdi: s.basarili ? {} : yazilan }));
    return s;
  }, {});
  return { sonuc, action, bekliyor, anahtar: durum.anahtar, girdi: durum.girdi };
}

const DURUMLAR = Object.keys(DURUM_ADI) as PersonelDurumu[];

export function YeniPersonelFormu() {
  const { sonuc, action, bekliyor, anahtar, girdi } = useKorunanForm(personelEkle);
  return (
    <div className="kart" style={{ marginBottom: 16 }}>
      <div className="kart-bas">
        <h2>Yeni personel</h2>
      </div>
      <form action={action} className="kart-ic" key={anahtar}>
        <div className="form-satir">
          <div className="alan" style={{ flexBasis: 240 }}>
            <label htmlFor="ad_soyad">Ad soyad *</label>
            <input id="ad_soyad" name="ad_soyad" required autoComplete="off" defaultValue={girdi.ad_soyad ?? ""} />
          </div>
          <div className="alan">
            <label htmlFor="durum">Durum *</label>
            <select id="durum" name="durum" defaultValue={girdi.durum ?? "calisiyor"}>
              {DURUMLAR.filter((d) => d !== "ayrildi").map((d) => (
                <option key={d} value={d}>
                  {DURUM_ADI[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="alan">
            <label htmlFor="ise_baslama">İşe başlama</label>
            <input id="ise_baslama" name="ise_baslama" type="date" defaultValue={girdi.ise_baslama ?? ""} />
          </div>
        </div>
        <div className="form-satir">
          <div className="alan">
            <label htmlFor="ucret_tipi">Ücret tipi</label>
            <select id="ucret_tipi" name="ucret_tipi" defaultValue={girdi.ucret_tipi ?? "gunluk"}>
              <option value="gunluk">Günlük</option>
              <option value="saatlik">Saatlik</option>
            </select>
          </div>
          <div className="alan">
            <label htmlFor="ucret">Ücret (₺)</label>
            <input id="ucret" name="ucret" inputMode="decimal" placeholder="833,33" autoComplete="off" defaultValue={girdi.ucret ?? ""} />
          </div>
          <div className="alan">
            <label htmlFor="yol">Günlük yol parası (₺)</label>
            <input id="yol" name="yol" inputMode="decimal" placeholder="yoksa boş" autoComplete="off" defaultValue={girdi.yol ?? ""} />
          </div>
        </div>
        <p className="soluk" style={{ fontSize: 13, marginTop: 8 }}>
          Ücret ve yol parası işe başlama tarihinden geçerli olur. Sonradan zam, yarım ücret, sigorta parası gibi değişiklikler kişinin
          kartından tarihiyle eklenir.
        </p>
        <div style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-ana" disabled={bekliyor}>
            {bekliyor ? "Kaydediliyor…" : "Personeli ekle"}
          </button>
        </div>
        <FormMesaji sonuc={sonuc} />
      </form>
    </div>
  );
}

export function PersonelBilgiFormu({ personel }: { personel: Personel }) {
  const [durum, setDurum] = useState(personel.durum);
  const [sonuc, action, bekliyor] = useActionState(
    async (_o: FormSonucu, fd: FormData) => personelGuncelle(personel.id, fd),
    {}
  );
  return (
    // key: kayıt sonrası React formu sıfırlayınca <select> eski değere dönmesin (bkz. StokKartiDuzenleFormu)
    <form key={personel.durum} action={action} className="kart-ic">
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 240 }}>
          <label htmlFor="ad_soyad">Ad soyad *</label>
          <input id="ad_soyad" name="ad_soyad" required defaultValue={personel.ad_soyad} />
        </div>
        <div className="alan">
          <label htmlFor="durum">Durum *</label>
          <select id="durum" name="durum" defaultValue={personel.durum} onChange={(e) => setDurum(e.target.value as PersonelDurumu)}>
            {DURUMLAR.map((d) => (
              <option key={d} value={d}>
                {DURUM_ADI[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="alan">
          <label htmlFor="ise_baslama">İşe başlama</label>
          <input id="ise_baslama" name="ise_baslama" type="date" defaultValue={personel.ise_baslama ?? ""} />
        </div>
        {durum === "ayrildi" && (
          <div className="alan">
            <label htmlFor="ayrilis">Ayrılış *</label>
            <input id="ayrilis" name="ayrilis" type="date" required defaultValue={personel.ayrilis ?? ""} />
          </div>
        )}
      </div>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: "100%" }}>
          <label htmlFor="notlar">Not</label>
          <input id="notlar" name="notlar" defaultValue={personel.notlar ?? ""} placeholder="örn. deneme süresi 2 ay" />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}

export function UcretEkleFormu({ personelId, sonTip }: { personelId: string; sonTip: string }) {
  const { sonuc, action, bekliyor, anahtar, girdi } = useKorunanForm((fd) => ucretEkle(personelId, fd));
  return (
    <form action={action} className="kart-ic" key={anahtar}>
      <div className="form-satir">
        <div className="alan">
          <label htmlFor="u_baslangic">Geçerli olduğu tarih *</label>
          <input id="u_baslangic" name="baslangic" type="date" required defaultValue={girdi.baslangic ?? ""} />
        </div>
        <div className="alan">
          <label htmlFor="u_tip">Tip *</label>
          <select id="u_tip" name="ucret_tipi" defaultValue={girdi.ucret_tipi ?? sonTip}>
            <option value="gunluk">Günlük</option>
            <option value="saatlik">Saatlik</option>
          </select>
        </div>
        <div className="alan">
          <label htmlFor="u_tutar">Ücret (₺) *</label>
          <input id="u_tutar" name="tutar" required inputMode="decimal" autoComplete="off" defaultValue={girdi.tutar ?? ""} />
        </div>
        <div className="alan" style={{ flexBasis: 220 }}>
          <label htmlFor="u_aciklama">Açıklama</label>
          <input id="u_aciklama" name="aciklama" placeholder="örn. Zam, deneme süresi yarım ücret" defaultValue={girdi.aciklama ?? ""} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Yeni ücreti ekle"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}

export function EkOdemeFormu({ personelId }: { personelId: string }) {
  const { sonuc, action, bekliyor, anahtar, girdi } = useKorunanForm((fd) => ekOdemeEkle(personelId, fd));
  return (
    <form action={action} className="kart-ic" key={anahtar}>
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 200 }}>
          <label htmlFor="e_ad">Ödeme *</label>
          <input id="e_ad" name="ad" required list="ek-odeme-adlari" placeholder="Yol parası" defaultValue={girdi.ad ?? ""} />
          <datalist id="ek-odeme-adlari">
            <option value="Yol parası" />
            <option value="Sigorta parası" />
          </datalist>
        </div>
        <div className="alan">
          <label htmlFor="e_birim">Nasıl *</label>
          <select id="e_birim" name="birim" defaultValue={girdi.birim ?? "gunluk"}>
            <option value="gunluk">Geldiği her gün</option>
            <option value="aylik">Ayda bir</option>
          </select>
        </div>
        <div className="alan">
          <label htmlFor="e_tutar">Tutar (₺) *</label>
          <input id="e_tutar" name="tutar" required inputMode="decimal" autoComplete="off" defaultValue={girdi.tutar ?? ""} />
        </div>
        <div className="alan">
          <label htmlFor="e_bas">Başlangıç *</label>
          <input id="e_bas" name="baslangic" type="date" required defaultValue={girdi.baslangic ?? ""} />
        </div>
        <div className="alan">
          <label htmlFor="e_bitis">Bitiş</label>
          <input id="e_bitis" name="bitis" type="date" defaultValue={girdi.bitis ?? ""} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Ek ödemeyi ekle"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}

export function EkOdemeBitirFormu({ id }: { id: string }) {
  const [sonuc, action, bekliyor] = useActionState(async (_o: FormSonucu, fd: FormData) => ekOdemeBitir(id, fd), {});
  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input name="bitis" type="date" required aria-label="Bitiş tarihi" />
      <button type="submit" className="btn btn-cizgi" disabled={bekliyor}>
        {bekliyor ? "…" : "Bitir"}
      </button>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}
