"use client";

export function YazdirDugmesi() {
  function yazdir() {
    // Kapalı bölümler kâğıda çıkmaz; yazdırmadan önce hepsini aç.
    document.querySelectorAll("details.hp").forEach((d) => d.setAttribute("open", ""));
    window.print();
  }
  return (
    <button type="button" className="btn btn-cizgi" onClick={yazdir}>
      Yazdır
    </button>
  );
}
