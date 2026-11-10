import { hepsiniGetir, tek, type Istemci } from "./sorgu";
import { ayAdi, yuvarla, type Donem, type Rapor } from "./tipler";

type Kalem = {
  stok_karti_id: string;
  miktar: number;
  tutar: number;
  maliyet_tutari: number;
  maliyet_tahmini: boolean;
  stok_kartlari: { kod: string; ad: string; birim: string } | null;
  satis_faturalari: { id: string; cari_id: string; cariler: { kod: string; unvan: string } | null } | null;
};

export async function satisRaporu(s: Istemci, d: Donem): Promise<Rapor> {
  const kalemler = await hepsiniGetir<Kalem>((bas, son) =>
    s
      .from("satis_kalemleri")
      .select(
        "stok_karti_id, miktar, tutar, maliyet_tutari, maliyet_tahmini, stok_kartlari(kod, ad, birim), satis_faturalari!inner(id, cari_id, tarih, durum, cariler(kod, unvan))"
      )
      .eq("satis_faturalari.durum", "kayitli")
      .gte("satis_faturalari.tarih", d.bas)
      .lte("satis_faturalari.tarih", d.son)
      .order("id")
      .range(bas, son) as unknown as PromiseLike<{ data: Kalem[] | null; error: { message: string } | null }>
  );

  const urunler = new Map<string, { kod: string; ad: string; birim: string; miktar: number; ciro: number; maliyet: number; tahmini: boolean }>();
  const musteriler = new Map<string, { kod: string; unvan: string; faturalar: Set<string>; ciro: number; maliyet: number }>();
  for (const k of kalemler) {
    const kart = tek(k.stok_kartlari);
    const u = urunler.get(k.stok_karti_id) ?? { kod: kart?.kod ?? "", ad: kart?.ad ?? "?", birim: kart?.birim ?? "", miktar: 0, ciro: 0, maliyet: 0, tahmini: false };
    u.miktar += Number(k.miktar);
    u.ciro += Number(k.tutar);
    u.maliyet += Number(k.maliyet_tutari);
    u.tahmini ||= k.maliyet_tahmini;
    urunler.set(k.stok_karti_id, u);

    const f = tek(k.satis_faturalari);
    const cari = tek(f?.cariler);
    if (f) {
      const m = musteriler.get(f.cari_id) ?? { kod: cari?.kod ?? "", unvan: cari?.unvan ?? "?", faturalar: new Set<string>(), ciro: 0, maliyet: 0 };
      m.faturalar.add(f.id);
      m.ciro += Number(k.tutar);
      m.maliyet += Number(k.maliyet_tutari);
      musteriler.set(f.cari_id, m);
    }
  }

  const marj = (ciro: number, maliyet: number) => (ciro > 0 ? ((ciro - maliyet) / ciro) * 100 : null);
  const urunListe = [...urunler.entries()].sort((a, b) => b[1].ciro - a[1].ciro);
  const musteriListe = [...musteriler.entries()].sort((a, b) => b[1].ciro - a[1].ciro);
  const ciro = urunListe.reduce((t, [, u]) => t + u.ciro, 0);
  const maliyet = urunListe.reduce((t, [, u]) => t + u.maliyet, 0);
  const tahminiVar = urunListe.some(([, u]) => u.tahmini);

  return {
    baslik: "Satış ve kârlılık",
    donemYazisi: ayAdi(d.ay),
    notlar: [
      "Tutarlar KDV hariçtir. İptal edilen satışlar dahil değildir.",
      "Maliyet, satış anındaki ortalama stok maliyetidir (malzeme). İşçilik ve genel üretim gideri ay sonu dağıtımıyla eklenecek; bu yüzden gerçek kâr burada görünenden düşüktür.",
      ...(tahminiVar ? ["* işaretli ürünler stokta yokken satıldı; maliyetleri son giriş maliyetinden tahmin edildi."] : []),
    ],
    bolumler: [
      {
        baslik: "Ürün bazında",
        sutunlar: [
          { ad: "Stok kodu", tur: "metin" },
          { ad: "Ürün", tur: "metin" },
          { ad: "Miktar", tur: "sayi" },
          { ad: "Birim", tur: "metin" },
          { ad: "Satış tutarı", tur: "tl" },
          { ad: "Maliyet", tur: "tl" },
          { ad: "Brüt kâr", tur: "tl" },
          { ad: "Marj", tur: "yuzde" },
        ],
        satirlar: urunListe.map(([, u]) => [
          u.kod,
          u.tahmini ? `${u.ad} *` : u.ad,
          u.miktar,
          u.birim,
          yuvarla(u.ciro),
          yuvarla(u.maliyet),
          yuvarla(u.ciro - u.maliyet),
          marj(u.ciro, u.maliyet),
        ]),
        baglantilar: urunListe.map(([id]) => `/stok/${id}`),
        toplam: ["", "Toplam", null, "", yuvarla(ciro), yuvarla(maliyet), yuvarla(ciro - maliyet), marj(ciro, maliyet)],
      },
      {
        baslik: "Müşteri bazında",
        sutunlar: [
          { ad: "Cari kodu", tur: "metin" },
          { ad: "Müşteri", tur: "metin" },
          { ad: "Fatura", tur: "sayi" },
          { ad: "Satış tutarı", tur: "tl" },
          { ad: "Brüt kâr", tur: "tl" },
          { ad: "Marj", tur: "yuzde" },
        ],
        satirlar: musteriListe.map(([, m]) => [
          m.kod,
          m.unvan,
          m.faturalar.size,
          yuvarla(m.ciro),
          yuvarla(m.ciro - m.maliyet),
          marj(m.ciro, m.maliyet),
        ]),
        baglantilar: musteriListe.map(([id]) => `/cariler/${id}`),
        toplam: ["", "Toplam", musteriListe.reduce((t, [, m]) => t + m.faturalar.size, 0), yuvarla(ciro), yuvarla(ciro - maliyet), marj(ciro, maliyet)],
      },
    ],
  };
}
