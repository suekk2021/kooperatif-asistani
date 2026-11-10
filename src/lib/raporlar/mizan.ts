import { hepsiniGetir, type Istemci } from "./sorgu";
import { ayAdi, yuvarla, type Donem, type Rapor } from "./tipler";

type Satir = { hesap_kodu: string; borc: number; alacak: number; yevmiye_fisleri: { tarih: string } | null };
type Sonuc<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Alt hesabın bütün üst hesapları: 120.01.003 → 120.01, 120 */
function ustKodlar(kod: string): string[] {
  const parcalar = kod.split(".");
  return parcalar.slice(0, -1).map((_, i) => parcalar.slice(0, i + 1).join("."));
}

/** Dönem sonu itibarıyla (yıl başından değil, ilk kayıttan itibaren) kümülatif mizan + dönem içi hareket. */
export async function mizanRaporu(s: Istemci, d: Donem): Promise<Rapor> {
  const [satirlar, { data: hesaplar, error }] = await Promise.all([
    hepsiniGetir<Satir>((bas, son) =>
      s
        .from("yevmiye_satirlari")
        .select("hesap_kodu, borc, alacak, yevmiye_fisleri!inner(tarih)")
        .lte("yevmiye_fisleri.tarih", d.son)
        .order("id")
        .range(bas, son) as unknown as Sonuc<Satir>
    ),
    s.from("hesap_plani").select("kod, ad"),
  ]);
  if (error) throw new Error(`Rapor verisi okunamadı: ${error.message}`);

  const toplamlar = new Map<string, { db: number; da: number; b: number; a: number }>();
  const ekle = (kod: string, x: Satir, donemde: boolean) => {
    const t = toplamlar.get(kod) ?? { db: 0, da: 0, b: 0, a: 0 };
    t.b += Number(x.borc);
    t.a += Number(x.alacak);
    if (donemde) {
      t.db += Number(x.borc);
      t.da += Number(x.alacak);
    }
    toplamlar.set(kod, t);
  };
  for (const x of satirlar) {
    const tarih = (Array.isArray(x.yevmiye_fisleri) ? x.yevmiye_fisleri[0] : x.yevmiye_fisleri)?.tarih ?? "";
    const donemde = tarih >= d.bas;
    ekle(x.hesap_kodu, x, donemde);
    for (const ust of ustKodlar(x.hesap_kodu)) ekle(ust, x, donemde);
  }

  const ad = new Map((hesaplar ?? []).map((h) => [h.kod, h.ad]));
  const kodlar = [...toplamlar.keys()].sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  const anaHesaplar = kodlar.filter((k) => !k.includes("."));
  const genel = anaHesaplar.reduce(
    (t, k) => {
      const x = toplamlar.get(k)!;
      const bakiye = x.b - x.a;
      return { db: t.db + x.db, da: t.da + x.da, b: t.b + x.b, a: t.a + x.a, bb: t.bb + Math.max(bakiye, 0), ab: t.ab + Math.max(-bakiye, 0) };
    },
    { db: 0, da: 0, b: 0, a: 0, bb: 0, ab: 0 }
  );

  return {
    baslik: "Mizan",
    donemYazisi: `${ayAdi(d.ay)} sonu itibarıyla`,
    notlar: [
      "Toplam borç/alacak ilk kayıttan dönem sonuna kadar birikimlidir; \"dönem içi\" sütunları yalnızca seçilen ayın hareketidir.",
      "Ana hesaplar (3 haneli) alt hesaplarının toplamıdır; genel toplam yalnızca ana hesaplardan alınır.",
      "Borç toplamı = alacak toplamı olmalıdır (her fiş dengeli kaydedilir).",
    ],
    bolumler: [
      {
        baslik: "Hesaplar",
        sutunlar: [
          { ad: "Hesap kodu", tur: "metin" },
          { ad: "Hesap adı", tur: "metin" },
          { ad: "Dönem içi borç", tur: "tl" },
          { ad: "Dönem içi alacak", tur: "tl" },
          { ad: "Toplam borç", tur: "tl" },
          { ad: "Toplam alacak", tur: "tl" },
          { ad: "Borç bakiyesi", tur: "tl" },
          { ad: "Alacak bakiyesi", tur: "tl" },
        ],
        satirlar: kodlar.map((k) => {
          const x = toplamlar.get(k)!;
          const bakiye = yuvarla(x.b - x.a);
          return [k, ad.get(k) ?? "", yuvarla(x.db), yuvarla(x.da), yuvarla(x.b), yuvarla(x.a), bakiye > 0 ? bakiye : 0, bakiye < 0 ? -bakiye : 0];
        }),
        toplam: ["", "Genel toplam", yuvarla(genel.db), yuvarla(genel.da), yuvarla(genel.b), yuvarla(genel.a), yuvarla(genel.bb), yuvarla(genel.ab)],
      },
    ],
  };
}
