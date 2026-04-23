import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
  /**
   * Proxy browser calls to the FastAPI service so session cookies stay same-site
   * on ``localhost`` during development.
   */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8000/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
