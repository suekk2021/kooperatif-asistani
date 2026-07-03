"use client";

import { useEffect, useState } from "react";
import type { TarihAraligi } from "@/components/TarihAraligiFiltresi";
import { bugunIstanbul } from "@/lib/tarih";

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function ayAraligiHesapla(yil: number, ay: number): TarihAraligi {
  const ayStr = String(ay + 1).padStart(2, "0");
  const sonGun = new Date(yil, ay + 1, 0).getDate();
  return { baslangic: `${yil}-${ayStr}-01`, bitis: `${yil}-${ayStr}-${String(sonGun).padStart(2, "0")}` };
}

export function AyGezici({
  onDegisti,
  varsayilanTumu = false,
}: {
  onDegisti: (araligi: TarihAraligi) => void;
  /** true ise başlangıçta "Tüm Zamanlar" gösterilir - örn. aktif hatırlatıcılar gelecek ayları da kapsasın diye. */
  varsayilanTumu?: boolean;
}) {
  const bugun = bugunIstanbul();
  const [yil, setYil] = useState(varsayilanTumu ? 0 : Number(bugun.slice(0, 4)));
  const [ay, setAy] = useState(varsayilanTumu ? 0 : Number(bugun.slice(5, 7)) - 1);

  // İlk yüklemede, varsayilanTumu degilse icinde bulunulan ayı uygula (sadece mount'ta calışsın).
  useEffect(() => {
    if (!varsayilanTumu) {
      onDegisti(ayAraligiHesapla(yil, ay));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ayDegistir(delta: number) {
    const suAnkiYil = yil === 0 ? Number(bugun.slice(0, 4)) : yil;
    const suAnkiAy = yil === 0 ? Number(bugun.slice(5, 7)) - 1 : ay;
    let yeniAy = suAnkiAy + delta;
    let yeniYil = suAnkiYil;
    if (yeniAy < 0) {
      yeniAy = 11;
      yeniYil -= 1;
    } else if (yeniAy > 11) {
      yeniAy = 0;
      yeniYil += 1;
    }
    setAy(yeniAy);
    setYil(yeniYil);
    onDegisti(ayAraligiHesapla(yeniYil, yeniAy));
  }

  function tumunuGoster() {
    setYil(0);
    setAy(0);
    onDegisti({ baslangic: "", bitis: "" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          onClick={() => ayDegistir(-1)}
          aria-label="Önceki ay"
          className="rounded-md border border-line px-2 py-1 hover:bg-paper"
        >
          ‹
        </button>
        <span className="min-w-28 text-center font-medium text-ink-soft">
          {yil === 0 ? "Tüm Zamanlar" : `${AY_ADLARI[ay]} ${yil}`}
        </span>
        <button
          onClick={() => ayDegistir(1)}
          aria-label="Sonraki ay"
          className="rounded-md border border-line px-2 py-1 hover:bg-paper"
        >
          ›
        </button>
      </div>
      {yil !== 0 && (
        <button onClick={tumunuGoster} className="text-ink-soft/70 hover:text-ink-soft">
          Tümünü göster
        </button>
      )}
      {yil === 0 && (
        <span className="text-ink-soft/70">‹ › ile belirli bir ayı görebilirsin</span>
      )}
    </div>
  );
}
