"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cikisYap } from "@/app/actions/auth";
import { rolAdi } from "@/lib/roller";
import type { KullaniciRolu } from "@/types/database";
import { ikonlar, type IkonAdi } from "./Ikonlar";

type MenuOgesi = { yol: string; ad: string; ikon: IkonAdi; yakinda?: boolean };

const MENU: { grup: string; ogeler: MenuOgesi[] }[] = [
  {
    grup: "Genel",
    ogeler: [
      { yol: "/panel", ad: "Ana Panel", ikon: "panel" },
      { yol: "/isler", ad: "İşler ve Siparişler", ikon: "isler", yakinda: true },
      { yol: "/asistan", ad: "Asistan", ikon: "asistan", yakinda: true },
      { yol: "/hatirlaticilar", ad: "Hatırlatıcılar", ikon: "hatirlatici" },
      { yol: "/notlar", ad: "Notlar", ikon: "notlar" },
    ],
  },
  {
    grup: "Operasyon",
    ogeler: [
      { yol: "/alis", ad: "Alış", ikon: "alis" },
      { yol: "/uretim", ad: "Üretim", ikon: "uretim" },
      { yol: "/satis", ad: "Satış", ikon: "satis" },
      { yol: "/stok", ad: "Stok", ikon: "stok" },
    ],
  },
  {
    grup: "Finans",
    ogeler: [
      { yol: "/kasa", ad: "Kasa ve Banka", ikon: "kasa" },
      { yol: "/cariler", ad: "Cariler", ikon: "cari" },
    ],
  },
  {
    grup: "Muhasebe",
    ogeler: [
      { yol: "/raporlar", ad: "Raporlar", ikon: "rapor", yakinda: true },
      { yol: "/hesap-plani", ad: "Hesap Planı", ikon: "hesap" },
      { yol: "/aktarim", ad: "Muhasebe Aktarımı", ikon: "aktarim", yakinda: true },
    ],
  },
];


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
  const [menuAcik, setMenuAcik] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-acik", menuAcik);
  }, [menuAcik]);

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
      <div className="perde" onClick={() => setMenuAcik(false)} />

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

        {MENU.map((g) => (
          <div key={g.grup}>
            <div className="grup-baslik">{g.grup}</div>
            <nav>
              {g.ogeler.map((o) => (
                <Link
                  key={o.yol}
                  href={o.yol}
                  className={yol.startsWith(o.yol) ? "aktif" : undefined}
                  onClick={() => setMenuAcik(false)}
                >
                  {ikonlar[o.ikon]}
                  {o.ad}
                  {o.yakinda && <span className="yakinda">yakında</span>}
                </Link>
              ))}
            </nav>
          </div>
        ))}

        <div className="yan-alt">
          <div className="avatar">{basHarfler(kullaniciAdi) || "?"}</div>
          <div>
            <b style={{ color: "#fff" }}>{kullaniciAdi}</b>
            <small>{rolAdi(rol as KullaniciRolu | null)}</small>
            <div className="baglantilar">
              <Link href="/ayarlar">Ayarlar</Link>
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
          <button
            className="btn btn-cizgi btn-ikon menu-btn"
            aria-label="Menüyü aç"
            onClick={() => setMenuAcik((a) => !a)}
          >
            {ikonlar.menu}
          </button>
          <div className="mobil-marka">
            <Image src={logoUrl} alt="" width={32} height={32} unoptimized />
            <b>İMECE</b>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-cizgi btn-ikon" aria-label="Karanlık / aydınlık mod" onClick={temaDegistir}>
            {ikonlar.ay}
            {ikonlar.gunes}
          </button>
        </header>
        <main className="icerik">{children}</main>
      </div>
    </div>
  );
}
