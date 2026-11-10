import { hepsiniGetir, type Istemci } from "./sorgu";
import { ayAdi, yuvarla, type Donem, type Rapor } from "./tipler";

type Kalem = { kdv_orani: number; tutar: number; kdv_tutari: number };
type Sonuc<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

function oranBazinda(kalemler: Kalem[]) {
  const m = new Map<number, { matrah: number; kdv: number }>();
  for (const k of kalemler) {
    const o = Number(k.kdv_orani);
    const x = m.get(o) ?? { matrah: 0, kdv: 0 };
    x.matrah += Number(k.tutar);
    x.kdv += Number(k.kdv_tutari);
    m.set(o, x);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

export async function kdvRaporu(s: Istemci, d: Donem): Promise<Rapor> {
  const [satis, alis] = await Promise.all([
    hepsiniGetir<Kalem>((bas, son) =>
      s
        .from("satis_kalemleri")
        .select("kdv_orani, tutar, kdv_tutari, satis_faturalari!inner(tarih, durum)")
        .eq("satis_faturalari.durum", "kayitli")
        .gte("satis_faturalari.tarih", d.bas)
        .lte("satis_faturalari.tarih", d.son)
        .order("id")
        .range(bas, son) as unknown as Sonuc<Kalem>
    ),
    hepsiniGetir<Kalem>((bas, son) =>
      s
        .from("alis_kalemleri")
        .select("kdv_orani, tutar, kdv_tutari, alis_faturalari!inner(tarih, durum)")
        .eq("alis_faturalari.durum", "kayitli")
        .gte("alis_faturalari.tarih", d.bas)
        .lte("alis_faturalari.tarih", d.son)
        .order("id")
        .range(bas, son) as unknown as Sonuc<Kalem>
    ),
  ]);

  const sOran = oranBazinda(satis);
  const aOran = oranBazinda(alis);
  const hesaplanan = sOran.reduce((t, [, x]) => t + x.kdv, 0);
  const indirilecek = aOran.reduce((t, [, x]) => t + x.kdv, 0);
  const fark = yuvarla(hesaplanan - indirilecek);
  const sutunlar = [
    { ad: "KDV oranı", tur: "metin" as const },
    { ad: "Matrah (KDV hariç)", tur: "tl" as const },
    { ad: "KDV", tur: "tl" as const },
  ];
  const satir = ([o, x]: [number, { matrah: number; kdv: number }]) => [`%${o}`, yuvarla(x.matrah), yuvarla(x.kdv)];

  return {
    baslik: "KDV özeti",
    donemYazisi: ayAdi(d.ay),
    notlar: [
      "Programdaki kayıtlı alış ve satış faturalarından hesaplanır; iptal edilenler dahil değildir.",
      "Bu bir kontrol özetidir, beyanname değildir. Önceki aydan devreden KDV, tevkifat ve iadeler burada yoktur; beyanname Mikro'da hazırlanır.",
    ],
    bolumler: [
      {
        baslik: "Hesaplanan KDV (satışlar · 391)",
        sutunlar,
        satirlar: sOran.map(satir),
        toplam: ["Toplam", yuvarla(sOran.reduce((t, [, x]) => t + x.matrah, 0)), yuvarla(hesaplanan)],
      },
      {
        baslik: "İndirilecek KDV (alışlar · 191)",
        sutunlar,
        satirlar: aOran.map(satir),
        toplam: ["Toplam", yuvarla(aOran.reduce((t, [, x]) => t + x.matrah, 0)), yuvarla(indirilecek)],
      },
      {
        baslik: "Özet",
        sutunlar: [
          { ad: "Kalem", tur: "metin" },
          { ad: "Tutar", tur: "tl" },
        ],
        satirlar: [
          ["Hesaplanan KDV", yuvarla(hesaplanan)],
          ["İndirilecek KDV", yuvarla(indirilecek)],
          [fark >= 0 ? "Bu ay ödenecek (tahmini)" : "Sonraki aya devreden (tahmini)", Math.abs(fark)],
        ],
      },
    ],
  };
}
