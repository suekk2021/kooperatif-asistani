import Link from "next/link";
import { notFound } from "next/navigation";
import { IadeFormu, type IadeEdilebilirKalem } from "@/components/iade/IadeFormu";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { tarihTR } from "@/lib/imece";
import { islemIzni, oturum } from "@/lib/yetki";

export default async function IadeYeniPage({ searchParams }: { searchParams: Promise<{ satis?: string; alis?: string }> }) {
  const q = await searchParams;
  const tur = q.satis ? "satis" : q.alis ? "alis" : null;
  const faturaId = q.satis ?? q.alis;
  if (!tur || !faturaId) notFound();

  const supabase = await createClient();
  const kim = await oturum();
  const faturaTablo = tur === "satis" ? "satis_faturalari" : "alis_faturalari";
  const kalemTablo = tur === "satis" ? "satis_kalemleri" : "alis_kalemleri";
  const iadeAlani = tur === "satis" ? "satis_kalem_id" : "alis_kalem_id";

  const { data: fatura } = await supabase.from(faturaTablo).select("*").eq("id", faturaId).maybeSingle();
  if (!fatura) notFound();
  const [{ data: cari }, { data: kalemVeri }, { data: hesaplar }] = await Promise.all([
    supabase.from("cariler").select("id, unvan, kod").eq("id", fatura.cari_id).single(),
    supabase.from(kalemTablo).select("*").eq("fatura_id", faturaId).order("sira"),
    supabase.from("kasa_banka_hesaplari").select("id, ad, kod").eq("aktif", true).in("tur", ["kasa", "banka"]).order("kod"),
  ]);
  const kalemler = ((kalemVeri ?? []) as { id: number; stok_karti_id: string | null; miktar: number; tutar: number; kdv_orani: number }[]).filter(
    (k) => k.stok_karti_id
  );
  const [{ data: kartlar }, { data: oncekiler }] = await Promise.all([
    supabase.from("stok_kartlari").select("id, ad, kod, birim").in("id", kalemler.map((k) => k.stok_karti_id!)),
    supabase
      .from("iade_kalemleri")
      .select(`miktar, ${iadeAlani}, iadeler!inner(durum)`)
      .in(iadeAlani, kalemler.map((k) => k.id))
      .eq("iadeler.durum", "kayitli"),
  ]);

  const iadeEdilebilir: IadeEdilebilirKalem[] = kalemler.map((k) => {
    const kart = kartlar?.find((x) => x.id === k.stok_karti_id);
    const onceki = ((oncekiler ?? []) as unknown as Record<string, number>[])
      .filter((o) => Number(o[iadeAlani]) === Number(k.id))
      .reduce((t, o) => t + Number(o.miktar), 0);
    return {
      kalem_id: k.id,
      ad: kart?.ad ?? "?",
      kod: kart?.kod ?? "",
      birim: kart?.birim ?? "",
      satilan: Number(k.miktar),
      kalan: Math.max(0, Number(k.miktar) - onceki),
      net_birim: Number(k.tutar) / Number(k.miktar),
      kdv_orani: Number(k.kdv_orani),
    };
  });

  const no = tur === "satis" ? (fatura.belge_no ?? `SAT-${fatura.satis_no}`) : fatura.belge_no;
  const geri = `/${tur}/${faturaId}`;
  const engel =
    fatura.durum !== "kayitli"
      ? "Bu fatura iptal edilmiş; iade alınamaz."
      : !kim || !islemIzni(kim.rol, tur)
        ? "İade girme yetkiniz yok."
        : iadeEdilebilir.every((k) => k.kalan <= 0)
          ? "Bu faturadaki ürünlerin tamamı zaten iade edilmiş."
          : null;

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>{tur === "satis" ? "Müşteriden iade al" : "Tedarikçiye iade et"}</h1>
          <p>
            {tur === "satis" ? "Satış" : "Alış faturası"} <Link href={geri}>{no}</Link> · {cari?.unvan} <span className="kod">{cari?.kod}</span> ·{" "}
            {tarihTR(fatura.tarih)}
          </p>
        </div>
        <div className="ust-araclar">
          <Link href={geri} className="btn btn-cizgi">
            Faturaya dön
          </Link>
        </div>
      </div>
      <p className="not" style={{ marginTop: 0, marginBottom: 16 }}>
        {tur === "satis"
          ? "Sağlam gelen ürün stoğa geri girer. Bozuk/imha edilecek ürün stoğa girmez; maliyeti zarar olarak kalır. Müşterinin borcu iade tutarı kadar azalır (para iadesi yapılırsa borç değişmez, kasadan çıkar)."
          : "İade edilen malzeme stoktan alış fiyatıyla düşer; tedarikçiye borcumuz iade tutarı kadar azalır."}
      </p>
      {engel ? (
        <div className="kart">
          <p className="bos">{engel}</p>
        </div>
      ) : (
        <IadeFormu tur={tur} faturaId={faturaId} kalemler={iadeEdilebilir} paraHesaplari={hesaplar ?? []} bugun={bugunIstanbul()} />
      )}
    </>
  );
}
