import { isDevelopment } from './runtime';

export interface SecurityConfig {
  csp: CspConfig;
  xFrameOptions: string;
  xXssProtection: string;
  contentSecurityPolicy: string;
}

export interface CspConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  objectSrc: string[];
  frameSrc: string[];
  formAction: string[];
  baseUri: string[];
  workerSrc: string[];
}

const isDev = isDevelopment();

export const securityConfig: SecurityConfig = {
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',

  csp: {
    defaultSrc: isDev ? ["'self'", 'http://localhost:*', 'http://127.0.0.1:*'] : ["'self'"],
    scriptSrc: isDev
      ? [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'http://localhost:*',
          'http://127.0.0.1:*',
          'ws://localhost:*',
          'ws://127.0.0.1:*',
          'wss://localhost:*',
          'wss://127.0.0.1:*',
        ]
      : [
          "'self'",
          "'strict-dynamic'",
          "'unsafe-inline'",
          'https://*.amap.com',
          'https://*.baidu.com',
          'https://*.google.com',
          'https://*.google-analytics.com',
        ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://*.amap.com',
      'https://*.gravatar.com',
      'https://*.openstreetmap.org',
    ],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: isDev
      ? [
          "'self'",
          'http://localhost:*',
          'http://127.0.0.1:*',
          'ws://localhost:*',
          'ws://127.0.0.1:*',
          'wss://localhost:*',
          'wss://127.0.0.1:*',
        ]
      : ["'self'", 'https://*.amap.com', 'https://api.map.baidu.com', 'wss://*'],
    objectSrc: ["'none'"],
    frameSrc: ["'self'", 'https://*.amap.com'],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
  },

  contentSecurityPolicy: isDev
    ? [
        "default-src 'self' http://localhost:* http://127.0.0.1:*",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://*.amap.com https://*.gravatar.com https://*.openstreetmap.org",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*",
        "object-src 'none'",
        "frame-src 'self' https://*.amap.com",
        "form-action 'self'",
        "base-uri 'self'",
        "worker-src 'self' blob:",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self' 'strict-dynamic' 'unsafe-inline' https://*.amap.com https://*.baidu.com https://*.google.com https://*.google-analytics.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://*.amap.com https://*.gravatar.com https://*.openstreetmap.org",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.amap.com https://api.map.baidu.com wss://*",
        "object-src 'none'",
        "frame-src 'self' https://*.amap.com",
        "form-action 'self'",
        "base-uri 'self'",
        "worker-src 'self' blob:",
      ].join('; '),
};

export const applySecurityHeaders = (): void => {
  // Note: X-Frame-Options and X-Content-Type-Options can only be set via HTTP headers,
  // not <meta> tags. They are included here for documentation but should be configured
  // on the server (e.g., Vite proxy, Nginx, or CDN).
  const metaTags = [
    {
      name: 'Content-Security-Policy',
      content: securityConfig.contentSecurityPolicy,
    },
    {
      name: 'X-XSS-Protection',
      content: securityConfig.xXssProtection,
    },
    {
      name: 'Referrer-Policy',
      content: 'strict-origin-when-cross-origin',
    },
  ];

  metaTags.forEach(({ name, content }) => {
    const meta = document.createElement('meta');
    meta.httpEquiv = name;
    meta.content = content;
    document.head.appendChild(meta);
  });
};
