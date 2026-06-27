import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getCsrfToken, initCsrfToken, verifyCsrfToken } from './security';

const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf_token';

export const csrfRequestInterceptor = <T extends AxiosRequestConfig>(config: T): T => {
  const token = getCsrfToken();

  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)[CSRF_HEADER] = token;
  }

  return config;
};

export const csrfResponseInterceptor = (response: AxiosResponse): AxiosResponse => {
  const csrfToken = response.headers[CSRF_HEADER.toLowerCase()];

  if (csrfToken && typeof csrfToken === 'string') {
    const cookieValue = csrfToken;
    document.cookie = `${CSRF_COOKIE_NAME}=${cookieValue}; path=/; SameSite=Strict; Secure`;
  }

  return response;
};

export const initCsrfProtection = (): void => {
  initCsrfToken();
};

export const validateCsrfToken = (token: string | undefined): boolean => {
  if (!token) return false;
  return verifyCsrfToken(token);
};

export const getCsrfHeaderName = (): string => {
  return CSRF_HEADER;
};
