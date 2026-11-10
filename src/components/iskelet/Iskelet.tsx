"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cikisYap } from "@/app/actions/auth";
import { tarihTR } from "@/lib/imece";
import { rolAdi, rolBilgisi } from "@/lib/roller";
import { TEST_DONEMI_BITIS } from "@/lib/test-donemi";
import type { KullaniciRolu } from "@/types/database";
import { ikonlar } from "./Ikonlar";
import { MENU, gorurMu, type MenuOgesi } from "./menu";
import { MobilKabuk } from "./MobilKabuk";

function basHarfler(ad: string) {
  return ad
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}

export function Iskelet({
  kullaniciAdi,
  rol,
  logoUrl,
  children,
}: {
  kullaniciAdi: string;
  rol: string | null;
  logoUrl: string;
  children: React.ReactNode;
}) {
  const yol = usePathname();
  const benimRol = (rol as KullaniciRolu | null) ?? null;
  const bilgi = rolBilgisi(benimRol);
  const yonetici = Boolean(bilgi?.yonetici);
  // Yönetici (ör. temsil görevindeki başkan) kendi listesinde olmayan bölümlere "Diğer bölümler"den ulaşır.
  const digerleri = yonetici ? MENU.flatMap((g) => g.ogeler).filter((o) => !o.yakinda && !gorurMu(o, benimRol)) : [];

  const baglanti = (o: MenuOgesi) => (
    <Link key={o.yol} href={o.yol} className={yol.startsWith(o.yol) ? "aktif" : undefined}>
      {ikonlar[o.ikon]}
      {o.ad}
    </Link>
  );

  function temaDegistir() {
    const simdiki = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const yeni = simdiki === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", yeni);
    try {
      localStorage.setItem("imece-tema", yeni);
    } catch {
      // Gizli sekmede depolama kapalı olabilir; tema yine de bu oturumda değişir.
    }
  }

  return (
    <div className="uygulama">
      <aside className="yan">
        <Link href="/panel" className="marka">
          <div className="marka-ust">
            <Image src={logoUrl} alt="Suluova Üreten Eller Kadın Kooperatifi logosu" width={52} height={52} unoptimized />
            <div className="marka-ad">
              <b>İMECE</b>
              <span>Suluova Üreten Eller</span>
            </div>
          </div>
          <div className="islevler">
            <span>Üretim</span>
            <i />
            <span>Muhasebe</span>
            <i />
            <span>İş Takibi</span>
          </div>
        </Link>

        {MENU.map((g) => {
          const gorunen = g.ogeler.filter((o) => gorurMu(o, benimRol));
          if (!gorunen.length) return null;
          return (
            <div key={g.grup}>
              <div className="grup-baslik">{g.grup}</div>
              <nav>{gorunen.map(baglanti)}</nav>
            </div>
          );
        })}

        {digerleri.length > 0 && (
          <details className="diger-bolumler">
            <summary className="grup-baslik">Diğer bölümler</summary>
            <nav>{digerleri.map(baglanti)}</nav>
          </details>
        )}

        <div className="yan-alt">
          <div className="avatar">{basHarfler(kullaniciAdi) || "?"}</div>
          <div>
            <b style={{ color: "#fff" }}>{kullaniciAdi}</b>
            <small>{rolAdi(benimRol)}</small>
            <div className="baglantilar">
              {yonetici && <Link href="/ayarlar">Ayarlar</Link>}
              <Link href="/hesap">Hesabım</Link>
              <form action={cikisYap}>
                <button type="submit">Çıkış</button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="ana">
        <header className="ustbar">
          <Link href="/panel" className="mobil-marka">
            <Image src={logoUrl} alt="" width={32} height={32} unoptimized />
            <b>İMECE</b>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/hatirlaticilar" className="btn btn-cizgi btn-ikon mobil-zil" aria-label="Hatırlatıcılar">
            {ikonlar.hatirlatici}
          </Link>
          <button className="btn btn-cizgi btn-ikon" aria-label="Karanlık / aydınlık mod" onClick={temaDegistir}>
            {ikonlar.ay}
            {ikonlar.gunes}
          </button>
        </header>
        {TEST_DONEMI_BITIS && (
          <div className="test-seridi" role="note">
            <b>TEST DÖNEMİ</b> · {tarihTR(TEST_DONEMI_BITIS)} tarihine kadar. Bu sürede girilen tüm kayıtlar denemedir ve dönem sonunda
            silinecektir.
          </div>
        )}
        <main className="icerik">{children}</main>
      </div>

      <MobilKabuk
        rol={benimRol}
        yazar={Boolean(bilgi?.yazar)}
        yonetici={yonetici}
        kullaniciAdi={kullaniciAdi}
        basHarf={basHarfler(kullaniciAdi)}
        temaDegistir={temaDegistir}
      />
    </div>
  );
}
