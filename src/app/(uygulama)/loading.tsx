// Bir bölüme dokununca veri gelene kadar görünür; "bastım, bir şey olmadı" hissini önler.
export default function Yukleniyor() {
  return (
    <div className="yukleniyor" role="status" aria-label="Yükleniyor">
      <div className="yk-cizgi yk-baslik" />
      <div className="yk-cizgi yk-alt" />
      <div className="kart kart-ic">
        <div className="yk-cizgi" />
        <div className="yk-cizgi" style={{ width: "82%" }} />
        <div className="yk-cizgi" style={{ width: "64%" }} />
      </div>
    </div>
  );
}
