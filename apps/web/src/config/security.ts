import { isDevelopment } from './runtime';

interface SecurityConfig {
  csp: CspConfig;
  xFrameOptions: string;
  xXssProtection: string;
  contentSecurityPolicy: string;
}

interface CspConfig {
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

/**
 * 开发态 CSP（含 localhost 白名单与 eval，供 Vite 热更新）。
 */
const DEV_CONTENT_SECURITY_POLICY = [
  "default-src 'self' http://localhost:* http://127.0.0.1:*",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.amap.com https://*.gravatar.com https://*.openstreetmap.org",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' data: http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*",
  "object-src 'none'",
  "frame-src 'self' https://*.amap.com",
  "form-action 'self'",
  "base-uri 'self'",
  "worker-src 'self' blob:",
].join('; ');

/**
 * 生产态 CSP。
 *
 * 单独导出是为了有回归护栏：这段政策由 applySecurityHeaders 以 <meta> 在运行时注入，
 * 入口 <script type="module"> 无 nonce/hash，一旦重新引入 'strict-dynamic'，
 * 所有 import() 的按需 chunk（i18n / telemetry / 各页面 chunk）会被浏览器拒绝，
 * 线上直接停在「加载中」。2026-11-27 曾因此整站不可用，故由单测锁定。
 */
export const PRODUCTION_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.amap.com https://*.baidu.com https://*.google.com https://*.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.amap.com https://*.gravatar.com https://*.openstreetmap.org",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.amap.com https://api.map.baidu.com wss://*",
  "object-src 'none'",
  "frame-src 'self' https://*.amap.com",
  "form-action 'self'",
  "base-uri 'self'",
  "worker-src 'self' blob:",
].join('; ');

const isDev = isDevelopment();

const securityConfig: SecurityConfig = {
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
          // 2026-11-27：移除 strict-dynamic。该 CSP 由 applySecurityHeaders 以 <meta> 在运行时注入，
          // 入口 <script type="module"> 无 nonce/hash，strict-dynamic 下没有可信根，
          // 随后所有 import() 按需 chunk（i18n / telemetry / DashboardPage 等）被浏览器拒绝，
          // 线上表现为停留在「加载中」或局部路由空白。同源 SPA 用 'self' + 'unsafe-inline' 即可。
          "'self'",
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

  contentSecurityPolicy: isDev ? DEV_CONTENT_SECURITY_POLICY : PRODUCTION_CONTENT_SECURITY_POLICY,
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
