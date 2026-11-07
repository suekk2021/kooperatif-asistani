import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase oturum tokenini her istekte tazeler (Next.js 16'da middleware -> proxy).
export async function proxy(request: NextRequest) {
  // /api/* rotalari (cron, Telegram webhook) kendi guvenlik kontrolune sahip
  // (CRON_SECRET / chat_id dogrulamasi) - burada oturum zorunlulugu uygulanmaz.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Odeme gecikmesi gibi durumlarda web panelini tamamen kilitler - oturum
  // kontrolunden ONCE calisir, giris sayfasi dahil butun sayfalarda gecerlidir.
  // Hazir sayfaya (public/hizmet-durduruldu.html) yonlendirir. O sayfanin
  // kendisi icin asagidaki oturum kontrolune hic girmeden direkt gecilir,
  // aksi halde /giris'e tekrar yonlendirilip sonsuz donguye giriyordu.
  if (process.env.HIZMET_DURDURULDU === "true") {
    if (request.nextUrl.pathname === "/hizmet-durduruldu.html") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/hizmet-durduruldu.html", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const girisSayfasindaMi = request.nextUrl.pathname.startsWith("/giris");

  if (!user && !girisSayfasindaMi) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
