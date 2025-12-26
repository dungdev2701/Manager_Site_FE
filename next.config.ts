import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Tối ưu cho Docker deployment
};

export default nextConfig;
