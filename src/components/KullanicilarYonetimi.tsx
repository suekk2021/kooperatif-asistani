"use client";

import { useActionState, useState, useTransition } from "react";
import {
  kullaniciEkle,
  kullaniciRolGuncelle,
  kullaniciSil,
  type KullaniciSonuc,
} from "@/app/actions/kullanicilar";
import type { KullaniciRolu, Profil } from "@/types/database";

const bosSonuc: KullaniciSonuc = {};

function rolEtiketi(rol: KullaniciRolu) {
  return rol === "baskan" ? "Başkan" : "Ön Muhasebe Sorumlusu";
}

function KullaniciSatiri({
  kullanici,
  kendisiMi,
  baskanMi,
}: {
  kullanici: Profil;
  kendisiMi: boolean;
  baskanMi: boolean;
}) {
  const [islemYapiliyor, islemBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [silindi, setSilindi] = useState(false);

  function rolDegistir(yeniRol: KullaniciRolu) {
    setHata(null);
    islemBaslat(async () => {
      const sonuc = await kullaniciRolGuncelle(kullanici.id, yeniRol);
      if (sonuc.hata) setHata(sonuc.hata);
    });
  }

  function sil() {
    if (!confirm(`${kullanici.ad_soyad} adlı kullanıcıyı silmek istediğine emin misin? Bu işlem geri alınamaz.`)) {
      return;
    }
    setHata(null);
    islemBaslat(async () => {
      const sonuc = await kullaniciSil(kullanici.id);
      if (sonuc.hata) setHata(sonuc.hata);
      else setSilindi(true);
    });
  }

  if (silindi) return null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div>
        <p className="text-ink">
          {kullanici.ad_soyad} {kendisiMi && <span className="text-xs text-ink-soft/70">(sen)</span>}
        </p>
        {hata && <p className="text-xs text-expense">{hata}</p>}
      </div>
      <div className="flex items-center gap-2">
        {baskanMi ? (
          <select
            value={kullanici.rol}
            disabled={islemYapiliyor || kendisiMi}
            onChange={(e) => rolDegistir(e.target.value as KullaniciRolu)}
            className="rounded-md border border-line bg-card px-2 py-1 text-xs text-ink-soft disabled:opacity-50"
          >
            <option value="baskan">Başkan</option>
            <option value="on_muhasebe">Ön Muhasebe Sorumlusu</option>
          </select>
        ) : (
          <span className="text-xs text-ink-soft/70">{rolEtiketi(kullanici.rol)}</span>
        )}
        {baskanMi && !kendisiMi && (
          <button
            onClick={sil}
            disabled={islemYapiliyor}
            className="text-xs text-expense/70 hover:text-expense disabled:opacity-50"
          >
            Sil
          </button>
        )}
      </div>
    </li>
  );
}

export function KullanicilarYonetimi({
  kullanicilar,
  kendiId,
  baskanMi,
}: {
  kullanicilar: Profil[];
  kendiId: string;
  baskanMi: boolean;
}) {
  const [sonuc, action, bekliyor] = useActionState(
    async (_onceki: KullaniciSonuc, formData: FormData) => kullaniciEkle(formData),
    bosSonuc
  );

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-soft">Kullanıcılar</p>
      <ul className="divide-y divide-line">
        {kullanicilar.map((k) => (
          <KullaniciSatiri key={k.id} kullanici={k} kendisiMi={k.id === kendiId} baskanMi={baskanMi} />
        ))}
      </ul>

      {baskanMi && (
        <form action={action} className="mt-4 space-y-3 border-t border-line pt-4">
          <p className="text-xs text-ink-soft">
            Ön Muhasebe Sorumlusu (ya da ikinci bir Başkan) için yeni hesap oluştur.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              name="ad_soyad"
              required
              placeholder="Ad Soyad"
              className="rounded-md border border-line px-3 py-2 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="E-posta"
              className="rounded-md border border-line px-3 py-2 text-sm"
            />
            <input
              name="sifre"
              type="password"
              required
              minLength={6}
              placeholder="Geçici şifre (en az 6 karakter)"
              className="rounded-md border border-line px-3 py-2 text-sm"
            />
            <select name="rol" defaultValue="on_muhasebe" className="rounded-md border border-line px-3 py-2 text-sm">
              <option value="on_muhasebe">Ön Muhasebe Sorumlusu</option>
              <option value="baskan">Başkan</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={bekliyor}
            className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            {bekliyor ? "Ekleniyor..." : "Kullanıcı Ekle"}
          </button>
          {sonuc.hata && <p className="text-sm text-expense">{sonuc.hata}</p>}
          {sonuc.basarili && <p className="text-sm text-income">{sonuc.basarili}</p>}
        </form>
      )}
    </div>
  );
}
