import type { ReactNode } from "react";

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
