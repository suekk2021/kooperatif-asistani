import type { createClient } from "@/lib/supabase/server";
import { cariYaslandir } from "@/lib/yaslandirma";

type Istemci = Awaited<ReturnType<typeof createClient>>;

function ayAraligi(ayBasi: string, kaydir: number): { bas: string; son: string } {
  const [y, a] = ayBasi.split("-").map(Number);
  const bas = new Date(Date.UTC(y, a - 1 + kaydir, 1));
  const son = new Date(Date.UTC(y, a + kaydir, 0));
  return { bas: bas.toISOString().slice(0, 10), son: son.toISOString().slice(0, 10) };
}

function gunEkle(tarih: string, gun: number): string {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

export type SatisOzeti = { ciro: number; maliyet: number; kar: number; adet: number; tahminiMaliyetVar: boolean };

async function satisOzeti(s: Istemci, bas: string, son: string): Promise<SatisOzeti> {
  const { data } = await s
    .from("satis_faturalari")
    .select("ara_toplam, maliyet_toplam, satis_kalemleri(maliyet_tahmini)")
    .eq("durum", "kayitli")
    .gte("tarih", bas)
    .lte("tarih", son);
  const liste = data ?? [];
  const ciro = liste.reduce((t, f) => t + Number(f.ara_toplam), 0);
  const maliyet = liste.reduce((t, f) => t + Number(f.maliyet_toplam), 0);
  const tahminiMaliyetVar = liste.some((f) =>
    (f.satis_kalemleri as { maliyet_tahmini: boolean }[] | null)?.some((k) => k.maliyet_tahmini)
  );
  return { ciro, maliyet, kar: ciro - maliyet, adet: liste.length, tahminiMaliyetVar };
}

export async function yonetimOzeti(s: Istemci, bugun: string) {
  const buAy = ayAraligi(`${bugun.slice(0, 7)}-01`, 0);
  const gecenAy = ayAraligi(`${bugun.slice(0, 7)}-01`, -1);
  // Geçen ayla adil karşılaştırma: geçen ayın aynı gününe kadar.
  const gecenAyAyniGun = gunEkle(gecenAy.bas, Math.min(Number(bugun.slice(8, 10)), Number(gecenAy.son.slice(8, 10))) - 1);

  const [bakiyeler, buAySatis, gecenAySatis, partiler, acikPartiler, musteriler, satislar, stokDurumu, lotHareketleri] =
    await Promise.all([
      s.from("hesap_bakiyeleri").select("kod, bakiye").in("kod", ["100", "102", "108", "120", "300", "320"]),
      satisOzeti(s, buAy.bas, bugun),
      satisOzeti(s, gecenAy.bas, gecenAyAyniGun),
      s
        .from("uretim_partileri")
        .select("urun_karti_id, uretilen_miktar, bozuk_miktar, stok_kartlari(ad, birim)")
        .eq("durum", "tamamlandi")
        .gte("tarih", buAy.bas)
        .lte("tarih", bugun),
      s
        .from("uretim_partileri")
        .select("id, parti_no, tarih, stok_kartlari(ad)")
        .eq("durum", "acik")
        .lt("tarih", bugun)
        .order("tarih"),
      s.from("cariler").select("id, kod, unvan").eq("tur", "musteri"),
      s.from("satis_faturalari").select("cari_id, tarih, vade_tarihi, genel_toplam").eq("durum", "kayitli"),
      s.from("stok_durumu").select("stok_karti_id, miktar").lt("miktar", 0),
      s.from("stok_hareketleri").select("stok_karti_id, lot_no, skt, miktar, stok_kartlari(ad, birim)").not("skt", "is", null),
    ]);

  const b = (kod: string) => Number(bakiyeler.data?.find((x) => x.kod === kod)?.bakiye ?? 0);
  const finans = {
    kasa: b("100"),
    banka: b("102"),
    pos: b("108"),
    nakit: b("100") + b("102") + b("108"),
    alacak: b("120"),
    tedarikciBorcu: -b("320"),
    krediKartiBorcu: -b("300"),
  };

  // Üretim: ay toplamı ve ürün bazında fire
  const urunler = new Map<string, { ad: string; birim: string; uretilen: number; bozuk: number; parti: number }>();
  for (const p of partiler.data ?? []) {
    const kart = p.stok_kartlari as unknown as { ad: string; birim: string } | null;
    const u = urunler.get(p.urun_karti_id) ?? { ad: kart?.ad ?? "?", birim: kart?.birim ?? "", uretilen: 0, bozuk: 0, parti: 0 };
    u.uretilen += Number(p.uretilen_miktar ?? 0);
    u.bozuk += Number(p.bozuk_miktar ?? 0);
    u.parti += 1;
    urunler.set(p.urun_karti_id, u);
  }
  const urunListesi = [...urunler.values()].map((u) => ({ ...u, fire: u.uretilen + u.bozuk > 0 ? (u.bozuk / (u.uretilen + u.bozuk)) * 100 : 0 }));
  const toplamUretilen = urunListesi.reduce((t, u) => t + u.uretilen, 0);
  const toplamBozuk = urunListesi.reduce((t, u) => t + u.bozuk, 0);
  const uretim = {
    parti: urunListesi.reduce((t, u) => t + u.parti, 0),
    fire: toplamUretilen + toplamBozuk > 0 ? (toplamBozuk / (toplamUretilen + toplamBozuk)) * 100 : null,
    enCokFire: urunListesi.filter((u) => u.bozuk > 0).sort((a, b) => b.fire - a.fire)[0] ?? null,
  };

  // Vadesi geçmiş alacaklar
  const { data: cariBakiyeleri } = await s
    .from("hesap_bakiyeleri")
    .select("kod, bakiye")
    .in("kod", (musteriler.data ?? []).map((c) => c.kod));
  const gecikenler = (musteriler.data ?? [])
    .map((c) => {
      const bakiye = Number(cariBakiyeleri?.find((x) => x.kod === c.kod)?.bakiye ?? 0);
      const faturalar = (satislar.data ?? []).filter((f) => f.cari_id === c.id).map((f) => ({ ...f, genel_toplam: Number(f.genel_toplam) }));
      return { id: c.id, unvan: c.unvan, ...cariYaslandir(bakiye, faturalar, bugun) };
    })
    .filter((c) => c.gecikmis > 0)
    .sort((a, b) => b.gecikmis - a.gecikmis);

  // SKT: lot bazında elde kalan, 30 gün içinde dolan
  const lotlar = new Map<string, { ad: string; birim: string; lot: string | null; skt: string; miktar: number }>();
  for (const h of lotHareketleri.data ?? []) {
    const kart = h.stok_kartlari as unknown as { ad: string; birim: string } | null;
    const anahtar = `${h.stok_karti_id}|${h.lot_no ?? ""}|${h.skt}`;
    const l = lotlar.get(anahtar) ?? { ad: kart?.ad ?? "?", birim: kart?.birim ?? "", lot: h.lot_no, skt: h.skt!, miktar: 0 };
    l.miktar += Number(h.miktar);
    lotlar.set(anahtar, l);
  }
  const sktSiniri = gunEkle(bugun, 30);
  const sktYaklasan = [...lotlar.values()].filter((l) => l.miktar > 0.0005 && l.skt <= sktSiniri).sort((a, b) => a.skt.localeCompare(b.skt));

  const eksiIdler = (stokDurumu.data ?? []).map((x) => x.stok_karti_id);
  const { data: eksiKartlar } = eksiIdler.length
    ? await s.from("stok_kartlari").select("id, ad, birim").in("id", eksiIdler)
    : { data: [] as { id: string; ad: string; birim: string }[] };
  const eksiStok = (stokDurumu.data ?? []).map((x) => {
    const kart = eksiKartlar?.find((k) => k.id === x.stok_karti_id);
    return { id: x.stok_karti_id, ad: kart?.ad ?? "?", birim: kart?.birim ?? "", miktar: Number(x.miktar) };
  });

  const acik = (acikPartiler.data ?? []).map((p) => ({
    id: p.id,
    parti_no: p.parti_no,
    tarih: p.tarih,
    ad: (p.stok_kartlari as unknown as { ad: string } | null)?.ad ?? "?",
  }));

  return { finans, buAySatis, gecenAySatis, uretim, gecikenler, sktYaklasan, eksiStok, acikPartiler: acik };
}
