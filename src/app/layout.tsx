import type { Metadata } from "next";
import { Bricolage_Grotesque, Work_Sans } from "next/font/google";
import "./globals.css";

const baslikFontu = Bricolage_Grotesque({
  variable: "--font-baslik",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const govdeFontu = Work_Sans({
  variable: "--font-govde",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Kooperatif Asistanı — Suluova Üreten Eller Kadın Kooperatifi",
  description:
    "Suluova Üreten Eller Kadın Kooperatifi için gelir-gider, hatırlatıcı ve Telegram asistanlı yönetim programı.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${baslikFontu.variable} ${govdeFontu.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
