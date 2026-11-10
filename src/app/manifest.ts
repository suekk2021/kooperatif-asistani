import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "İMECE · Suluova Üreten Eller",
    short_name: "İMECE",
    description: "Suluova Üreten Eller Kadın Kooperatifi — üretim, muhasebe ve iş takibi.",
    lang: "tr",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f6fa",
    theme_color: "#132b4f",
    icons: [
      { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/ikon/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
