import { hepsiniGetir, type Istemci } from "./sorgu";
import { yuvarla, type Rapor } from "./tipler";
import { cariYaslandir, YAS_DILIMLERI, type CariYaslandirma } from "@/lib/yaslandirma";
import { tarihTR } from "@/lib/imece";

type Fatura = { cari_id: string; tarih: string; vade_tarihi: string | null; genel_toplam: number };
type Sonuc<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Bugün itibarıyla; dönem seçimi bu raporu etkilemez. */
export async function yaslandirmaRaporu(s: Istemci, bugun: string): Promise<Rapor> {
  const [{ data: cariler, error }, faturalar] = await Promise.all([
    s.from("cariler").select("id, kod, unvan, telefon").eq("tur", "musteri").order("unvan"),
    hepsiniGetir<Fatura>((bas, son) =>
      s.from("satis_faturalari").select("cari_id, tarih, vade_tarihi, genel_toplam").eq("durum", "kayitli").order("id").range(bas, son) as unknown as Sonuc<Fatura>
    ),
  ]);
  if (error) throw new Error(`Rapor verisi okunamadı: ${error.message}`);

  const kodlar = (cariler ?? []).map((c) => c.kod);
  const { data: bakiyeler } = kodlar.length
    ? await s.from("hesap_bakiyeleri").select("kod, bakiye").in("kod", kodlar)
    : { data: [] as { kod: string; bakiye: number }[] };

  const satirlar = (cariler ?? [])
    .map((c) => {
      const bakiye = Number(bakiyeler?.find((b) => b.kod === c.kod)?.bakiye ?? 0);
      const f = faturalar.filter((x) => x.cari_id === c.id).map((x) => ({ ...x, genel_toplam: Number(x.genel_toplam) }));
      return { c, y: cariYaslandir(bakiye, f, bugun) };
    })
    .filter((x) => x.y.toplam > 0)
    .sort((a, b) => b.y.gecikmis - a.y.gecikmis || b.y.toplam - a.y.toplam);

  const toplam = (sec: (y: CariYaslandirma) => number) => yuvarla(satirlar.reduce((t, x) => t + sec(x.y), 0));

  return {
    baslik: "Alacak yaşlandırma",
    donemYazisi: `${tarihTR(bugun)} itibarıyla`,
    notlar: [
      "Müşterilerin açık borcu, vadesinden bu yana geçen güne göre dilimlenir.",
      "Tahsilatlar faturaya değil cariye yapıldığı için en eski fatura önce kapanmış kabul edilir (muhasebede yaygın yöntem).",
      "\"Açılış / belgesiz\": programdaki faturalarla açıklanamayan borç (açılış bakiyesi gibi).",
    ],
    bolumler: [
      {
        baslik: "Müşteri bazında",
        sutunlar: [
          { ad: "Cari kodu", tur: "metin" },
          { ad: "Müşteri", tur: "metin" },
          { ad: "Telefon", tur: "metin" },
          { ad: "Toplam borç", tur: "tl" },
          ...YAS_DILIMLERI.map((d) => ({ ad: d.ad, tur: "tl" as const })),
        ],
        satirlar: satirlar.map(({ c, y }) => [c.kod, c.unvan, c.telefon ?? "", y.toplam, ...YAS_DILIMLERI.map((d) => y.dilimler[d.kod])]),
        baglantilar: satirlar.map(({ c }) => `/cariler/${c.id}`),
        toplam: ["", "Toplam", "", toplam((y) => y.toplam), ...YAS_DILIMLERI.map((d) => toplam((y) => y.dilimler[d.kod]))],
      },
    ],
  };
}
