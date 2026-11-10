"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cikisYap } from "@/app/actions/auth";
import { IMZA } from "@/lib/imza";
import { rolAdi } from "@/lib/roller";
import type { KullaniciRolu } from "@/types/database";
import { ikonlar } from "./Ikonlar";
import { MENU, gorurMu, mobilDuzen } from "./menu";

/** Telefonda: alttaki sekme çubuğu, ortadaki ＋ (hızlı kayıt) ve alttan açılan menü. Bilgisayarda gizli. */
export function MobilKabuk({
  rol,
  yazar,
  yonetici,
  kullaniciAdi,
  basHarf,
  temaDegistir,
}: {
  rol: KullaniciRolu | null;
  yazar: boolean;
  yonetici: boolean;
  kullaniciAdi: string;
  basHarf: string;
  temaDegistir: () => void;
}) {
  const yol = usePathname();
  const [acik, setAcik] = useState<"arti" | "menu" | null>(null);
  const { sekmeler, hizli } = mobilDuzen(rol, yazar);
  const kapat = () => setAcik(null);

  useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => e.key === "Escape" && setAcik(null);
    document.body.classList.add("panel-acik");
    window.addEventListener("keydown", tus);
    return () => {
      document.body.classList.remove("panel-acik");
      window.removeEventListener("keydown", tus);
    };
  }, [acik]);

  const gruplar = MENU.map((g) => ({ grup: g.grup, ogeler: g.ogeler.filter((o) => gorurMu(o, rol)) })).filter((g) => g.ogeler.length);
  const digerleri = yonetici ? MENU.flatMap((g) => g.ogeler).filter((o) => !o.yakinda && !gorurMu(o, rol)) : [];
  if (digerleri.length) gruplar.push({ grup: "Diğer bölümler", ogeler: digerleri });

  return (
    <>
      <nav className="mobil-cubuk" aria-label="Ana bölümler">
        {sekmeler.map((s) => {
          if (s === "arti") {
            return hizli.length ? (
              <button key="arti" type="button" className="mc-arti" aria-label="Yeni kayıt" onClick={() => setAcik(acik === "arti" ? null : "arti")}>
                <span>{ikonlar.arti}</span>
              </button>
            ) : null;
          }
          if (s === "menu") {
            return (
              <button key="menu" type="button" className={acik === "menu" ? "aktif" : undefined} onClick={() => setAcik(acik === "menu" ? null : "menu")}>
                {ikonlar.menu}
                <span>Menü</span>
              </button>
            );
          }
          return (
            <Link key={s.yol} href={s.yol} className={!acik && yol.startsWith(s.yol) ? "aktif" : undefined} onClick={kapat}>
              {ikonlar[s.ikon]}
              <span>{s.ad}</span>
            </Link>
          );
        })}
      </nav>

      {acik && <div className="mc-perde" onClick={kapat} />}

      {acik === "arti" && (
        <div className="mc-panel" role="dialog" aria-modal="true" aria-label="Ne kaydedeceksin?">
          <div className="mc-tutamak" />
          <div className="mc-bas">
            <h3>Ne kaydedeceksin?</h3>
            <button type="button" className="mc-kapat" aria-label="Kapat" onClick={kapat}>
              {ikonlar.kapat}
            </button>
          </div>
          <div className="mc-izgara">
            {hizli.map((h) => (
              <Link key={h.yol} href={h.yol} onClick={kapat}>
                <i className={`mc-r-${h.renk}`}>{ikonlar[h.ikon]}</i>
                {h.ad}
              </Link>
            ))}
          </div>
          {hizli.some((h) => h.yol === "/satis/yeni") && <p className="mc-not">İade, satış ya da alış faturasının içinden alınır.</p>}
        </div>
      )}

      {acik === "menu" && (
        <div className="mc-panel mc-menu" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="mc-tutamak" />
          {gruplar.map((g) => (
            <div key={g.grup}>
              <div className="mc-grup">{g.grup}</div>
              <div className="mc-izgara">
                {g.ogeler.map((o) => (
                  <Link key={o.yol} href={o.yol} onClick={kapat} className={yol.startsWith(o.yol) ? "aktif" : undefined}>
                    <i>{ikonlar[o.ikon]}</i>
                    {o.ad}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="mc-kullanici">
            <div className="avatar">{basHarf || "?"}</div>
            <div className="mc-kim">
              <b>{kullaniciAdi}</b>
              <span>{rolAdi(rol)}</span>
            </div>
            <button type="button" className="btn btn-cizgi btn-ikon" aria-label="Karanlık / aydınlık mod" onClick={temaDegistir}>
              {ikonlar.ay}
              {ikonlar.gunes}
            </button>
          </div>
          <div className="mc-baglantilar">
            {yonetici && (
              <Link href="/ayarlar" onClick={kapat}>
                Ayarlar
              </Link>
            )}
            <Link href="/hesap" onClick={kapat}>
              Hesabım
            </Link>
            <form action={cikisYap}>
              <button type="submit">Çıkış</button>
            </form>
          </div>
          <p className="mc-imza">
            Geliştirici:{" "}
            <a href={IMZA.url} target="_blank" rel="noopener noreferrer">
              {IMZA.ad}
            </a>
          </p>
        </div>
      )}
    </>
  );
}
