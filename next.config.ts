import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['assets.coingecko.com', 'coin-images.coingecko.com'],
  },
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
