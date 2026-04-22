import type { NextConfig } from "next";
import { fileURLToPath } from "url";

// Derive the project root from this file's own URL — works in both CJS and ESM
// and cannot be misled by Turbopack's automatic workspace-root detection.
const PROJECT_ROOT = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: PROJECT_ROOT,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' is required by Next.js App Router for inline hydration scripts.
              // 'unsafe-eval' is removed — it was only needed for dev HMR and must not be in production.
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.spline.design",
              "connect-src 'self' https://nominatim.openstreetmap.org https://prod.spline.design",
              "media-src 'self'",
              "object-src 'none'",
              "manifest-src 'self'",
              "upgrade-insecure-requests",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
