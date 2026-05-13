import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Cloudflare Turnstile + Firebase App Check (reCAPTCHA v3) need to load
      // third-party scripts. Keep 'unsafe-inline'/'unsafe-eval' for Next.js
      // dev and Firebase internals.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // Turnstile siteverify is server-side, but the widget calls Cloudflare
      // and reCAPTCHA endpoints from the browser. 'https:' already permits
      // these but we list them explicitly for clarity.
      "connect-src 'self' https: https://challenges.cloudflare.com https://www.google.com/recaptcha/ https://firebaseappcheck.googleapis.com",
      // Iframes used by the captcha widgets.
      "frame-src 'self' https://challenges.cloudflare.com https://www.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    localPatterns: [
      {
        pathname: "/assets/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
