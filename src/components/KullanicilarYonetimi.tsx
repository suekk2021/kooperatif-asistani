"use client";

import { useActionState, useState, useTransition } from "react";
import {
  kullaniciEkle,
  kullaniciRolGuncelle,
  kullaniciTelegramGuncelle,
  kullaniciSil,
  type KullaniciSonuc,
} from "@/app/actions/kullanicilar";
import type { KullaniciRolu, Profil } from "@/types/database";

const bosSonuc: KullaniciSonuc = {};

function rolEtiketi(rol: KullaniciRolu) {
  if (rol === "baskan") return "Başkan";
  if (rol === "on_muhasebe") return "Ön Muhasebe Sorumlusu";
  return "İzleyici";
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
  const [chatId, setChatId] = useState(kullanici.telegram_chat_id ?? "");
  const [chatIdKaydedildi, setChatIdKaydedildi] = useState(false);

  function rolDegistir(yeniRol: KullaniciRolu) {
    setHata(null);
    islemBaslat(async () => {
      const sonuc = await kullaniciRolGuncelle(kullanici.id, yeniRol);
      if (sonuc.hata) setHata(sonuc.hata);
    });
  }

  function chatIdKaydet() {
    setHata(null);
    setChatIdKaydedildi(false);
    islemBaslat(async () => {
      const sonuc = await kullaniciTelegramGuncelle(kullanici.id, chatId);
      if (sonuc.hata) setHata(sonuc.hata);
      else setChatIdKaydedildi(true);
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
    <li className="flex flex-col gap-2 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              <option value="izleyici">İzleyici</option>
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
      </div>
      {baskanMi && (
        <div className="flex items-center gap-2 pl-0">
          <input
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value);
              setChatIdKaydedildi(false);
            }}
            placeholder="Telegram Chat ID (not bildirimleri için)"
            className="flex-1 rounded-md border border-line px-2 py-1 text-xs"
          />
          <button
            onClick={chatIdKaydet}
            disabled={islemYapiliyor}
            className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:bg-paper disabled:opacity-50"
          >
            Kaydet
          </button>
          {chatIdKaydedildi && <span className="text-xs text-income">Kaydedildi</span>}
        </div>
      )}
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
            Ön Muhasebe Sorumlusu, İzleyici (sadece görüntüleme) ya da ikinci bir Başkan için yeni hesap oluştur.
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
              <option value="izleyici">İzleyici</option>
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
