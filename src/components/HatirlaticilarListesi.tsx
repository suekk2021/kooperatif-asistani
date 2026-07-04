"use client";

import { useMemo, useState, useTransition } from "react";
import {
  hatirlaticiTamamlandiDegistir,
  hatirlaticiGuncelle,
  hatirlaticiSil,
} from "@/app/actions/hatirlaticilar";
import { TarihAraligiFiltresi, type TarihAraligi } from "@/components/TarihAraligiFiltresi";
import { AyGezici } from "@/components/AyGezici";
import type { Hatirlatici } from "@/types/database";

type HatirlaticiVerisi = Pick<
  Hatirlatici,
  "id" | "baslik" | "hatirlatma_tarihi" | "tamamlandi" | "telegram_gonderen"
> & {
  profiller: { ad_soyad: string } | null;
};

function kimEkledi(hatirlatici: HatirlaticiVerisi): string | null {
  return hatirlatici.telegram_gonderen ?? hatirlatici.profiller?.ad_soyad ?? null;
}

function HatirlaticiSatiri({ hatirlatici }: { hatirlatici: HatirlaticiVerisi }) {
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [baslik, setBaslik] = useState(hatirlatici.baslik);
  const [tarih, setTarih] = useState(hatirlatici.hatirlatma_tarihi);
  const [islemYapiliyor, islemBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function tamamlandiDegistir() {
    setHata(null);
    islemBaslat(async () => {
      try {
        await hatirlaticiTamamlandiDegistir(hatirlatici.id, !hatirlatici.tamamlandi);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Güncellenemedi.");
      }
    });
  }

  function kaydet() {
    setHata(null);
    islemBaslat(async () => {
      try {
        await hatirlaticiGuncelle(hatirlatici.id, baslik, tarih);
        setDuzenlemeModu(false);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  function sil() {
    if (!confirm("Bu hatırlatıcıyı silmek istediğine emin misin?")) return;
    islemBaslat(async () => {
      try {
        await hatirlaticiSil(hatirlatici.id);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Silinemedi.");
      }
    });
  }

  if (duzenlemeModu) {
    return (
      <li className="py-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            className="flex-1 rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={kaydet}
            disabled={islemYapiliyor}
            className="rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            Kaydet
          </button>
          <button
            onClick={() => {
              setBaslik(hatirlatici.baslik);
              setTarih(hatirlatici.hatirlatma_tarihi);
              setDuzenlemeModu(false);
            }}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-paper"
          >
            Vazgeç
          </button>
        </div>
        {hata && <p className="mt-1 text-xs text-expense">{hata}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3">
        <button
          onClick={tamamlandiDegistir}
          disabled={islemYapiliyor}
          aria-label={hatirlatici.tamamlandi ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition-colors ${
            hatirlatici.tamamlandi
              ? "border-pine bg-pine text-white"
              : "border-line bg-card hover:border-ochre"
          }`}
        >
          {hatirlatici.tamamlandi && "✓"}
        </button>
        <div>
          <p className={hatirlatici.tamamlandi ? "text-sm text-ink-soft/70 line-through" : "text-sm text-ink"}>
            {hatirlatici.baslik}
          </p>
          <p className="text-xs text-ink-soft/70">
            {hatirlatici.hatirlatma_tarihi}
            {kimEkledi(hatirlatici) && ` · ${kimEkledi(hatirlatici)}`}
          </p>
          {hata && <p className="mt-1 text-xs text-expense">{hata}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-3">
        <button onClick={() => setDuzenlemeModu(true)} className="text-xs text-ink-soft hover:text-ink">
          Düzenle
        </button>
        <button onClick={sil} disabled={islemYapiliyor} className="text-xs text-expense/70 hover:text-expense">
          Sil
        </button>
      </div>
    </li>
  );
}

type Filtre = "hepsi" | "aktif" | "tamamlanan";

export function HatirlaticilarListesi({ hatirlaticilar }: { hatirlaticilar: HatirlaticiVerisi[] }) {
  const [filtre, setFiltre] = useState<Filtre>("aktif");
  const [tarihAraligi, setTarihAraligi] = useState<TarihAraligi>({ baslangic: "", bitis: "" });

  const filtrelenmis = useMemo(() => {
    let liste = hatirlaticilar;
    if (filtre === "aktif") liste = liste.filter((h) => !h.tamamlandi);
    else if (filtre === "tamamlanan") liste = liste.filter((h) => h.tamamlandi);
    if (tarihAraligi.baslangic) liste = liste.filter((h) => h.hatirlatma_tarihi >= tarihAraligi.baslangic);
    if (tarihAraligi.bitis) liste = liste.filter((h) => h.hatirlatma_tarihi <= tarihAraligi.bitis);
    return liste;
  }, [hatirlaticilar, filtre, tarihAraligi]);

  return (
    <div>
      <AyGezici onDegisti={setTarihAraligi} varsayilanTumu />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-xs">
          {(["aktif", "tamamlanan", "hepsi"] as const).map((secenek) => (
            <button
              key={secenek}
              onClick={() => setFiltre(secenek)}
              className={`rounded-full px-3 py-1 font-medium ${
                filtre === secenek ? "bg-pine text-white" : "bg-paper text-ink-soft hover:bg-line"
              }`}
            >
              {secenek === "aktif" ? "Aktif" : secenek === "tamamlanan" ? "Tamamlanan" : "Hepsi"}
            </button>
          ))}
        </div>
        <TarihAraligiFiltresi deger={tarihAraligi} onDegisti={setTarihAraligi} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {filtrelenmis.length === 0 && (
          <li className="py-3 text-sm text-ink-soft/70">Bu filtrede hatırlatıcı yok.</li>
        )}
        {filtrelenmis.map((h) => (
          <HatirlaticiSatiri key={h.id} hatirlatici={h} />
        ))}
      </ul>
    </div>
  );
}
