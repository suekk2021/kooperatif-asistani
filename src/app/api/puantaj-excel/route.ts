import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mevcutRol } from "@/lib/rol";
import { maasGorurMu } from "@/lib/roller";
import { bugunIstanbul } from "@/lib/tarih";
import { GUN_TURU_ADI, UCRET_TIPI_ADI, ayinGunleri } from "@/lib/personel";
import { ayAdi, type Hucre, type Rapor } from "@/lib/raporlar/tipler";
import { raporExcel } from "@/lib/raporlar/excel";
import type { MaasAyOzeti, PuantajGunu } from "@/types/database";

// Genel rapor-excel ucundan ayrı tutulur: muhasebeci rolü o ucu kullanıyor, maaş verisi oradan çıkmamalı.
// Yetkiyi veritabanı da uygular (maas_ay_ozeti yetkisizde hata verir, tablolar RLS ile boş döner).
export async function GET(request: NextRequest) {
  const rol = await mevcutRol();
  if (!maasGorurMu(rol)) return new Response("Yetkisiz.", { status: 401 });

  const p = request.nextUrl.searchParams;
  const ayHam = p.get("ay");
  const ay = ayHam && /^\d{4}-\d{2}$/.test(ayHam) ? ayHam : bugunIstanbul().slice(0, 7);
  const tutarli = p.get("tur") === "hakedis";
  const gunler = ayinGunleri(ay);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("maas_ay_ozeti", { p_donem: `${ay}-01` });
  if (error) return new Response(error.message, { status: 403 });
  const ozet = (data ?? []) as MaasAyOzeti[];

  const { data: gv } = await supabase
    .from("puantaj")
    .select("personel_id, tarih, gun_turu, miktar")
    .gte("tarih", gunler[0])
    .lte("tarih", gunler[gunler.length - 1])
    .neq("gun_turu", "calisti")
    .order("tarih");
  const ad = new Map(ozet.map((o) => [o.personel_id, o.ad_soyad]));
  const ozelGunler = ((gv ?? []) as Pick<PuantajGunu, "personel_id" | "tarih" | "gun_turu" | "miktar">[]).filter((g) =>
    ad.has(g.personel_id)
  );

  const gunSutunlari: Hucre[][] = ozet.map((o) => [
    o.ad_soyad,
    o.ucret_tipi ? UCRET_TIPI_ADI[o.ucret_tipi] : "",
    o.calisilan_gun,
    o.ucret_tipi === "saatlik" ? 0 : Number(o.fazla_gun),
    o.ucret_tipi === "saatlik" ? Number(o.toplam_miktar) : null,
    o.eksik_gun,
    o.izinli_gun,
    o.raporlu_gun,
    o.resmi_tatil,
    o.hafta_tatili,
  ]);

  const rapor: Rapor = tutarli
    ? {
        baslik: "Personel hak ediş listesi",
        donemYazisi: ayAdi(ay),
        notlar: [
          "Puantajdan hesaplanan iç takip listesidir; resmi bordro değildir. Sigorta, vergi ve net maaş mali müşavirce hesaplanır.",
          "Ücretler kişisel veridir; yalnız gereken kişilerle paylaşın.",
        ],
        bolumler: [
          {
            baslik: "Hak ediş",
            sutunlar: [
              { ad: "Personel", tur: "metin" },
              { ad: "Ücret tipi", tur: "metin" },
              { ad: "Geldiği gün", tur: "sayi" },
              { ad: "Gün/saat toplamı", tur: "sayi" },
              { ad: "Hak ediş", tur: "tl" },
              { ad: "Ek ödeme (yol vb.)", tur: "tl" },
              { ad: "Düzeltme", tur: "tl" },
              { ad: "Düzeltme açıklaması", tur: "metin" },
              { ad: "Toplam", tur: "tl" },
              { ad: "Ödendi", tur: "tarih" },
            ],
            satirlar: ozet.map((o) => [
              o.ad_soyad,
              o.ucret_tipi ? UCRET_TIPI_ADI[o.ucret_tipi] : "",
              o.calisilan_gun,
              Number(o.toplam_miktar),
              Number(o.hak_edis),
              Number(o.ek_odeme),
              Number(o.duzeltme),
              o.duzeltme_aciklama,
              Number(o.toplam),
              o.odendi_tarihi,
            ]),
            toplam: [
              "Toplam",
              null,
              null,
              null,
              ozet.reduce((a, o) => a + Number(o.hak_edis), 0),
              ozet.reduce((a, o) => a + Number(o.ek_odeme), 0),
              ozet.reduce((a, o) => a + Number(o.duzeltme), 0),
              null,
              ozet.reduce((a, o) => a + Number(o.toplam), 0),
              null,
            ],
          },
        ],
      }
    : {
        baslik: "Aylık puantaj özeti",
        donemYazisi: ayAdi(ay),
        notlar: [
          "Puantaj kaydından hazırlanmıştır; resmi bordro değildir. Ücret ve kesinti hesabı mali müşavirdedir.",
          "Fazla gün: aynı gün için 1'den fazla yazılan gün (fazla mesai). Saatli personelde toplam saat verilir.",
        ],
        bolumler: [
          {
            baslik: "Puantaj özeti",
            sutunlar: [
              { ad: "Personel", tur: "metin" },
              { ad: "Ücret tipi", tur: "metin" },
              { ad: "Çalıştığı gün", tur: "sayi" },
              { ad: "Fazla gün", tur: "sayi" },
              { ad: "Toplam saat", tur: "sayi" },
              { ad: "Eksik gün", tur: "sayi" },
              { ad: "İzinli", tur: "sayi" },
              { ad: "Raporlu", tur: "sayi" },
              { ad: "Resmi tatil", tur: "sayi" },
              { ad: "Hafta tatili", tur: "sayi" },
            ],
            satirlar: gunSutunlari,
          },
          {
            baslik: "Eksik, izin, rapor, tatil günleri",
            sutunlar: [
              { ad: "Personel", tur: "metin" },
              { ad: "Tarih", tur: "tarih" },
              { ad: "Gün türü", tur: "metin" },
              { ad: "Yazılan gün/saat", tur: "sayi" },
            ],
            satirlar: ozelGunler.map((g) => [ad.get(g.personel_id) ?? "", g.tarih, GUN_TURU_ADI[g.gun_turu], Number(g.miktar)]),
          },
        ],
      };

  const dosya = await raporExcel(rapor, "Suluova Üreten Eller Kadın Kooperatifi");
  const dosyaAdi = `IMECE-${tutarli ? "hak-edis" : "puantaj-ozeti"}-${ay}.xlsx`;
  return new Response(new Uint8Array(dosya), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
