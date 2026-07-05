"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { islemGuncelle, islemSil, islemOdendiDegistir, islemDekontYukle } from "@/app/actions/islemler";
import { TarihAraligiFiltresi, type TarihAraligi } from "@/components/TarihAraligiFiltresi";
import { AyGezici } from "@/components/AyGezici";
import type { Islem, IslemTuru, Musteri } from "@/types/database";

type IslemVerisi = Pick<
  Islem,
  | "id"
  | "tur"
  | "tutar"
  | "tarih"
  | "aciklama"
  | "kategori"
  | "telegram_gonderen"
  | "odendi"
  | "dekont_url"
  | "musteri_id"
> & {
  profiller: { ad_soyad: string } | null;
  musteri: { ad_soyad: string } | null;
};

function kimEkledi(islem: IslemVerisi): string | null {
  return islem.telegram_gonderen ?? islem.profiller?.ad_soyad ?? null;
}

function formatTL(tutar: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
}

function IslemSatiri({
  islem,
  duzenlenebilir,
  musteriler,
}: {
  islem: IslemVerisi;
  duzenlenebilir: boolean;
  musteriler: Musteri[];
}) {
  const [duzenlemeModu, setDuzenlemeModu] = useState(false);
  const [tur, setTur] = useState<IslemTuru>(islem.tur);
  const [tutar, setTutar] = useState(String(islem.tutar));
  const [tarih, setTarih] = useState(islem.tarih);
  const [aciklama, setAciklama] = useState(islem.aciklama);
  const [kategori, setKategori] = useState(islem.kategori ?? "");
  const [musteriId, setMusteriId] = useState(islem.musteri_id ?? "");
  const [islemYapiliyor, islemBaslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const dosyaInputRef = useRef<HTMLInputElement>(null);

  function kaydet() {
    setHata(null);
    islemBaslat(async () => {
      try {
        await islemGuncelle(islem.id, {
          tur,
          tutar: Number(tutar),
          tarih,
          aciklama,
          kategori: kategori || null,
          musteriId: musteriId || null,
        });
        setDuzenlemeModu(false);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Kaydedilemedi.");
      }
    });
  }

  function sil() {
    if (!confirm("Bu işlemi silmek istediğine emin misin?")) return;
    islemBaslat(async () => {
      try {
        await islemSil(islem.id);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Silinemedi.");
      }
    });
  }

  function odendiDegistir() {
    setHata(null);
    islemBaslat(async () => {
      try {
        await islemOdendiDegistir(islem.id, !islem.odendi);
      } catch (e) {
        setHata(e instanceof Error ? e.message : "Güncellenemedi.");
      }
    });
  }

  function dekontSecildi(e: React.ChangeEvent<HTMLInputElement>) {
    const dosya = e.target.files?.[0];
    if (!dosya) return;
    setHata(null);
    const formData = new FormData();
    formData.set("dekont", dosya);
    islemBaslat(async () => {
      try {
        await islemDekontYukle(islem.id, formData);
      } catch (err) {
        setHata(err instanceof Error ? err.message : "Dekont yüklenemedi.");
      } finally {
        if (dosyaInputRef.current) dosyaInputRef.current.value = "";
      }
    });
  }

  if (duzenlemeModu) {
    return (
      <li className="py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <select
            value={tur}
            onChange={(e) => setTur(e.target.value as IslemTuru)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="gelir">Gelir</option>
            <option value="gider">Gider</option>
          </select>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={tutar}
            onChange={(e) => setTutar(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            placeholder="Kategori"
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <input
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Açıklama"
            className="rounded-md border border-line px-3 py-2 text-sm"
          />
          <select
            value={musteriId}
            onChange={(e) => setMusteriId(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="">Müşteri (ops.)</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad_soyad}
              </option>
            ))}
          </select>
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
              setTur(islem.tur);
              setTutar(String(islem.tutar));
              setTarih(islem.tarih);
              setAciklama(islem.aciklama);
              setMusteriId(islem.musteri_id ?? "");
              setKategori(islem.kategori ?? "");
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
    <li className="py-2 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-ink">{islem.aciklama}</p>
          <p className="text-xs text-ink-soft/70">
            {islem.tarih} {islem.kategori ? `· ${islem.kategori}` : ""}
            {kimEkledi(islem) ? ` · ${kimEkledi(islem)}` : ""}
            {islem.musteri && islem.musteri_id && (
              <>
                {" · "}
                <Link href={`/musteriler/${islem.musteri_id}`} className="text-violet hover:underline">
                  {islem.musteri.ad_soyad}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={islem.tur === "gelir" ? "text-income" : "text-expense"}>
            {islem.tur === "gelir" ? "+" : "-"}
            {formatTL(islem.tutar)}
          </span>
          {duzenlenebilir && (
            <>
              <button onClick={() => setDuzenlemeModu(true)} className="text-xs text-ink-soft hover:text-ink">
                Düzenle
              </button>
              <button onClick={sil} disabled={islemYapiliyor} className="text-xs text-expense/70 hover:text-expense">
                Sil
              </button>
            </>
          )}
        </div>
      </div>

      {islem.tur === "gider" && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={odendiDegistir}
            disabled={islemYapiliyor || !duzenlenebilir}
            className={`rounded-full px-2.5 py-1 font-medium disabled:cursor-not-allowed ${
              islem.odendi ? "bg-income/10 text-income" : "bg-paper text-ink-soft hover:bg-line"
            }`}
          >
            {islem.odendi ? "✓ Ödendi" : "Ödenmedi"}
          </button>

          {islem.dekont_url && (
            <a
              href={islem.dekont_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet hover:underline"
            >
              📎 Dekontu Gör
            </a>
          )}

          {duzenlenebilir && (
            <label className="cursor-pointer text-ink-soft hover:text-ink">
              {islem.dekont_url ? "Dekontu Değiştir" : "Dekont Yükle"}
              <input
                ref={dosyaInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={dekontSecildi}
                disabled={islemYapiliyor}
                className="hidden"
              />
            </label>
          )}
        </div>
      )}
      {hata && <p className="mt-1 text-xs text-expense">{hata}</p>}
    </li>
  );
}

type Filtre = "hepsi" | "gelir" | "gider";

export function IslemlerListesi({
  islemler,
  duzenlenebilir,
  musteriler,
}: {
  islemler: IslemVerisi[];
  duzenlenebilir: boolean;
  musteriler: Musteri[];
}) {
  const [filtre, setFiltre] = useState<Filtre>("hepsi");
  const [arama, setArama] = useState("");
  const [tarihAraligi, setTarihAraligi] = useState<TarihAraligi>({ baslangic: "", bitis: "" });

  const filtrelenmis = useMemo(() => {
    let liste = islemler;
    if (filtre !== "hepsi") liste = liste.filter((i) => i.tur === filtre);
    if (tarihAraligi.baslangic) liste = liste.filter((i) => i.tarih >= tarihAraligi.baslangic);
    if (tarihAraligi.bitis) liste = liste.filter((i) => i.tarih <= tarihAraligi.bitis);
    if (arama.trim()) {
      const kucukArama = arama.trim().toLocaleLowerCase("tr-TR");
      liste = liste.filter(
        (i) =>
          i.aciklama.toLocaleLowerCase("tr-TR").includes(kucukArama) ||
          (i.kategori ?? "").toLocaleLowerCase("tr-TR").includes(kucukArama)
      );
    }
    return liste;
  }, [islemler, filtre, arama, tarihAraligi]);

  const toplamlar = useMemo(() => {
    const gelir = filtrelenmis.filter((i) => i.tur === "gelir").reduce((t, i) => t + i.tutar, 0);
    const gider = filtrelenmis.filter((i) => i.tur === "gider").reduce((t, i) => t + i.tutar, 0);
    return { gelir, gider, net: gelir - gider };
  }, [filtrelenmis]);

  return (
    <div>
      <AyGezici onDegisti={setTarihAraligi} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 text-xs">
          {(["hepsi", "gelir", "gider"] as const).map((secenek) => (
            <button
              key={secenek}
              onClick={() => setFiltre(secenek)}
              className={`rounded-full px-3 py-1 font-medium ${
                filtre === secenek ? "bg-pine text-white" : "bg-paper text-ink-soft hover:bg-line"
              }`}
            >
              {secenek === "hepsi" ? "Hepsi" : secenek === "gelir" ? "Gelir" : "Gider"}
            </button>
          ))}
        </div>
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Açıklama/kategoride ara..."
          className="rounded-md border border-line px-3 py-1.5 text-xs sm:w-56"
        />
        <TarihAraligiFiltresi deger={tarihAraligi} onDegisti={setTarihAraligi} />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {filtrelenmis.length === 0 && (
          <li className="py-3 text-sm text-ink-soft/70">Bu filtrede işlem yok.</li>
        )}
        {filtrelenmis.map((islem) => (
          <IslemSatiri key={islem.id} islem={islem} duzenlenebilir={duzenlenebilir} musteriler={musteriler} />
        ))}
      </ul>

      {filtrelenmis.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <p className="text-xs text-ink-soft/70">Toplam Gelir</p>
            <p className="font-semibold text-income">{formatTL(toplamlar.gelir)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft/70">Toplam Gider</p>
            <p className="font-semibold text-expense">{formatTL(toplamlar.gider)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft/70">Net</p>
            <p className="font-semibold text-ink">{formatTL(toplamlar.net)}</p>
          </div>
        </div>
      )}

      {filtrelenmis.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            disabled
            title="Mali müşavirden rapor formatı alınınca aktif edilecek."
            className="cursor-not-allowed rounded-md border border-line bg-paper px-4 py-2 text-sm text-ink-soft/70"
          >
            📧 Bu Görünümü Mali Müşavire Gönder (yakında)
          </button>
        </div>
      )}
    </div>
  );
}
