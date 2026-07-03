"use client";

import { useActionState } from "react";
import { ePostaGuncelle, sifreGuncelle, type HesapSonuc } from "@/app/actions/hesap";

const bosSonuc: HesapSonuc = {};

function Mesaj({ sonuc }: { sonuc: HesapSonuc }) {
  if (sonuc.hata) {
    return <p className="rounded-md bg-expense/10 px-3 py-2 text-sm text-expense">{sonuc.hata}</p>;
  }
  if (sonuc.basarili) {
    return (
      <p className="rounded-md bg-income/10 px-3 py-2 text-sm text-income">{sonuc.basarili}</p>
    );
  }
  return null;
}

export function HesapFormlari({ mevcutEposta }: { mevcutEposta: string }) {
  const [epostaSonuc, epostaAction, epostaBekliyor] = useActionState(
    async (_onceki: HesapSonuc, formData: FormData) => ePostaGuncelle(formData),
    bosSonuc
  );
  const [sifreSonuc, sifreAction, sifreBekliyor] = useActionState(
    async (_onceki: HesapSonuc, formData: FormData) => sifreGuncelle(formData),
    bosSonuc
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">E-posta Adresi</h2>
        <p className="mt-1 text-xs text-ink-soft">Şu an: {mevcutEposta}</p>
        <form action={epostaAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="eposta"
            type="email"
            required
            placeholder="Yeni e-posta adresi"
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={epostaBekliyor}
            className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            {epostaBekliyor ? "Gönderiliyor..." : "E-postayı Güncelle"}
          </button>
        </form>
        <div className="mt-3">
          <Mesaj sonuc={epostaSonuc} />
        </div>
      </div>

      <div className="rounded-xl border border-line bg-card p-6">
        <h2 className="text-sm font-semibold text-ink">Şifre</h2>
        <form action={sifreAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="yeni_sifre"
            type="password"
            required
            minLength={6}
            placeholder="Yeni şifre"
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            name="yeni_sifre_tekrar"
            type="password"
            required
            minLength={6}
            placeholder="Yeni şifre (tekrar)"
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={sifreBekliyor}
            className="rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            {sifreBekliyor ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
        <div className="mt-3">
          <Mesaj sonuc={sifreSonuc} />
        </div>
      </div>
    </div>
  );
}
