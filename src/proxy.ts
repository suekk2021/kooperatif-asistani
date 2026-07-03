import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Supabase oturum tokenini her istekte tazeler (Next.js 16'da middleware -> proxy).
export async function proxy(request: NextRequest) {
  // /api/* rotalari (cron, Telegram webhook) kendi guvenlik kontrolune sahip
  // (CRON_SECRET / chat_id dogrulamasi) - burada oturum zorunlulugu uygulanmaz.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
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
