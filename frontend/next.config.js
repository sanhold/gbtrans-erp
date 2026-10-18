/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@headlessui/react', 'date-fns', 'chart.js', 'react-chartjs-2'],
  },
  images: {
    domains: ['localhost'],
  },
  allowedDevOrigins: ['192.168.1.67'],
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1').replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
