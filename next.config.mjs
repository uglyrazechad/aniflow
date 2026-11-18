/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel собирает проект сам и не умеет standalone-вывод, для него оставляем дефолт.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
