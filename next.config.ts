import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Yerel ağdaki telefondan test edebilmek için (yalnızca geliştirme ortamında etkili).
  allowedDevOrigins: ["192.168.1.105"],
  // Telefon kamerası fotoğrafları birkaç MB olabiliyor - varsayılan 1MB sınırı yetersiz kalıyordu.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
