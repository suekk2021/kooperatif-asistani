"use client";

import { useMemo, useState, useTransition } from "react";
import { notGuncelle, notSil } from "@/app/actions/notlar";
import { TarihAraligiFiltresi, type TarihAraligi } from "@/components/TarihAraligiFiltresi";
import { AyGezici } from "@/components/AyGezici";
import { gunIstanbul } from "@/lib/tarih";
import type { Not } from "@/types/database";

type NotSatiriVerisi = Pick<Not, "id" | "icerik" | "kaynak" | "created_at" | "telegram_gonderen"> & {
  hedef: { ad_soyad: string } | null;
};

function formatZamanIstanbul(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotSatiri({ not, duzenlenebilir }: { not: NotSatiriVerisi; duzenlenebilir: boolean }) {
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [icerik, setIcerik] = useState(not.icerik);
  const [kaydediliyor, kaydetBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function kaydet() {
    setHata(null);
    kaydetBaslat(async () => {
      try {
        await notGuncelle(not.id, icerik);
        setDuzenlemeModu(false);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  function sil() {
    if (!confirm("Bu notu silmek istediğine emin misin?")) return;
    kaydetBaslat(async () => {
      try {
        await notSil(not.id);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Silinemedi.");
      }
    });
  }

  if (duzenlemeModu) {
    return (
      <li className="py-3">
        <textarea
          value={icerik}
          onChange={(e) => setIcerik(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={kaydet}
            disabled={kaydediliyor}
            className="rounded-md bg-pine px-3 py-1.5 text-xs font-medium text-white hover:bg-pine-deep disabled:opacity-50"
          >
            Kaydet
          </button>
          <button
            onClick={() => {
              setIcerik(not.icerik);
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
    <li className="py-3">
      <p className="text-sm text-ink">{not.icerik}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-ink-soft/70">
          {formatZamanIstanbul(not.created_at)} · {not.kaynak === "telegram" ? "Telegram" : "Web"}
          {not.telegram_gonderen && ` · ${not.telegram_gonderen}`}
          {not.hedef && ` · Kime: ${not.hedef.ad_soyad}`}
        </p>
        {duzenlenebilir && (
          <div className="flex gap-3">
            <button onClick={() => setDuzenlemeModu(true)} className="text-xs text-ink-soft hover:text-ink">
              Düzenle
            </button>
            <button onClick={sil} disabled={kaydediliyor} className="text-xs text-expense/70 hover:text-expense">
              Sil
            </button>
          </div>
        )}
      </div>
      {hata && <p className="mt-1 text-xs text-expense">{hata}</p>}
    </li>
  );
}

export function NotlarListesi({
  notlar,
  duzenlenebilir,
}: {
  notlar: NotSatiriVerisi[];
  duzenlenebilir: boolean;
}) {
  const [arama, setArama] = useState("");
  const [tarihAraligi, setTarihAraligi] = useState<TarihAraligi>({ baslangic: "", bitis: "" });

  const filtrelenmis = useMemo(() => {
    let liste = notlar;
    if (tarihAraligi.baslangic) liste = liste.filter((n) => gunIstanbul(n.created_at) >= tarihAraligi.baslangic);
    if (tarihAraligi.bitis) liste = liste.filter((n) => gunIstanbul(n.created_at) <= tarihAraligi.bitis);
    if (arama.trim()) {
      const kucukArama = arama.trim().toLocaleLowerCase("tr-TR");
      liste = liste.filter((n) => n.icerik.toLocaleLowerCase("tr-TR").includes(kucukArama));
    }
    return liste;
  }, [notlar, arama, tarihAraligi]);

  return (
    <div>
      <AyGezici onDegisti={setTarihAraligi} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Notlarda ara..."
          className="rounded-md border border-line px-3 py-2 text-sm sm:w-72"
        />
        <TarihAraligiFiltresi deger={tarihAraligi} onDegisti={setTarihAraligi} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {filtrelenmis.length === 0 && (
          <li className="py-3 text-sm text-ink-soft/70">
            {notlar.length === 0 ? "Henüz not yok." : "Aramayla eşleşen not yok."}
          </li>
        )}
        {filtrelenmis.map((not) => (
          <NotSatiri key={not.id} not={not} duzenlenebilir={duzenlenebilir} />
        ))}
      </ul>
    </div>
  );
}
