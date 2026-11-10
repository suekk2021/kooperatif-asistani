import { hepsiniGetir, tek, type Istemci } from "./sorgu";
import { ayAdi, yuvarla, type Donem, type Rapor } from "./tipler";
import { partiSuresiDk } from "@/lib/uretim";

type Parti = {
  id: string;
  parti_no: number;
  tarih: string;
  urun_karti_id: string;
  baslangic: string;
  bitis: string | null;
  uretilen_miktar: number | null;
  bozuk_miktar: number;
  bozuk_neden: string | null;
  malzeme_maliyeti: number | null;
  birim_maliyet: number | null;
  stok_kartlari: { kod: string; ad: string; birim: string } | null;
};

type SayimKalemi = {
  stok_karti_id: string;
  sistem_miktari: number;
  sayilan_miktar: number;
  fark: number;
  fark_tutari: number;
  stok_kartlari: { kod: string; ad: string; birim: string } | null;
  sayimlar: { id: string; sayim_no: number; tarih: string } | null;
};

type Sonuc<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

const fireYuzde = (u: number, b: number) => (u + b > 0 ? (b / (u + b)) * 100 : null);

export async function fireRaporu(s: Istemci, d: Donem): Promise<Rapor> {
  const [partiler, sayimlar] = await Promise.all([
    hepsiniGetir<Parti>((bas, son) =>
      s
        .from("uretim_partileri")
        .select("id, parti_no, tarih, urun_karti_id, baslangic, bitis, uretilen_miktar, bozuk_miktar, bozuk_neden, malzeme_maliyeti, birim_maliyet, stok_kartlari(kod, ad, birim)")
        .eq("durum", "tamamlandi")
        .gte("tarih", d.bas)
        .lte("tarih", d.son)
        .order("tarih")
        .order("parti_no")
        .range(bas, son) as unknown as Sonuc<Parti>
    ),
    hepsiniGetir<SayimKalemi>((bas, son) =>
      s
        .from("sayim_kalemleri")
        .select("stok_karti_id, sistem_miktari, sayilan_miktar, fark, fark_tutari, stok_kartlari(kod, ad, birim), sayimlar!inner(id, sayim_no, tarih, durum)")
        .eq("sayimlar.durum", "kayitli")
        .gte("sayimlar.tarih", d.bas)
        .lte("sayimlar.tarih", d.son)
        .neq("fark", 0)
        .order("id")
        .range(bas, son) as unknown as Sonuc<SayimKalemi>
    ),
  ]);

  // Bozuk ürünün maliyeti: partinin malzeme maliyetinden bozuk payı (fire maliyete dahil).
  const fireMaliyeti = (p: Parti) => {
    const u = Number(p.uretilen_miktar ?? 0);
    const b = Number(p.bozuk_miktar ?? 0);
    return u + b > 0 ? Number(p.malzeme_maliyeti ?? 0) * (b / (u + b)) : 0;
  };

  const urunler = new Map<string, { kod: string; ad: string; birim: string; parti: number; uretilen: number; bozuk: number; malzeme: number; fireTl: number; dk: number }>();
  for (const p of partiler) {
    const kart = tek(p.stok_kartlari);
    const u = urunler.get(p.urun_karti_id) ?? { kod: kart?.kod ?? "", ad: kart?.ad ?? "?", birim: kart?.birim ?? "", parti: 0, uretilen: 0, bozuk: 0, malzeme: 0, fireTl: 0, dk: 0 };
    u.parti += 1;
    u.uretilen += Number(p.uretilen_miktar ?? 0);
    u.bozuk += Number(p.bozuk_miktar ?? 0);
    u.malzeme += Number(p.malzeme_maliyeti ?? 0);
    u.fireTl += fireMaliyeti(p);
    u.dk += partiSuresiDk(p);
    urunler.set(p.urun_karti_id, u);
  }
  const urunListe = [...urunler.entries()].sort((a, b) => b[1].fireTl - a[1].fireTl);
  const top = urunListe.reduce(
    (t, [, u]) => ({ parti: t.parti + u.parti, malzeme: t.malzeme + u.malzeme, fireTl: t.fireTl + u.fireTl }),
    { parti: 0, malzeme: 0, fireTl: 0 }
  );

  const eksikTl = sayimlar.filter((k) => Number(k.fark) < 0).reduce((t, k) => t + Number(k.fark_tutari), 0);
  const fazlaTl = sayimlar.filter((k) => Number(k.fark) > 0).reduce((t, k) => t + Number(k.fark_tutari), 0);

  return {
    baslik: "Fire ve kaçak",
    donemYazisi: ayAdi(d.ay),
    notlar: [
      "Üretim firesi: partide kayda geçen bozuk/atılan ürün. Maliyeti, partinin malzeme maliyetinden bozuk ürünün payıdır.",
      "Sayım farkı: depoda sayılan ile sistemdeki miktar arasındaki fark. Açıklanamayan eksik, kaçak veya girilmemiş kayıt işaretidir.",
      "Süre ve kg/saat verimi üretim ekranındaki parti başlangıç-bitiş saatlerinden hesaplanır.",
    ],
    bolumler: [
      {
        baslik: "Ürün bazında üretim firesi",
        sutunlar: [
          { ad: "Stok kodu", tur: "metin" },
          { ad: "Ürün", tur: "metin" },
          { ad: "Parti", tur: "sayi" },
          { ad: "Paketlenen", tur: "sayi" },
          { ad: "Bozuk", tur: "sayi" },
          { ad: "Birim", tur: "metin" },
          { ad: "Fire", tur: "yuzde" },
          { ad: "Malzeme maliyeti", tur: "tl" },
          { ad: "Fire maliyeti", tur: "tl" },
          { ad: "Saatte üretim", tur: "sayi" },
        ],
        satirlar: urunListe.map(([, u]) => [
          u.kod,
          u.ad,
          u.parti,
          u.uretilen,
          u.bozuk,
          u.birim,
          fireYuzde(u.uretilen, u.bozuk),
          yuvarla(u.malzeme),
          yuvarla(u.fireTl),
          u.dk > 0 ? Math.round((u.uretilen / (u.dk / 60)) * 10) / 10 : null,
        ]),
        baglantilar: urunListe.map(([id]) => `/stok/${id}`),
        toplam: ["", "Toplam", top.parti, null, null, "", null, yuvarla(top.malzeme), yuvarla(top.fireTl), null],
      },
      {
        baslik: "Parti listesi",
        sutunlar: [
          { ad: "Parti", tur: "sayi" },
          { ad: "Tarih", tur: "tarih" },
          { ad: "Ürün", tur: "metin" },
          { ad: "Paketlenen", tur: "sayi" },
          { ad: "Bozuk", tur: "sayi" },
          { ad: "Fire", tur: "yuzde" },
          { ad: "Fire nedeni", tur: "metin" },
          { ad: "Süre (dk)", tur: "sayi" },
          { ad: "Birim maliyet", tur: "tl" },
        ],
        satirlar: partiler.map((p) => [
          p.parti_no,
          p.tarih,
          tek(p.stok_kartlari)?.ad ?? "?",
          Number(p.uretilen_miktar ?? 0),
          Number(p.bozuk_miktar ?? 0),
          fireYuzde(Number(p.uretilen_miktar ?? 0), Number(p.bozuk_miktar ?? 0)),
          p.bozuk_neden ?? "",
          partiSuresiDk(p) || null,
          p.birim_maliyet === null ? null : Number(p.birim_maliyet),
        ]),
        baglantilar: partiler.map((p) => `/uretim/${p.id}`),
      },
      {
        baslik: "Sayım farkları",
        sutunlar: [
          { ad: "Sayım", tur: "sayi" },
          { ad: "Tarih", tur: "tarih" },
          { ad: "Stok kodu", tur: "metin" },
          { ad: "Kart", tur: "metin" },
          { ad: "Sistemde", tur: "sayi" },
          { ad: "Sayılan", tur: "sayi" },
          { ad: "Fark", tur: "sayi" },
          { ad: "Birim", tur: "metin" },
          { ad: "Tutar", tur: "tl" },
        ],
        satirlar: sayimlar.map((k) => {
          const kart = tek(k.stok_kartlari);
          const sayim = tek(k.sayimlar);
          return [sayim?.sayim_no ?? null, sayim?.tarih ?? "", kart?.kod ?? "", kart?.ad ?? "?", Number(k.sistem_miktari), Number(k.sayilan_miktar), Number(k.fark), kart?.birim ?? "", Number(k.fark_tutari)];
        }),
        baglantilar: sayimlar.map((k) => (tek(k.sayimlar) ? `/stok/sayim/${tek(k.sayimlar)!.id}` : null)),
        toplam: ["", "", "", `Eksik ${yuvarla(-eksikTl).toLocaleString("tr-TR")} ₺ · Fazla ${yuvarla(fazlaTl).toLocaleString("tr-TR")} ₺`, null, null, null, "", yuvarla(eksikTl + fazlaTl)],
      },
    ],
  };
}
