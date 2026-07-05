"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { musteriSil } from "@/app/actions/musteriler";
import type { Musteri } from "@/types/database";

export function MusterilerListesi({
  musteriler,
  duzenlenebilir,
}: {
  musteriler: Musteri[];
  duzenlenebilir: boolean;
}) {
  const [arama, setArama] = useState("");
  const [islemYapiliyor, islemBaslat] = useTransition();
  const [silinenler, setSilinenler] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);

  const filtrelenmis = useMemo(() => {
    let liste = musteriler.filter((m) => !silinenler.has(m.id));
    if (arama.trim()) {
      const kucukArama = arama.trim().toLocaleLowerCase("tr-TR");
      liste = liste.filter(
        (m) =>
          m.ad_soyad.toLocaleLowerCase("tr-TR").includes(kucukArama) ||
          (m.telefon ?? "").toLocaleLowerCase("tr-TR").includes(kucukArama)
      );
    }
    return liste;
  }, [musteriler, arama, silinenler]);

  function sil(id: string, adSoyad: string) {
    if (!confirm(`${adSoyad} adlı müşteriyi silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;
    setHata(null);
    islemBaslat(async () => {
      const sonuc = await musteriSil(id);
      if (sonuc.hata) setHata(sonuc.hata);
      else setSilinenler((onceki) => new Set(onceki).add(id));
    });
  }

  return (
    <div>
      <input
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder="Müşteri adı/telefonda ara..."
        className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm sm:w-72"
      />
      {hata && <p className="mt-2 text-xs text-expense">{hata}</p>}
      <ul className="mt-3 divide-y divide-line">
        {filtrelenmis.length === 0 && (
          <li className="py-3 text-sm text-ink-soft/70">
            {musteriler.length === 0 ? "Henüz müşteri yok." : "Aramayla eşleşen müşteri yok."}
          </li>
        )}
        {filtrelenmis.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2 text-sm">
            <div>
              <Link href={`/musteriler/${m.id}`} className="font-medium text-ink hover:text-pine">
                {m.ad_soyad}
              </Link>
              {m.telefon && <p className="text-xs text-ink-soft/70">{m.telefon}</p>}
            </div>
            {duzenlenebilir && (
              <button
                onClick={() => sil(m.id, m.ad_soyad)}
                disabled={islemYapiliyor}
                className="text-xs text-expense/70 hover:text-expense disabled:opacity-50"
              >
                Sil
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
