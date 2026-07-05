"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { musteriGuncelle, musteriSil } from "@/app/actions/musteriler";
import type { Musteri } from "@/types/database";

export function MusteriDetayFormu({
  musteri,
  duzenlenebilir,
}: {
  musteri: Musteri;
  duzenlenebilir: boolean;
}) {
  const router = useRouter();
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [islemYapiliyor, islemBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  function kaydet(formData: FormData) {
    setHata(null);
    setBasarili(null);
    islemBaslat(async () => {
      const sonuc = await musteriGuncelle(musteri.id, formData);
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setBasarili(sonuc.basarili ?? null);
        setDuzenlemeModu(false);
      }
    });
  }

  function sil() {
    if (!confirm(`${musteri.ad_soyad} adlı müşteriyi silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    setHata(null);
    islemBaslat(async () => {
      const sonuc = await musteriSil(musteri.id);
      if (sonuc.hata) setHata(sonuc.hata);
      else router.push("/musteriler");
    });
  }

  if (duzenlemeModu) {
    return (
      <form action={kaydet} className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            name="ad_soyad"
            required
            defaultValue={musteri.ad_soyad}
            placeholder="Ad Soyad / Ünvan"
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            name="telefon"
            defaultValue={musteri.telefon ?? ""}
            placeholder="Telefon"
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            name="adres"
            defaultValue={musteri.adres ?? ""}
            placeholder="Adres"
            className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="notlar"
            defaultValue={musteri.notlar ?? ""}
            placeholder="Not"
            className="rounded-md border border-line px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={islemYapiliyor}
            className="rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => setDuzenlemeModu(false)}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-paper"
          >
            Vazgeç
          </button>
        </div>
        {hata && <p className="text-xs text-expense">{hata}</p>}
      </form>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-ink">{musteri.ad_soyad}</h1>
          {musteri.telefon && <p className="text-sm text-ink-soft">{musteri.telefon}</p>}
          {musteri.adres && <p className="text-sm text-ink-soft">{musteri.adres}</p>}
          {musteri.notlar && <p className="mt-1 text-xs text-ink-soft/70">{musteri.notlar}</p>}
        </div>
        {duzenlenebilir && (
          <div className="flex gap-3">
            <button onClick={() => setDuzenlemeModu(true)} className="text-xs text-ink-soft hover:text-ink">
              Düzenle
            </button>
            <button
              onClick={sil}
              disabled={islemYapiliyor}
              className="text-xs text-expense/70 hover:text-expense disabled:opacity-50"
            >
              Sil
            </button>
          </div>
        )}
      </div>
      {basarili && <p className="mt-2 text-xs text-income">{basarili}</p>}
      {hata && <p className="mt-2 text-xs text-expense">{hata}</p>}
    </div>
  );
}
