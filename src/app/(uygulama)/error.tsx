"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TEKNIK_DESTEK } from "@/lib/imza";

export default function Hata({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="yapim" style={{ maxWidth: 520 }}>
      <h2>Bu ekran açılamadı</h2>
      <p className="soluk" style={{ margin: "0 0 14px" }}>
        Girdiğiniz kayıtlar yerinde duruyor; sorun yalnızca bu ekranın gösterilmesinde. İnternet bağlantınızı kontrol edip yeniden
        deneyin. Sürerse teknik desteğe haber verin{TEKNIK_DESTEK.telefon ? ` (${TEKNIK_DESTEK.telefon})` : ""}.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ana" onClick={() => retry()}>
          Yeniden dene
        </button>
        <Link href="/panel" className="btn btn-cizgi">
          Ana Panel
        </Link>
      </div>
    </div>
  );
}
