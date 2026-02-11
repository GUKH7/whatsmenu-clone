/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TypeScript durante o build (Deploy)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de ESLint (formatação) durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Garante que imagens externas (Supabase) funcionem
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Permite imagens de qualquer lugar (útil para links externos)
      },
    ],
  },
};

export default nextConfig;