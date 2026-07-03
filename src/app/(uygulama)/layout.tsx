import Image from "next/image";
import Link from "next/link";
import { cikisYap } from "@/app/actions/auth";
import { kurumKimligiGetir } from "@/lib/kurum";

export default async function UygulamaLayout({ children }: { children: React.ReactNode }) {
  const kurum = await kurumKimligiGetir();

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-pine text-white/80">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {kurum.logo_url ? (
              <Image
                src={kurum.logo_url}
                alt={kurum.kurum_adi}
                width={36}
                height={36}
                className="h-9 w-9 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card/10 text-lg">
                🧺
              </div>
            )}
            <div>
              <p className="font-baslik text-sm font-bold leading-tight text-white">Kooperatif Asistanı</p>
              <p className="text-xs leading-tight text-white/60">{kurum.kurum_adi}</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/islemler" className="hover:text-white">
              Gelir / Gider
            </Link>
            <Link href="/hatirlaticilar" className="hover:text-white">
              Hatırlatıcılar
            </Link>
            <Link href="/notlar" className="hover:text-white">
              Notlar
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Link href="/ayarlar" className="text-white/60 hover:text-white">
              Ayarlar
            </Link>
            <Link href="/hesap" className="text-white/60 hover:text-white">
              Hesap
            </Link>
            <form action={cikisYap}>
              <button type="submit" className="text-white/60 hover:text-white">
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
