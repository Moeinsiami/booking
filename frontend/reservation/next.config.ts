import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: [
    "172.19.0.1",
    "192.168.100.30",
    "localhost",
    "127.0.0.1",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8000";
    return [
      {
        source: "/api/v1/:path*/",
        destination: `${backend}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*/`,
      },
    ];
  },
};

export default nextConfig;
