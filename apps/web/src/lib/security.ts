import DOMPurify from 'dompurify';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRE_KEY = 'csrf_token_expire';

export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
  });
  // 纵深防御（拍板 A，2026-10-25）：iframe 缺 sandbox 时强制注入空 sandbox
  // （默认无脚本/无同源权限），防富文本内嵌 iframe 逃逸执行
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  doc.querySelectorAll('iframe').forEach((el) => {
    if (!el.hasAttribute('sandbox')) el.setAttribute('sandbox', '');
  });
  return doc.body.innerHTML;
};

export const escapeHtml = (text: string): string => {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateCsrfToken = (): string => {
  const array = new Uint32Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => dec.toString(16).padStart(8, '0')).join('');
};

export const setCsrfToken = (token: string): void => {
  const expireTime = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(CSRF_TOKEN_KEY, token);
  localStorage.setItem(CSRF_TOKEN_EXPIRE_KEY, expireTime.toString());
};

export const getCsrfToken = (): string | null => {
  const token = localStorage.getItem(CSRF_TOKEN_KEY);
  const expireTime = localStorage.getItem(CSRF_TOKEN_EXPIRE_KEY);

  if (!token || !expireTime) return null;

  if (Date.now() > parseInt(expireTime, 10)) {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(CSRF_TOKEN_EXPIRE_KEY);
    return null;
  }

  return token;
};

export const verifyCsrfToken = (token: string): boolean => {
  const storedToken = getCsrfToken();
  return storedToken === token;
};

export const initCsrfToken = (): string => {
  let token = getCsrfToken();
  if (!token) {
    token = generateCsrfToken();
    setCsrfToken(token);
  }
  return token;
};
