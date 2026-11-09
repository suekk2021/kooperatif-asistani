export function YapimAsamasinda({
  baslik,
  aciklama,
  adim,
  gelecekler,
}: {
  baslik: string;
  aciklama: string;
  adim: string;
  gelecekler: string[];
}) {
  return (
    <>
      <div className="sayfa-bas">
        <div>
          <h1>{baslik}</h1>
          <p>{aciklama}</p>
        </div>
        <span className="etk e-amber">{adim}</span>
      </div>
      <div className="yapim">
        <h2>Bu ekran yapım aşamasında</h2>
        <p className="soluk" style={{ margin: 0 }}>
          Tasarım onaylandı; ekran sırası gelince kodlanacak. Bu ekranda olacaklar:
        </p>
        <ul>
          {gelecekler.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
