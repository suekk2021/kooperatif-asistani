import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { bugunIstanbul } from "@/lib/tarih";
import { mevcutRol } from "@/lib/rol";
import { tl, sayi, tarihTR } from "@/lib/imece";
import { yuzde } from "@/lib/uretim";
import { yonetimOzeti } from "@/lib/yonetim-ozeti";

function selamlama() {
  const saat = Number(
    new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "numeric", hour12: false }).format(new Date())
  );
  if (saat < 11) return "Günaydın";
  if (saat < 18) return "İyi günler";
  return "İyi akşamlar";
}

function degisim(bu: number, gecen: number): string | null {
  if (gecen <= 0) return null;
  const f = ((bu - gecen) / gecen) * 100;
  return `${f >= 0 ? "▲" : "▼"} ${yuzde(Math.abs(f), 0)} geçen aya göre`;
}

const linkStili = { textDecoration: "none", color: "inherit" } as const;

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const bugun = bugunIstanbul();
  const rol = await mevcutRol();
  const parayiGorur = rol !== "depo";

  const say = (sorgu: PromiseLike<{ count: number | null }>) => sorgu.then((r) => r.count ?? 0);
  const [profil, musteri, tedarikci, stokKarti, hatirlaticilar, paraHesabi, acilisFisi, ozet] = await Promise.all([
    supabase.from("profiller").select("ad_soyad").eq("id", user?.id ?? "").maybeSingle(),
    say(supabase.from("cariler").select("id", { count: "exact", head: true }).eq("tur", "musteri").eq("aktif", true)),
    say(supabase.from("cariler").select("id", { count: "exact", head: true }).eq("tur", "tedarikci").eq("aktif", true)),
    say(supabase.from("stok_kartlari").select("id", { count: "exact", head: true }).eq("aktif", true)),
    supabase
      .from("hatirlaticilar")
      .select("id, baslik, hatirlatma_tarihi")
      .eq("tamamlandi", false)
      .order("hatirlatma_tarihi")
      .limit(5),
    // Merkez Kasa hazır geliyor; kullanıcının açtığı hesaplar (banka, POS, kart) sayılır.
    say(supabase.from("kasa_banka_hesaplari").select("id", { count: "exact", head: true }).eq("aktif", true).neq("kod", "100.01")),
    say(supabase.from("yevmiye_fisleri").select("id", { count: "exact", head: true }).eq("kaynak_tur", "acilis")),
    yonetimOzeti(supabase, bugun),
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
  const { finans, buAySatis, gecenAySatis, uretim, gecikenler, sktYaklasan, eksiStok, acikPartiler, vadesiGelenEvrak } = ozet;
  const gecikmisToplam = gecikenler.reduce((t, c) => t + c.gecikmis, 0);
  const marj = buAySatis.ciro > 0 ? (buAySatis.kar / buAySatis.ciro) * 100 : null;

  const adimlar = [
    { ad: "Tedarikçi kartları", acik: "Mal aldığınız firmalar", sayi: tedarikci, yol: "/cariler?tur=tedarikci" },
    { ad: "Müşteri kartları", acik: "Ürün sattığınız yerler", sayi: musteri, yol: "/cariler?tur=musteri" },
    { ad: "Stok kartları", acik: "Hammadde, ambalaj ve ürünler", sayi: stokKarti, yol: "/stok" },
    { ad: "Banka, POS ve kredi kartı hesapları", acik: "Merkez kasa hazır; bankaları ekleyin", sayi: paraHesabi, yol: "/kasa" },
    { ad: "Açılış bakiyeleri ve ilk stok sayımı", acik: "Kasa/banka, eski borç-alacak, depo sayımı", sayi: acilisFisi, yol: "/acilis" },
  ];
  const kurulumBitti = adimlar.every((a) => a.sayi > 0);

  type Uyari = { anahtar: string; renk: "kirmizi" | "amber"; baslik: string; aciklama: string; yol: string };
  const uyarilar: Uyari[] = [];
  if (parayiGorur) {
    for (const c of gecikenler.slice(0, 4)) {
      uyarilar.push({
        anahtar: `g-${c.id}`,
        renk: c.enEskiGecikmeGun > 60 ? "kirmizi" : "amber",
        baslik: `${c.unvan}: ${tl(c.gecikmis)} vadesi geçmiş`,
        aciklama: `En eski ${c.enEskiGecikmeGun} gün gecikmiş · toplam borcu ${tl(c.toplam)}`,
        yol: `/cariler/${c.id}`,
      });
    }
    if (gecikenler.length > 4) {
      uyarilar.push({ anahtar: "g-diger", renk: "amber", baslik: `+${gecikenler.length - 4} müşteride daha geciken tahsilat`, aciklama: "Alacak yaşlandırma raporunda tamamı", yol: "/raporlar?r=yaslandirma" });
    }
    for (const e of vadesiGelenEvrak.slice(0, 4)) {
      const gecti = e.vade < bugun;
      const ad = `${e.tur === "cek" ? "Çek" : "Senet"} #${e.evrak_no}`;
      uyarilar.push({
        anahtar: `ev-${e.id}`,
        renk: gecti ? "kirmizi" : "amber",
        baslik:
          e.yon === "alinan"
            ? `${ad} (${e.unvan}): ${tl(e.tutar)} tahsil ${gecti ? "edilmedi, vadesi geçti" : `vadesi ${tarihTR(e.vade)}`}`
            : `${ad} (${e.unvan}): ${tl(e.tutar)} ödeme ${gecti ? "vadesi geçti" : `vadesi ${tarihTR(e.vade)}`}`,
        aciklama: e.yon === "alinan" ? "Tahsil edildiyse çek/senet ekranından işleyin" : "Bankada karşılığı hazır mı? Ödendiyse işleyin",
        yol: `/cek-senet/${e.id}`,
      });
    }
  }
  for (const l of sktYaklasan.slice(0, 4)) {
    const gecti = l.skt < bugun;
    uyarilar.push({
      anahtar: `s-${l.ad}-${l.lot}-${l.skt}`,
      renk: gecti ? "kirmizi" : "amber",
      baslik: `${l.ad}${l.lot ? ` (lot ${l.lot})` : ""}: son kullanma ${tarihTR(l.skt)}${gecti ? " — geçti" : ""}`,
      aciklama: `Elde ${sayi(l.miktar)} ${l.birim} var`,
      yol: "/stok",
    });
  }
  for (const k of eksiStok.slice(0, 4)) {
    uyarilar.push({
      anahtar: `e-${k.id}`,
      renk: "amber",
      baslik: `${k.ad}: stok eksiye düştü (${sayi(k.miktar)} ${k.birim})`,
      aciklama: "Girilmemiş bir alış ya da üretim olabilir; sayımla kontrol edin",
      yol: `/stok/${k.id}`,
    });
  }
  for (const p of acikPartiler.slice(0, 4)) {
    uyarilar.push({
      anahtar: `p-${p.id}`,
      renk: "amber",
      baslik: `Parti ${p.parti_no} (${p.ad}) hâlâ açık`,
      aciklama: `${tarihTR(p.tarih)} tarihinde başlatıldı; bitirilmeden stoğa girmez`,
      yol: `/uretim/${p.id}`,
    });
  }

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
        {parayiGorur && (
          <Link href="/raporlar" className="btn btn-cizgi">
            Raporlar
          </Link>
        )}
      </div>

      {parayiGorur && (
        <div className="izgara g4">
          <Link href="/kasa" className="kart kart-ic metrik" style={linkStili}>
            <div className="etiket">Nakit</div>
            <div className="deger num">{tl(finans.nakit)}</div>
            <div className="alt">
              Kasa {tl(finans.kasa)} · Banka {tl(finans.banka)}
              {finans.pos !== 0 && ` · POS ${tl(finans.pos)}`}
            </div>
          </Link>
          <Link href="/raporlar?r=yaslandirma" className="kart kart-ic metrik" style={linkStili}>
            <div className="etiket">Alacak (müşterilerden)</div>
            <div className="deger num">{tl(finans.alacak)}</div>
            <div className={`alt${gecikmisToplam > 0 ? " kirmizi" : ""}`}>
              {gecikmisToplam > 0 ? `${tl(gecikmisToplam)} vadesi geçmiş` : "Vadesi geçmiş alacak yok"}
            </div>
          </Link>
          <Link href="/cariler?tur=tedarikci" className="kart kart-ic metrik" style={linkStili}>
            <div className="etiket">Borç</div>
            <div className="deger num">{tl(finans.tedarikciBorcu + finans.krediKartiBorcu)}</div>
            <div className="alt">
              Tedarikçi {tl(finans.tedarikciBorcu)}
              {finans.krediKartiBorcu !== 0 && ` · Kredi kartı ${tl(finans.krediKartiBorcu)}`}
            </div>
          </Link>
          <Link href="/raporlar?r=satis" className="kart kart-ic metrik" style={linkStili}>
            <div className="etiket">Bu ay net satış (KDV hariç)</div>
            <div className="deger num">{tl(buAySatis.ciro)}</div>
            <div className="alt">
              Brüt kâr {tl(buAySatis.kar)}
              {marj !== null && ` (${yuzde(marj, 0)})`}
              {buAySatis.tahminiMaliyetVar && " · tahmini maliyetli"}
              {degisim(buAySatis.ciro, gecenAySatis.ciro) && (
                <>
                  <br />
                  {degisim(buAySatis.ciro, gecenAySatis.ciro)}
                </>
              )}
            </div>
          </Link>
        </div>
      )}

      <div className="izgara g-panel" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="kart">
            <div className="kart-bas">
              <h2>Dikkat edilecekler</h2>
              {uyarilar.length > 0 && <span className="etk e-amber">{uyarilar.length}</span>}
            </div>
            {uyarilar.length === 0 ? (
              <p className="bos">Şu an dikkat gerektiren bir şey yok.</p>
            ) : (
              uyarilar.map((u) => (
                <Link href={u.yol} className="uyari-satir" key={u.anahtar} style={linkStili}>
                  <span className={`etk e-${u.renk}`} style={{ marginTop: 2 }}>
                    {u.renk === "kirmizi" ? "!" : "•"}
                  </span>
                  <div>
                    <b>{u.baslik}</b>
                    <span>{u.aciklama}</span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {!kurulumBitti && (
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
                  <Link href={a.yol} className="btn btn-cizgi">
                    {a.sayi > 0 ? "Aç" : "Ekle"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Link href="/uretim" className="kart kart-ic metrik" style={linkStili}>
            <div className="etiket">Bu ay üretim</div>
            <div className="deger num">{uretim.parti} parti</div>
            <div className="alt">
              {uretim.fire === null ? (
                "Henüz tamamlanan parti yok"
              ) : (
                <>
                  Ortalama fire <b className={uretim.fire >= 5 ? "amber" : undefined}>{yuzde(uretim.fire)}</b>
                  {uretim.enCokFire && (
                    <>
                      <br />
                      En yüksek: {uretim.enCokFire.ad} {yuzde(uretim.enCokFire.fire)}
                    </>
                  )}
                </>
              )}
            </div>
          </Link>
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
