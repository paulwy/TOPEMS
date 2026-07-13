export * as scan from './scan';
export * as approval from './approval';
export * as attendance from './attendance';
export * as task from './task';
export * as dashboard from './dashboard';
export * as utils from './utils';

export const isDev = process.env.NODE_ENV === 'development';

export function shouldUseMock(): boolean {
  if (process.env.EXPO_PUBLIC_USE_MOCK === 'true') return true;
  if (isDev && !process.env.EXPO_PUBLIC_API_URL) return true;
  return false;
}