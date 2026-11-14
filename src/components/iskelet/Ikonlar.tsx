// Taslaktaki menü ikonları (tasarim-taslagi/index.html) — aynı çizimler.
const ortak = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

export const ikonlar = {
  panel: (
    <svg {...ortak}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  isler: (
    <svg {...ortak}>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="11" rx="1.5" />
      <rect x="17" y="4" width="4" height="7" rx="1.5" />
    </svg>
  ),
  asistan: (
    <svg {...ortak}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
    </svg>
  ),
  hatirlatici: (
    <svg {...ortak}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  ),
  notlar: (
    <svg {...ortak}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  ),
  alis: (
    <svg {...ortak}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  uretim: (
    <svg {...ortak}>
      <path d="M3 21V10l6 4V10l6 4V5h6v16z" />
    </svg>
  ),
  satis: (
    <svg {...ortak}>
      <path d="M12 21V9M7 14l5-5 5 5" />
      <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  stok: (
    <svg {...ortak}>
      <path d="M21 8l-9-5-9 5 9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  ),
  kasa: (
    <svg {...ortak}>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </svg>
  ),
  cari: (
    <svg {...ortak}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6" />
    </svg>
  ),
  personel: (
    <svg {...ortak}>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 21a7 7 0 0 1 14 0" />
      <path d="M9.5 14.5 12 17l2.5-2.5" />
    </svg>
  ),
  rapor: (
    <svg {...ortak}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  hesap: (
    <svg {...ortak}>
      <path d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  aktarim: (
    <svg {...ortak}>
      <path d="M4 4h10l6 6v10H4z" />
      <path d="M14 4v6h6M9 14l3 3 3-3M12 17v-6" />
    </svg>
  ),
  yardim: (
    <svg {...ortak}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </svg>
  ),
  gecmis: (
    <svg {...ortak}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  sayim: (
    <svg {...ortak}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  ),
  tahsilat: (
    <svg {...ortak}>
      <path d="M12 3v11M7 9l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  ),
  odeme: (
    <svg {...ortak}>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M4 19h16" />
    </svg>
  ),
  virman: (
    <svg {...ortak}>
      <path d="M4 8h14l-3-3M20 16H6l3 3" />
    </svg>
  ),
  arti: (
    <svg {...ortak} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  kapat: (
    <svg {...ortak}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  menu: (
    <svg {...ortak}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  ay: (
    <svg {...ortak} className="tema-ikon-ay">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
  gunes: (
    <svg {...ortak} className="tema-ikon-gunes">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
};

export type IkonAdi = keyof typeof ikonlar;
