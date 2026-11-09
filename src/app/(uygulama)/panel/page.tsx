import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";

function selamlama() {
  const saat = Number(
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "numeric", hour12: false }).format(new Date())
  );
  if (saat < 11) return "Günaydın";
  if (saat < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bugun = bugunIstanbul();

  const say = (sorgu: PromiseLike<{ count: number | null }>) => sorgu.then((r) => r.count ?? 0);
  const [profil, musteri, tedarikci, stokKarti, fis, hatirlaticilar, paraHesabi, acilisFisi] = await Promise.all([
    supabase.from("profiller").select("ad_soyad").eq("id", user?.id ?? "").maybeSingle(),
    say(supabase.from("cariler").select("id", { count: "exact", head: true }).eq("tur", "musteri").eq("aktif", true)),
    say(supabase.from("cariler").select("id", { count: "exact", head: true }).eq("tur", "tedarikci").eq("aktif", true)),
    say(supabase.from("stok_kartlari").select("id", { count: "exact", head: true }).eq("aktif", true)),
    say(supabase.from("yevmiye_fisleri").select("id", { count: "exact", head: true })),
    supabase
      .from("hatirlaticilar")
      .select("id, baslik, hatirlatma_tarihi")
      .eq("tamamlandi", false)
      .order("hatirlatma_tarihi")
      .limit(5),
    // Merkez Kasa hazır geliyor; kullanıcının açtığı hesaplar (banka, POS, kart) sayılır.
    say(supabase.from("kasa_banka_hesaplari").select("id", { count: "exact", head: true }).eq("aktif", true).neq("kod", "100.01")),
    say(supabase.from("yevmiye_fisleri").select("id", { count: "exact", head: true }).eq("kaynak_tur", "acilis")),
  ]);

  const ad = (profil.data?.ad_soyad ?? "").split(" ")[0];
  const tarihYazisi = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(new Date());
  const yaklasan = hatirlaticilar.data ?? [];

  const adimlar = [
    { ad: "Tedarikçi kartları", acik: "Mal aldığınız firmalar", sayi: tedarikci, yol: "/cariler?tur=tedarikci", hazir: true },
    { ad: "Müşteri kartları", acik: "Ürün sattığınız yerler", sayi: musteri, yol: "/cariler?tur=musteri", hazir: true },
    { ad: "Stok kartları", acik: "Hammadde, ambalaj ve ürünler", sayi: stokKarti, yol: "/stok", hazir: true },
    { ad: "Banka, POS ve kredi kartı hesapları", acik: "Merkez kasa hazır; bankaları ekleyin", sayi: paraHesabi, yol: "/kasa", hazir: true },
    { ad: "Açılış bakiyeleri ve ilk stok sayımı", acik: "Kasa/banka, eski borç-alacak, depo sayımı", sayi: acilisFisi, yol: "/acilis", hazir: true },
  ];

  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>
            {selamlama()}
            {ad ? `, ${ad}` : ""}
          </h1>
          <p>{tarihYazisi}</p>
        </div>
      </div>

      <div className="izgara g4">
        <Link href="/cariler?tur=musteri" className="kart kart-ic metrik" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="etiket">Müşteri</div>
          <div className="deger num">{musteri}</div>
          <div className="alt">kayıtlı müşteri kartı</div>
        </Link>
        <Link href="/cariler?tur=tedarikci" className="kart kart-ic metrik" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="etiket">Tedarikçi</div>
          <div className="deger num">{tedarikci}</div>
          <div className="alt">kayıtlı tedarikçi kartı</div>
        </Link>
        <Link href="/stok" className="kart kart-ic metrik" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="etiket">Stok kartı</div>
          <div className="deger num">{stokKarti}</div>
          <div className="alt">hammadde, ambalaj, ürün</div>
        </Link>
        <Link href="/hesap-plani" className="kart kart-ic metrik" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="etiket">Muhasebe fişi</div>
          <div className="deger num">{fis}</div>
          <div className="alt">alış/satış kayıtlarından otomatik</div>
        </Link>
      </div>

      <div className="izgara g-panel" style={{ marginTop: 16 }}>
        <div className="kart">
          <div className="kart-bas">
            <h2>Kurulum adımları</h2>
            <span className="soluk">Programı kullanmaya başlamadan önce</span>
          </div>
          {adimlar.map((a, i) => (
            <div className="adim" key={a.ad}>
              <span className={`no${a.sayi > 0 ? " bitti" : ""}`}>{a.sayi > 0 ? "✓" : i + 1}</span>
              <div>
                <b>{a.ad}</b>
                <span>{a.sayi > 0 ? `${a.sayi} kayıt` : a.acik}</span>
              </div>
              {a.hazir ? (
                <Link href={a.yol} className="btn btn-cizgi">
                  {a.sayi > 0 ? "Aç" : "Ekle"}
                </Link>
              ) : (
                <span className="etk e-gri">yakında</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="kart">
            <div className="kart-bas">
              <h2>Dikkat edilecekler</h2>
            </div>
            <p className="bos" style={{ textAlign: "left" }}>
              Fire, sayım farkı, biten stok, son kullanma tarihi ve geciken tahsilat uyarıları alış ve üretim kayıtları
              başlayınca burada görünecek.
            </p>
          </div>
          <div className="kart">
            <div className="kart-bas">
              <h2>Yaklaşan hatırlatıcılar</h2>
              <Link href="/hatirlaticilar">Tümü ›</Link>
            </div>
            {yaklasan.length === 0 ? (
              <p className="bos">Bekleyen hatırlatıcı yok.</p>
            ) : (
              yaklasan.map((h) => (
                <div className="uyari-satir" key={h.id}>
                  <div>
                    <b>{h.baslik}</b>
                    <span className={h.hatirlatma_tarihi < bugun ? "kirmizi" : undefined}>
                      {new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" }).format(
                        new Date(`${h.hatirlatma_tarihi}T12:00:00`)
                      )}
                      {h.hatirlatma_tarihi < bugun ? " · gecikti" : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
