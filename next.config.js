/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TypeScript
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Permite imagens externas (Supabase)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;