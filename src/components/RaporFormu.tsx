"use client";

import { useState, useTransition } from "react";
import { raporGetir, type RaporSonucu } from "@/app/actions/raporlar";
import { bugunIstanbul } from "@/lib/tarih";
import type { Musteri } from "@/types/database";

function formatTL(tutar: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(tutar);
}

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function RaporFormu({ musteriler }: { musteriler: Musteri[] }) {
  const suAn = new Date(bugunIstanbul());
  const [kapsam, setKapsam] = useState<"genel" | "musteri">("genel");
  const [musteriId, setMusteriId] = useState("");
  const [periyot, setPeriyot] = useState<"ay" | "yil">("ay");
  const [ay, setAy] = useState(suAn.getMonth() + 1);
  const [yil, setYil] = useState(suAn.getFullYear());
  const [sonuc, setSonuc] = useState<RaporSonucu | null>(null);
  const [yukleniyor, baslat] = useTransition();

  const yillar = Array.from({ length: 6 }, (_, i) => suAn.getFullYear() - i);

  function raporuGoster() {
    baslat(async () => {
      const cikti = await raporGetir({
        kapsam,
        musteriId: kapsam === "musteri" ? musteriId : undefined,
        periyot,
        ay: periyot === "ay" ? ay : undefined,
        yil,
      });
      setSonuc(cikti);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <select
          value={kapsam}
          onChange={(e) => setKapsam(e.target.value as "genel" | "musteri")}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="genel">Genel (Tüm Kooperatif)</option>
          <option value="musteri">Müşteri Bazlı</option>
        </select>

        {kapsam === "musteri" && (
          <select
            value={musteriId}
            onChange={(e) => setMusteriId(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <option value="">Müşteri seç...</option>
            {musteriler.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ad_soyad}
              </option>
            ))}
          </select>
        )}

        <select
          value={periyot}
          onChange={(e) => setPeriyot(e.target.value as "ay" | "yil")}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="ay">Aylık</option>
          <option value="yil">Yıllık</option>
        </select>

        {periyot === "ay" && (
          <select
            value={ay}
            onChange={(e) => setAy(Number(e.target.value))}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            {AYLAR.map((adi, i) => (
              <option key={adi} value={i + 1}>
                {adi}
              </option>
            ))}
          </select>
        )}

        <select
          value={yil}
          onChange={(e) => setYil(Number(e.target.value))}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          {yillar.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={raporuGoster}
        disabled={yukleniyor || (kapsam === "musteri" && !musteriId)}
        className="mt-3 rounded-md bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-deep disabled:opacity-50"
      >
        {yukleniyor ? "Hesaplanıyor..." : "Raporu Göster"}
      </button>

      {sonuc?.hata && <p className="mt-3 text-sm text-expense">{sonuc.hata}</p>}

      {sonuc && !sonuc.hata && (
        <div className="mt-5 rounded-lg border border-line bg-paper p-4">
          <p className="mb-3 text-xs text-ink-soft/70">
            {sonuc.musteriAdi ? `${sonuc.musteriAdi} · ` : "Genel · "}
            {sonuc.baslangic} — {sonuc.bitis} ({sonuc.islemSayisi} işlem)
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-soft/70">Toplam Gelir</p>
              <p className="font-semibold text-income">{formatTL(sonuc.gelir ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft/70">Toplam Gider</p>
              <p className="font-semibold text-expense">{formatTL(sonuc.gider ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft/70">Net</p>
              <p className="font-semibold text-ink">{formatTL(sonuc.net ?? 0)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
