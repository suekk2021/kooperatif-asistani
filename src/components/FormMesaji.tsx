import type { FormSonucu } from "@/app/actions/cariler";

export function FormMesaji({ sonuc }: { sonuc: FormSonucu }) {
  if (sonuc.hata) return <p className="mesaj hata">{sonuc.hata}</p>;
  if (sonuc.basarili) return <p className="mesaj tamam">✓ {sonuc.basarili}</p>;
  return null;
}
