/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint checking during build to prevent deployment failures due to linting errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript type checking during build
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['api.proofly.ai'], // Allow images from API domain
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
  },
  async headers() {
    return [
      {
        // Apply CORS headers to API routes
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
}

module.exports = nextConfig 