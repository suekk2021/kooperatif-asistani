import Image from "next/image";
import type { ReactNode } from "react";
import pinler from "./pinler.json";

// Rehber sayfaları için ekran maketleri: programın gerçek stil sınıflarıyla çizilir, tıklanmaz.
// Numaralı kırmızı daireler (No) maketin altındaki açıklama listesindeki numaralarla eşleşir.

export function No({ n }: { n: number }) {
  return <i className="mk-no">{n}</i>;
}

export function Maket({ children }: { children: ReactNode }) {
  return (
    <div className="maket" aria-hidden="true">
      {children}
    </div>
  );
}

export function Aciklama({ maddeler }: { maddeler: ReactNode[] }) {
  return (
    <ol className="mk-aciklama">
      {maddeler.map((m, i) => (
        <li key={i}>
          <No n={i + 1} />
          <span>{m}</span>
        </li>
      ))}
    </ol>
  );
}

export function Alan({ ad, deger, no, genis }: { ad: string; deger?: string; no?: number; genis?: boolean }) {
  return (
    <div className="alan" style={genis ? { flex: "2 1 220px" } : undefined}>
      <label>
        {ad}
        {no && <No n={no} />}
      </label>
      <input readOnly tabIndex={-1} defaultValue={deger} />
    </div>
  );
}

export function Secim({ ad, deger, no }: { ad: string; deger: string; no?: number }) {
  return (
    <div className="alan">
      <label>
        {ad}
        {no && <No n={no} />}
      </label>
      <select tabIndex={-1} defaultValue={deger}>
        <option>{deger}</option>
      </select>
    </div>
  );
}

export function Dugme({ ad, ana, no }: { ad: string; ana?: boolean; no?: number }) {
  return (
    <span className={`btn ${ana ? "btn-ana" : "btn-cizgi"}`}>
      {ad}
      {no && <No n={no} />}
    </span>
  );
}


type Pin = { n: number; x?: number; y?: number; yok?: boolean };
type Ekranlar = Record<string, { boyut: number[]; pinler: Pin[] }>;

/** Programın gerçek ekran görüntüsü (public/rehber) + üzerinde numaralı işaretler (pinler.json'da yüzde olarak). */
export function Ekran({ ad, alt }: { ad: string; alt: string }) {
  const e = (pinler as Ekranlar)[ad];
  return (
    <div className="ekran-kutu">
      <div className="ekran-ic">
        <Image src={`/rehber/${ad}.png`} alt={alt} width={e.boyut[0]} height={e.boyut[1]} unoptimized />
        {e.pinler
          .filter((p) => !p.yok && p.x !== undefined && p.y !== undefined)
          .map((p) => (
            <i key={p.n} className="mk-no ekran-pin" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {p.n}
            </i>
          ))}
      </div>
      <span className="ekran-not">Programın gerçek ekranı (yalnızca ilgili bölüm)</span>
    </div>
  );
}
