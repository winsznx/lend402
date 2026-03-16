import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@winsznx/lend402"],
  // Turbopack is the default bundler in Next.js 16.
  // Node.js built-in modules (crypto, buffer, etc.) used by @stacks/transactions
  // are only imported in API routes (server-side), so no browser fallbacks needed.
  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      {
        // Apply CORS headers to all API Vault gateway routes
        source: "/api/v/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",      value: "*" },
          { key: "Access-Control-Allow-Methods",     value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers",     value: "Content-Type, x-payment" },
          { key: "Access-Control-Expose-Headers",    value: "x-payment-response" },
          { key: "Access-Control-Max-Age",           value: "86400" },
        ],
      },
      {
        source: "/v/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",      value: "*" },
          { key: "Access-Control-Allow-Methods",     value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers",     value: "Content-Type, x-payment" },
          { key: "Access-Control-Expose-Headers",    value: "x-payment-response" },
          { key: "Access-Control-Max-Age",           value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
