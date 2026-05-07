import type { NextConfig } from "next";

// In production (Railway + Vercel), set API_URL to the Railway service root URL
// e.g. API_URL=https://eventsee-api.up.railway.app
// Locally this falls back to the FastAPI dev server.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      // Vercel Blob storage (for uploaded portfolio photos)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" },
    ],
  },
  /**
   * Proxy browser calls to the FastAPI service so session cookies stay same-site.
   * In production, API_URL points to Railway. Locally it hits 127.0.0.1:8000.
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
