import Image from "next/image";
import { girisYap } from "@/app/actions/auth";
import { IMZA } from "@/lib/imza";
import { kurumKimligiGetir } from "@/lib/kurum";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const kurum = await kurumKimligiGetir();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pine-deep px-4">
      <form
        action={girisYap}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-card p-8 shadow-xl shadow-black/10"
      >
        <div className="flex flex-col items-center text-center">
          <Image
            src={kurum.logo_url ?? "/logo.png"}
            alt={kurum.kurum_adi}
            width={72}
            height={72}
            className="mb-3 h-[72px] w-[72px] rounded-full bg-white object-cover p-0.5"
            unoptimized
          />
          <h1 className="text-2xl font-extrabold tracking-[4px] text-ink">İMECE</h1>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{kurum.kurum_adi}</p>
          <p className="mt-0.5 text-xs text-ink-soft">Üretim · Muhasebe · İş Takibi</p>
        </div>

        {hata && (
          <p className="rounded-md bg-expense/10 px-3 py-2 text-sm text-expense">{hata}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-ink-soft">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ochre"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="sifre" className="text-sm font-medium text-ink-soft">
            Şifre
          </label>
          <input
            id="sifre"
            name="sifre"
            type="password"
            required
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ochre"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-pine px-3 py-3 text-base font-semibold text-white transition-colors hover:bg-pine-deep"
        >
          Giriş Yap
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-white/70">
        Geliştirici:{" "}
        <a href={IMZA.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white/90 hover:text-white">
          {IMZA.ad}
        </a>
      </p>
    </div>
  );
}
