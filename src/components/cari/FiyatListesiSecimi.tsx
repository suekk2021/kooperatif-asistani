import Link from "next/link";
import type { FiyatListesi } from "@/types/database";

/**
 * Müşteri kartındaki fiyat listesi alanı. Yetkisi olmayan kişide alan formda yer almaz (yalnız okunur),
 * böylece kartın başka bilgisini kaydederken mevcut listeye dokunulmaz.
 */
export function FiyatListesiSecimi({
  listeler,
  secili,
  yetkili,
}: {
  listeler: Pick<FiyatListesi, "id" | "ad" | "aktif">[];
  secili: string | null;
  yetkili: boolean;
}) {
  const mevcut = listeler.find((l) => l.id === secili);
  if (!yetkili) {
    return (
      <div className="alan">
        <label>Fiyat listesi</label>
        <div style={{ minHeight: 42, display: "flex", alignItems: "center" }}>
          {mevcut ? <b>{mevcut.ad}</b> : <span className="amber">Seçilmemiş — bu müşteriye satış yapılamaz</span>}
        </div>
      </div>
    );
  }
  // Kapatılmış liste seçiliyse de görünsün (sessizce boşa dönmesin).
  const secenekler = listeler.filter((l) => l.aktif || l.id === secili);
  return (
    <div className="alan" style={{ flexBasis: 260 }}>
      <label htmlFor="fiyat_listesi_id">Fiyat listesi</label>
      <select id="fiyat_listesi_id" name="fiyat_listesi_id" defaultValue={secili ?? ""}>
        <option value="">Seçilmedi (satış yapılamaz)</option>
        {secenekler.map((l) => (
          <option key={l.id} value={l.id}>
            {l.ad}
            {!l.aktif ? " (kapalı)" : ""}
          </option>
        ))}
      </select>
      {secenekler.length === 0 && (
        <span className="soluk" style={{ fontSize: 12.5 }}>
          Henüz liste yok: <Link href="/satis/fiyat-listeleri">Fiyat listesi oluşturun</Link>
        </span>
      )}
    </div>
  );
}
