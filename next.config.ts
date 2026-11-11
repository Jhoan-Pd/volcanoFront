import type { NextConfig } from "next";

// The API URL is read from NEXT_PUBLIC_API_URL. VITE_API_URL (the variable the Vite version used)
// is still accepted so the project already configured on Vercel keeps working.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? "http://localhost:10000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_API_URL: API_URL },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
