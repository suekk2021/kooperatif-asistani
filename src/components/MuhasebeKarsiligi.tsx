import { tl } from "@/lib/imece";
import type { YevmiyeSatiri } from "@/types/database";

/** Tablo hücresi için kısa gösterim: "102.01 B · 120.01.002 A" */
export function FisOzeti({ satirlar }: { satirlar: YevmiyeSatiri[] }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "4px 8px", justifyContent: "flex-end" }}>
      {satirlar.map((s) => (
        <span key={s.id} style={{ whiteSpace: "nowrap" }}>
          <span className="kod">{s.hesap_kodu}</span> {Number(s.borc) > 0 ? "B" : "A"}
        </span>
      ))}
    </span>
  );
}

/** Belge detayındaki "Muhasebe karşılığı" kutusu (taslaktaki .muh). */
export function MuhasebeKarsiligi({
  baslik = "Muhasebe karşılığı",
  satirlar,
  hesapAdlari,
  etiket,
}: {
  baslik?: string;
  satirlar: YevmiyeSatiri[];
  hesapAdlari: Map<string, string>;
  etiket?: string;
}) {
  const borc = satirlar.reduce((t, s) => t + Number(s.borc), 0);
  const alacak = satirlar.reduce((t, s) => t + Number(s.alacak), 0);
  return (
    <div className="muh">
      <div className="kart-bas">
        <h2>
          ⇄ {baslik} <span className="etk e-gri">{etiket ?? "otomatik"}</span>
        </h2>
        {Math.abs(borc - alacak) < 0.005 && <span className="etk e-yesil">Borç = Alacak ✓</span>}
      </div>
      <div className="tablo-kutu">
        <table className="kart-tablo">
          <thead>
            <tr>
              <th>Hesap kodu</th>
              <th>Hesap adı</th>
              <th className="sag">Borç</th>
              <th className="sag">Alacak</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="kod">{s.hesap_kodu}</span>
                </td>
                <td data-label="Hesap">{s.aciklama ?? hesapAdlari.get(s.hesap_kodu) ?? ""}</td>
                <td data-label="Borç" className="sag num">
                  {Number(s.borc) > 0 ? tl(s.borc) : ""}
                </td>
                <td data-label="Alacak" className="sag num">
                  {Number(s.alacak) > 0 ? tl(s.alacak) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
