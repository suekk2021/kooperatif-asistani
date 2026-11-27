"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { FormSonucu } from "@/app/actions/cariler";
import { fiyatListesiGuncelle, fiyatListesiOlustur } from "@/app/actions/fiyat-listeleri";
import { FormMesaji } from "@/components/FormMesaji";
import type { FiyatListesi } from "@/types/database";

export function YeniFiyatListesiFormu() {
  const router = useRouter();
  const [sonuc, action, bekliyor] = useActionState(
    async (_o: FormSonucu & { id?: string }, fd: FormData) => fiyatListesiOlustur(fd),
    {}
  );
  useEffect(() => {
    if (sonuc.id) router.push(`/satis/fiyat-listeleri/${sonuc.id}`);
  }, [sonuc, router]);

  return (
    <details className="kart form-ac" style={{ marginBottom: 16 }}>
      <summary className="kart-ic" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="btn btn-ana">+ Fiyat listesi oluştur</span>
        <span className="soluk">Adını siz verin (ör. Toptan, Bayi, Perakende). Fiyatlar bir sonraki ekranda girilir.</span>
      </summary>
      <form action={action} className="kart-ic" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="form-satir">
          <div className="alan" style={{ flexBasis: 260 }}>
            <label htmlFor="yeni-liste-ad">Liste adı *</label>
            <input id="yeni-liste-ad" name="ad" required placeholder="Toptan" />
          </div>
          <div className="alan" style={{ flexBasis: 320 }}>
            <label htmlFor="yeni-liste-aciklama">Açıklama</label>
            <input id="yeni-liste-aciklama" name="aciklama" placeholder="İsteğe bağlı" />
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn-ana" disabled={bekliyor}>
            {bekliyor ? "Oluşturuluyor…" : "Oluştur"}
          </button>
        </div>
        <FormMesaji sonuc={sonuc.id ? {} : sonuc} />
      </form>
    </details>
  );
}

export function FiyatListesiAyarFormu({ liste }: { liste: FiyatListesi }) {
  const [sonuc, action, bekliyor] = useActionState(
    async (_o: FormSonucu, fd: FormData) => fiyatListesiGuncelle(liste.id, fd),
    {}
  );
  // React 19 kayıttan sonra formu sıfırlar; key kaydedilen değerlere bağlı (KartDuzenleFormlari ile aynı sebep).
  return (
    <form
      key={[liste.ad, liste.aciklama, liste.aktif].join("|")}
      action={action}
      className="kart-ic"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="form-satir">
        <div className="alan" style={{ flexBasis: 260 }}>
          <label htmlFor="liste-ad">Liste adı *</label>
          <input id="liste-ad" name="ad" required defaultValue={liste.ad} />
        </div>
        <div className="alan" style={{ flexBasis: 320 }}>
          <label htmlFor="liste-aciklama">Açıklama</label>
          <input id="liste-aciklama" name="aciklama" defaultValue={liste.aciklama ?? ""} />
        </div>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13.5, cursor: "pointer" }}>
        <input type="checkbox" name="aktif" defaultChecked={liste.aktif} style={{ marginTop: 3 }} />
        <span>
          <b>Aktif</b> <span className="soluk">— kapatılan liste müşteriye seçilemez; önce müşterilere başka liste atanmalı</span>
        </span>
      </label>
      <div>
        <button type="submit" className="btn btn-ana" disabled={bekliyor}>
          {bekliyor ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
      <FormMesaji sonuc={sonuc} />
    </form>
  );
}
