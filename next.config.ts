import type { NextConfig } from 'next';

const isElectronBuild = process.env.NEXT_PUBLIC_IS_ELECTRON === 'true';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development' || isElectronBuild,
});

const nextConfig: NextConfig = {
  output: isElectronBuild ? 'export' : 'standalone',
  trailingSlash: isElectronBuild ? true : undefined,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: isElectronBuild,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '43031',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
