"use client";

import { useRef, useState, useTransition } from "react";
import { fisiOku } from "@/app/actions/ocr";
import { islemEkle } from "@/app/actions/islemler";
import { bugunIstanbul as bugun } from "@/lib/tarih";
import type { IslemTuru, Musteri } from "@/types/database";

export function YeniIslemFormu({
  musteriler = [],
  sabitMusteriId,
  baslik = "Yeni İşlem",
}: {
  musteriler?: Musteri[];
  /** Verilirse müşteri seçilemez, işlem doğrudan bu müşteriye bağlanır (ör. müşteri kartından ekleme). */
  sabitMusteriId?: string;
  baslik?: string;
}) {
  const [tur, setTur] = useState<IslemTuru>("gider");
  const [tutar, setTutar] = useState("");
  const [tarih, setTarih] = useState(bugun());
  const [aciklama, setAciklama] = useState("");
  const [kategori, setKategori] = useState("");
  const [fisGorselUrl, setFisGorselUrl] = useState("");
  const [musteriId, setMusteriId] = useState(sabitMusteriId ?? "");

  const [ocrOkuyor, ocrBaslat] = useTransition();
  const [ocrHata, setOcrHata] = useState<string | null>(null);
  const [gonderiliyor, gonderBaslat] = useTransition();
  const [gonderHata, setGonderHata] = useState<string | null>(null);

  const kameraInputRef = useRef<HTMLInputElement>(null);
  const galeriInputRef = useRef<HTMLInputElement>(null);

  function fisSecildi(dosya: File) {
    setOcrHata(null);
    ocrBaslat(async () => {
      const formData = new FormData();
      formData.append("fis", dosya);
      const sonuc = await fisiOku(formData);

      if (sonuc.hata) {
        setOcrHata(sonuc.hata);
        return;
      }

      if (sonuc.tutar) setTutar(String(sonuc.tutar));
      if (sonuc.tarih) setTarih(sonuc.tarih);
      if (sonuc.aciklama) setAciklama(sonuc.aciklama);
      if (sonuc.kategori) setKategori(sonuc.kategori);
      if (sonuc.tur) setTur(sonuc.tur);
      if (sonuc.fisGorselUrl) setFisGorselUrl(sonuc.fisGorselUrl);
    });
  }

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setGonderHata(null);
    gonderBaslat(async () => {
      const formData = new FormData();
      formData.set("tur", tur);
      formData.set("tutar", tutar);
      formData.set("tarih", tarih);
      formData.set("aciklama", aciklama);
      formData.set("kategori", kategori);
      formData.set("fis_gorsel_url", fisGorselUrl);
      formData.set("musteri_id", musteriId);

      try {
        await islemEkle(formData);
        setTutar("");
        setAciklama("");
        setKategori("");
        setFisGorselUrl("");
        setMusteriId(sabitMusteriId ?? "");
        setTarih(bugun());
        if (kameraInputRef.current) kameraInputRef.current.value = "";
        if (galeriInputRef.current) galeriInputRef.current.value = "";
      } catch (err) {
        setGonderHata(err instanceof Error ? err.message : "İşlem eklenemedi.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-sm font-semibold text-ink">{baslik}</h2>

      <div className="mt-3 rounded-md bg-paper p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={ocrOkuyor}
            onClick={() => kameraInputRef.current?.click()}
            className="flex-1 rounded-md border border-line bg-card px-4 py-3 text-sm font-medium text-ink-soft hover:bg-paper disabled:opacity-50 sm:flex-none"
          >
            📷 Fotoğraf Çek
          </button>
          <button
            type="button"
            disabled={ocrOkuyor}
            onClick={() => galeriInputRef.current?.click()}
            className="flex-1 rounded-md border border-line bg-card px-4 py-3 text-sm font-medium text-ink-soft hover:bg-paper disabled:opacity-50 sm:flex-none"
          >
            🖼️ Galeriden Seç
          </button>
          <input
            ref={kameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const dosya = e.target.files?.[0];
              if (dosya) fisSecildi(dosya);
            }}
            className="hidden"
          />
          <input
            ref={galeriInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const dosya = e.target.files?.[0];
              if (dosya) fisSecildi(dosya);
            }}
            className="hidden"
          />
        </div>
        {ocrOkuyor && <p className="mt-2 text-xs text-ink-soft">Fiş okunuyor...</p>}
        {fisGorselUrl && !ocrOkuyor && (
          <p className="mt-2 text-xs text-income">Fiş okundu, alanları kontrol et ✓</p>
        )}
      </div>
      {ocrHata && (
        <p className="mt-2 rounded-md bg-expense/10 px-3 py-2 text-xs text-expense">{ocrHata}</p>
      )}
      <p className="mt-2 text-xs text-ink-soft/70">
        Fiş fotoğrafı seçersen alanlar otomatik doldurulur — kontrol edip gerekirse düzelt, sonra kaydet.
      </p>

      <form onSubmit={gonder} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <select
          value={tur}
          onChange={(e) => setTur(e.target.value as IslemTuru)}
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="gelir">Gelir</option>
          <option value="gider">Gider</option>
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={tutar}
          onChange={(e) => setTutar(e.target.value)}
          placeholder="Tutar (₺)"
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          type="date"
          required
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          placeholder="Kategori (ops.)"
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          required
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Açıklama"
          className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
        />
        {!sabitMusteriId && (
          <select
            value={musteriId}
            onChange={(e) => setMusteriId(e.target.value)}
            className="col-span-1 rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="">Müşteri (ops.)</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad_soyad}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={gonderiliyor}
          className="col-span-1 rounded-md bg-pine px-3 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
        >
          {gonderiliyor ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
      {gonderHata && (
        <p className="mt-2 rounded-md bg-expense/10 px-3 py-2 text-xs text-expense">{gonderHata}</p>
      )}
    </div>
  );
}
