"use client";

import { useActionState, useState, useTransition } from "react";
import { kullaniciEkle, kullaniciGuncelle, kullaniciSifreSifirla, kullaniciSil, type KullaniciSonuc } from "@/app/actions/kullanicilar";
import { FormMesaji } from "@/components/FormMesaji";
import { KORUNAN_ROLLER, ROLLER, rolAdi } from "@/lib/roller";
import type { KullaniciRolu, Profil } from "@/types/database";

/** Korunan rolleri (başkan, teknik destek) sadece aynı roldeki kişi verir; teknik destek kurulumda hepsini verir. */
function verebilir(benimRol: KullaniciRolu | null, rol: KullaniciRolu) {
  return !KORUNAN_ROLLER.includes(rol) || benimRol === rol || benimRol === "destek";
}

function KullaniciSatiri({
  kullanici,
  kendisiMi,
  yonetici,
  benimRol,
}: {
  kullanici: Profil;
  kendisiMi: boolean;
  yonetici: boolean;
  benimRol: KullaniciRolu | null;
}) {
  const [bekliyor, baslat] = useTransition();
  const [sonuc, setSonuc] = useState<KullaniciSonuc>({});
  const [gorev, setGorev] = useState(kullanici.gorev ?? "");
  const [chatId, setChatId] = useState(kullanici.telegram_chat_id ?? "");
  const [silOnay, setSilOnay] = useState(false);
  const [silindi, setSilindi] = useState(false);
  const [sifreAcik, setSifreAcik] = useState(false);
  const [yeniSifre, setYeniSifre] = useState("");
  const rolDegisebilir = verebilir(benimRol, kullanici.rol);
  // Teknik destek hesabını her yönetici silebilir: erişimi kesme hakkı kooperatifte.
  const silinebilir = kullanici.rol === "destek" || kullanici.rol !== "baskan" || benimRol === "baskan" || benimRol === "destek";
  const destekMi = kullanici.rol === "destek";

  if (silindi) return null;

  const kaydet = (d: Parameters<typeof kullaniciGuncelle>[1]) => baslat(async () => setSonuc(await kullaniciGuncelle(kullanici.id, d)));

  return (
    <div style={{ padding: "14px 0", borderBottom: "1px solid var(--cizgi)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <b>{kullanici.ad_soyad}</b> {kendisiMi && <span className="soluk" style={{ fontSize: 12.5 }}>(siz)</span>}{" "}
          {destekMi && <span className="etk e-gri">operasyonda görünmez</span>}
          <div className="soluk" style={{ fontSize: 13 }}>
            {rolAdi(kullanici.rol)}
            {kullanici.gorev ? ` · ${kullanici.gorev}` : ""}
          </div>
        </div>
        {yonetici && !kendisiMi && (rolDegisebilir || silinebilir) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {rolDegisebilir && (
              <div className="alan" style={{ flex: "0 0 auto" }}>
                <select
                  value={kullanici.rol}
                  disabled={bekliyor}
                  onChange={(e) => kaydet({ rol: e.target.value as KullaniciRolu })}
                  aria-label="Rol"
                >
                  {ROLLER.filter((r) => verebilir(benimRol, r.deger)).map((r) => (
                    <option key={r.deger} value={r.deger}>
                      {r.ad}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {rolDegisebilir && (
              <button type="button" className="btn btn-cizgi" onClick={() => setSifreAcik((a) => !a)}>
                Şifreyi sıfırla
              </button>
            )}
            {!silinebilir ? null : silOnay ? (
              <>
                <button
                  type="button"
                  className="btn btn-ana"
                  style={{ background: "var(--mercan)" }}
                  disabled={bekliyor}
                  onClick={() =>
                    baslat(async () => {
                      const s = await kullaniciSil(kullanici.id);
                      setSonuc(s);
                      if (s.basarili) setSilindi(true);
                    })
                  }
                >
                  Evet, sil
                </button>
                <button type="button" className="btn btn-cizgi" onClick={() => setSilOnay(false)}>
                  Vazgeç
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-cizgi" onClick={() => setSilOnay(true)}>
                Sil
              </button>
            )}
          </div>
        )}
      </div>
      {yonetici && rolDegisebilir && (
        <div className="form-satir" style={{ marginTop: 10 }}>
          <div className="alan" style={{ flex: "2 1 220px" }}>
            <label>Görev (ekranda görünür)</label>
            <input value={gorev} onChange={(e) => setGorev(e.target.value)} placeholder="Genel Müdür · ortak şirket" />
          </div>
          <div className="alan" style={{ flex: "1 1 180px" }}>
            <label>Telegram numarası</label>
            <input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              inputMode="numeric"
              placeholder="Kişi bota yazınca öğrenir"
              title="Kişi Telegram'da kooperatif botuna herhangi bir mesaj yazar; bot ona numarasını söyler. O numarayı buraya yazıp kaydedin."
            />
          </div>
          <div className="alan" style={{ flex: "0 0 auto", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-cizgi" disabled={bekliyor} onClick={() => kaydet({ gorev, telegram_chat_id: chatId })}>
              Kaydet
            </button>
          </div>
        </div>
      )}
      {yonetici && !kendisiMi && rolDegisebilir && sifreAcik && (
        <div className="form-satir" style={{ marginTop: 10, alignItems: "flex-end" }}>
          <div className="alan" style={{ flex: "2 1 240px" }}>
            <label>Yeni geçici şifre (en az 6 karakter)</label>
            <input value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} autoComplete="off" placeholder="Kişiye ileteceğiniz şifre" />
          </div>
          <div className="alan" style={{ flex: "0 0 auto", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ana"
              disabled={bekliyor || yeniSifre.length < 6}
              onClick={() =>
                baslat(async () => {
                  const s = await kullaniciSifreSifirla(kullanici.id, yeniSifre);
                  setSonuc(s);
                  if (s.basarili) {
                    setYeniSifre("");
                    setSifreAcik(false);
                  }
                })
              }
            >
              Şifreyi sıfırla
            </button>
          </div>
        </div>
      )}
      <FormMesaji sonuc={sonuc} />
    </div>
  );
}

export function KullanicilarYonetimi({
  kullanicilar,
  kendiId,
  yonetici,
  benimRol,
}: {
  kullanicilar: Profil[];
  kendiId: string;
  yonetici: boolean;
  benimRol: KullaniciRolu | null;
}) {
  const [sonuc, action, bekliyor] = useActionState(async (_o: KullaniciSonuc, fd: FormData) => kullaniciEkle(fd), {});

  return (
    <div>
      <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>Kişiler ve yetkiler</h2>
      <p className="soluk" style={{ margin: "0 0 8px", fontSize: 13.5 }}>
        Kooperatif çalışanları ve ortak şirketten kişiler. Yeni kişiyi Başkan veya Operasyon yöneticisi ekler.
      </p>
      {kullanicilar.map((k) => (
        <KullaniciSatiri key={k.id} kullanici={k} kendisiMi={k.id === kendiId} yonetici={yonetici} benimRol={benimRol} />
      ))}

      {yonetici && (
        <form action={action} style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <b>Yeni kişi ekle</b>
          <div className="form-satir">
            <div className="alan">
              <label htmlFor="ad_soyad">Ad soyad *</label>
              <input id="ad_soyad" name="ad_soyad" required />
            </div>
            <div className="alan">
              <label htmlFor="email">E-posta (giriş adı) *</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>
          <div className="form-satir">
            <div className="alan">
              <label htmlFor="sifre">Geçici şifre *</label>
              <input id="sifre" name="sifre" type="password" required minLength={6} placeholder="En az 6 karakter" />
            </div>
            <div className="alan">
              <label htmlFor="rol">Rol</label>
              <select id="rol" name="rol" defaultValue="on_muhasebe">
                {ROLLER.filter((r) => verebilir(benimRol, r.deger)).map((r) => (
                  <option key={r.deger} value={r.deger}>
                    {r.ad}
                  </option>
                ))}
              </select>
            </div>
            <div className="alan">
              <label htmlFor="gorev">Görev</label>
              <input id="gorev" name="gorev" placeholder="Depo sorumlusu, mali müşavir…" />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-ana" disabled={bekliyor}>
              {bekliyor ? "Ekleniyor…" : "Kişiyi ekle"}
            </button>
          </div>
          <FormMesaji sonuc={sonuc} />
        </form>
      )}

      <details className="hp" style={{ marginTop: 16, border: "1px solid var(--cizgi)", borderRadius: 12 }}>
        <summary>Roller ne yapabilir?</summary>
        <div className="tablo-kutu">
          <table className="kart-tablo">
            <tbody>
              {ROLLER.map((r) => (
                <tr key={r.deger}>
                  <td>
                    <b>{r.ad}</b>
                  </td>
                  <td data-label="">{r.aciklama}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
