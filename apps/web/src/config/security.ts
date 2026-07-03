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

const isDev = import.meta.env.DEV;

export const securityConfig: SecurityConfig = {
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',

  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: isDev
      ? [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'http://localhost:*',
          'ws://localhost:*',
          'wss://localhost:*',
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
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.amap.com', 'https://*.gravatar.com', 'https://*.openstreetmap.org'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    connectSrc: isDev
      ? ["'self'", 'http://localhost:*', 'ws://localhost:*', 'wss://localhost:*']
      : ["'self'", 'https://*.amap.com', 'https://api.map.baidu.com', 'wss://*'],
    objectSrc: ["'none'"],
    frameSrc: ["'self'", 'https://*.amap.com'],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    workerSrc: ["'self'", 'blob:'],
  },

  contentSecurityPolicy: isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* wss://localhost:*",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https://*.amap.com https://*.gravatar.com https://*.openstreetmap.org",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
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
  const metaTags = [
    {
      name: 'Content-Security-Policy',
      content: securityConfig.contentSecurityPolicy,
    },
    {
      name: 'X-Frame-Options',
      content: securityConfig.xFrameOptions,
    },
    {
      name: 'X-XSS-Protection',
      content: securityConfig.xXssProtection,
    },
    {
      name: 'X-Content-Type-Options',
      content: 'nosniff',
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
