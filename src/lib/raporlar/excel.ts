import ExcelJS from "exceljs";
import type { Rapor, SutunTuru } from "./tipler";

const BICIM: Record<SutunTuru, string | undefined> = {
  metin: undefined,
  tl: "#,##0.00 [$₺-41F];[Red]-#,##0.00 [$₺-41F]",
  sayi: "#,##0.###",
  yuzde: '"%"0.0',
  tarih: "dd.mm.yyyy",
};

/** Her bölüm ayrı sayfa; hücreler gerçek sayı/tarih olarak yazılır (Excel'de toplanabilir, Mikro'ya aktarılabilir). */
export async function raporExcel(rapor: Rapor, kurum: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "İMECE";
  wb.created = new Date();
  const kullanilan = new Set<string>();

  for (const bolum of rapor.bolumler) {
    // Excel sayfa adı en fazla 31 karakter, bazı işaretler yasak, tekil olmalı.
    let ad = bolum.baslik.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim();
    for (let i = 2; kullanilan.has(ad); i++) ad = `${ad.slice(0, 28)} ${i}`;
    kullanilan.add(ad);
    const ws = wb.addWorksheet(ad);

    ws.addRow([`${kurum} — ${rapor.baslik}`]).font = { bold: true, size: 13 };
    ws.addRow([`${bolum.baslik} · ${rapor.donemYazisi}`]).font = { color: { argb: "FF666666" } };
    ws.addRow([]);
    const baslik = ws.addRow(bolum.sutunlar.map((s) => s.ad));
    baslik.font = { bold: true };
    baslik.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF0F5" } };
      c.border = { bottom: { style: "thin" } };
    });
    const ilkVeriSatiri = ws.rowCount + 1;

    const hucreDegeri = (v: string | number | null, tur: SutunTuru) => {
      if (v === null || v === "") return null;
      if (tur === "tarih" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
      return v;
    };
    for (const satir of bolum.satirlar) ws.addRow(satir.map((v, i) => hucreDegeri(v, bolum.sutunlar[i].tur)));
    if (bolum.toplam) {
      const t = ws.addRow(bolum.toplam.map((v, i) => hucreDegeri(v, bolum.sutunlar[i].tur)));
      t.font = { bold: true };
      t.eachCell((c) => (c.border = { top: { style: "thin" } }));
    }

    bolum.sutunlar.forEach((s, i) => {
      const kolon = ws.getColumn(i + 1);
      const bicim = BICIM[s.tur];
      if (bicim) for (let r = ilkVeriSatiri; r <= ws.rowCount; r++) ws.getCell(r, i + 1).numFmt = bicim;
      const enUzun = Math.max(s.ad.length, ...bolum.satirlar.map((x) => String(x[i] ?? "").length));
      kolon.width = Math.min(45, Math.max(10, enUzun + 3));
    });
    ws.views = [{ state: "frozen", ySplit: ilkVeriSatiri - 1 }];

    if (rapor.notlar.length) {
      ws.addRow([]);
      for (const n of rapor.notlar) ws.addRow([n]).font = { italic: true, color: { argb: "FF666666" } };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
