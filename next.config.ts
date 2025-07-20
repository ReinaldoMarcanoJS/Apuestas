import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'aklfmezskcxxyhjulmpy.supabase.co',

      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
    ],
  },
};

export default nextConfig;
