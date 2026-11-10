import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tarihTR, tl } from "@/lib/imece";
import { islemIzni, oturum } from "@/lib/yetki";

/** Fatura sayfasının altında: bu faturadan yapılan iadeler + "İade al / İade et" düğmesi. */
export async function FaturaIadeleri({ tur, faturaId, faturaIptal }: { tur: "satis" | "alis"; faturaId: string; faturaIptal: boolean }) {
  const supabase = await createClient();
  const [{ data: iadeler }, kim] = await Promise.all([
    supabase
      .from("iadeler")
      .select("id, iade_no, tarih, genel_toplam, durum, aciklama")
      .eq(tur === "satis" ? "satis_fatura_id" : "alis_fatura_id", faturaId)
      .order("iade_no"),
    oturum(),
  ]);
  const liste = iadeler ?? [];
  const girebilir = !faturaIptal && kim && islemIzni(kim.rol, tur);
  if (!liste.length && !girebilir) return null;

  return (
    <div className="kart" style={{ marginTop: 16 }}>
      <div className="kart-bas">
        <h2>İadeler</h2>
        {girebilir && (
          <Link href={`/iade/yeni?${tur}=${faturaId}`} className="btn btn-cizgi" style={{ minHeight: 34, padding: "6px 12px", fontSize: 13 }}>
            {tur === "satis" ? "↩ Müşteriden iade al" : "↩ Tedarikçiye iade et"}
          </Link>
        )}
      </div>
      {liste.length === 0 ? (
        <p className="bos" style={{ padding: "16px 20px", textAlign: "left" }}>
          {tur === "satis"
            ? "Bu satıştan iade yok. Müşteri ürünün bir kısmını ya da tamamını geri getirirse buradan girin; satışı iptal etmeyin."
            : "Bu faturadan iade yok. Tedarikçiye mal geri gönderirseniz buradan girin."}
        </p>
      ) : (
        liste.map((i) => (
          <Link href={`/iade/${i.id}`} className="uyari-satir" key={i.id} style={{ textDecoration: "none", color: "inherit" }}>
            <span className={`etk ${i.durum === "iptal" ? "e-kirmizi" : "e-mavi"}`}>{i.durum === "iptal" ? "iptal" : "iade"}</span>
            <div>
              <b>
                İADE-{i.iade_no} · {tl(i.genel_toplam)}
              </b>
              <span>
                {tarihTR(i.tarih)}
                {i.aciklama ? ` · ${i.aciklama}` : ""}
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
