import Link from "next/link";

export default function Bulunamadi() {
  return (
    <div className="yapim" style={{ maxWidth: 520 }}>
      <h2>Bu kayıt bulunamadı</h2>
      <p className="soluk" style={{ margin: "0 0 14px" }}>Adres yanlış olabilir ya da kayıt artık yok.</p>
      <Link href="/panel" className="btn btn-ana">
        Ana Panel
      </Link>
    </div>
  );
}
