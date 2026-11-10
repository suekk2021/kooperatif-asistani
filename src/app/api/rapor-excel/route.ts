import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mevcutRol } from "@/lib/rol";
import { bugunIstanbul } from "@/lib/tarih";
import { donemCoz } from "@/lib/raporlar/tipler";
import { raporKodu, raporUret } from "@/lib/raporlar";
import { raporExcel } from "@/lib/raporlar/excel";

// Giriş yapan kişinin yetkisiyle okunur (RLS); depo görevlisi raporları görmez.
export async function GET(request: NextRequest) {
  const rol = await mevcutRol();
  if (!rol || rol === "depo") {
    return new Response("Yetkisiz.", { status: 401 });
  }

  const p = request.nextUrl.searchParams;
  const kod = raporKodu(p.get("r") ?? undefined);
  const bugun = bugunIstanbul();
  const donem = donemCoz(p.get("ay") ?? undefined, bugun);

  const supabase = await createClient();
  const rapor = await raporUret(supabase, kod, donem, bugun);
  const dosya = await raporExcel(rapor, "Suluova Üreten Eller Kadın Kooperatifi");

  const dosyaAdi = `IMECE-${kod}-${kod === "yaslandirma" ? bugun : donem.ay}.xlsx`;
  return new Response(new Uint8Array(dosya), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
