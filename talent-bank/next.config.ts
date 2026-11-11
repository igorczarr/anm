import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/talentos",
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "anm.vrtice.com.br",
        "www.anm.vrtice.com.br",
        "anm-talentos.vercel.app",
        "*.vercel.app",
        "localhost:3000",
      ],
    },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;


