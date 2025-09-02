// next.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security headers (keep at least one; adjust CSP as you harden)
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join("; ")
  }
];

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { allowedOrigins: ["localhost"] } },

  // Ensure bundler resolves "@/..."
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias || {}), "@": __dirname };
    return config;
  },

  // Only add a route if headers exist (prevents "headers field cannot be empty")
  async headers() {
    if (!securityHeaders.length) return []; // safety valve
    return [{ source: "/(.*)", headers: securityHeaders }];
  }
};

export default nextConfig;
