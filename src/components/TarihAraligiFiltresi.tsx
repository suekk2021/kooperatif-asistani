"use client";

export type TarihAraligi = { baslangic: string; bitis: string };

export function TarihAraligiFiltresi({
  deger,
  onDegisti,
}: {
  deger: TarihAraligi;
  onDegisti: (yeni: TarihAraligi) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="text-ink-soft">Tarih:</label>
      <input
        type="date"
        value={deger.baslangic}
        onChange={(e) => onDegisti({ ...deger, baslangic: e.target.value })}
        className="rounded-md border border-line px-2 py-1.5 text-xs"
      />
      <span className="text-ink-soft/70">–</span>
      <input
        type="date"
        value={deger.bitis}
        onChange={(e) => onDegisti({ ...deger, bitis: e.target.value })}
        className="rounded-md border border-line px-2 py-1.5 text-xs"
      />
      {(deger.baslangic || deger.bitis) && (
        <button
          onClick={() => onDegisti({ baslangic: "", bitis: "" })}
          className="text-ink-soft/70 hover:text-ink-soft"
        >
          Temizle
        </button>
      )}
    </div>
  );
}
