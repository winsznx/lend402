/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is the default bundler in Next.js 16.
  // Node.js built-in modules (crypto, buffer, etc.) used by @stacks/transactions
  // are only imported in API routes (server-side), so no browser fallbacks needed.
  turbopack: {},
};

export default nextConfig;
