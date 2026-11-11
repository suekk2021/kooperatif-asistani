import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const govdeFontu = Manrope({
  variable: "--font-govde",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const kodFontu = JetBrains_Mono({
  variable: "--font-kod",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://imece.suluovaureteneller.com"),
  title: "İMECE · Suluova Üreten Eller",
  description: "Suluova Üreten Eller Kadın Kooperatifi — üretim, muhasebe ve iş takibi.",
  openGraph: {
    title: "İMECE · Suluova Üreten Eller",
    description: "Suluova Üreten Eller Kadın Kooperatifi — üretim, muhasebe ve iş takibi.",
    siteName: "İMECE",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og-gorsel.png", width: 1200, height: 630, alt: "Suluova Üreten Eller Kadın Kooperatifi logosu" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-gorsel.png"] },
  icons: { icon: "/logo.png", apple: "/ikon/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "İMECE", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#132b4f",
  viewportFit: "cover",
};

// Sayfa çizilmeden önce tema seçilsin (aksi halde karanlık modda bir an beyaz parlar).
const temaBetigi = `(function(){var t=null;try{t=localStorage.getItem('imece-tema')}catch(e){}if(!t)t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${govdeFontu.variable} ${kodFontu.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
