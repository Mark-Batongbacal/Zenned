import { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
	allowedDevOrigins: ['http://192.168.194.103:3000'],
  },
};

export default nextConfig;
