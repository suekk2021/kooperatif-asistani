"use client";

import { useActionState } from "react";
import { musteriEkle, type MusteriSonuc } from "@/app/actions/musteriler";

const bosSonuc: MusteriSonuc = {};

export function YeniMusteriFormu() {
  const [sonuc, action, bekliyor] = useActionState(
    async (_onceki: MusteriSonuc, formData: FormData) => musteriEkle(formData),
    bosSonuc
  );

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-sm font-semibold text-ink">Yeni Müşteri</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Hem alım hem satım yaptığınız müşterileri kaydedin, cari hesaplarını tek karttan takip edin.
      </p>
      <form action={action} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          name="ad_soyad"
          required
          placeholder="Ad Soyad / Ünvan"
          className="col-span-2 rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          name="telefon"
          placeholder="Telefon"
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={bekliyor}
          className="col-span-1 rounded-md bg-pine px-3 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
        >
          {bekliyor ? "Ekleniyor..." : "Ekle"}
        </button>
        <input
          name="adres"
          placeholder="Adres (opsiyonel)"
          className="col-span-2 rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          name="notlar"
          placeholder="Not (opsiyonel)"
          className="col-span-2 rounded-md border border-line px-3 py-2 text-sm"
        />
      </form>
      {sonuc.hata && <p className="mt-2 text-sm text-expense">{sonuc.hata}</p>}
      {sonuc.basarili && <p className="mt-2 text-sm text-income">{sonuc.basarili}</p>}
    </div>
  );
}
