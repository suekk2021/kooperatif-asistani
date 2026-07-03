import Image from "next/image";
import { girisYap } from "@/app/actions/auth";
import { kurumKimligiGetir } from "@/lib/kurum";

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const kurum = await kurumKimligiGetir();

  return (
    <div className="flex min-h-screen items-center justify-center bg-pine px-4">
      <form
        action={girisYap}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-card p-8 shadow-xl shadow-black/10"
      >
        <div className="flex flex-col items-center text-center">
          {kurum.logo_url ? (
            <Image
              src={kurum.logo_url}
              alt={kurum.kurum_adi}
              width={64}
              height={64}
              className="mb-3 h-16 w-16 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-ochre/15 text-2xl">
              🧺
            </div>
          )}
          <h1 className="font-baslik text-xl font-bold text-ink">Kooperatif Asistanı</h1>
          <p className="mt-1 text-sm text-ink-soft">{kurum.kurum_adi}</p>
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
          className="w-full rounded-md bg-pine px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
        >
          Giriş Yap
        </button>
      </form>
    </div>
  );
}
