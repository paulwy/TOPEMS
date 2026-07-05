import type { StoreApi, UseBoundStore } from 'zustand';

const SHARED_STATE_KEY = '__TOPEMS_SHARED_STATE__';

export interface SharedState {
  auth?: {
    user: unknown;
    token: string | null;
    isAuthenticated: boolean;
    roles: string[];
    permissions: string[];
  };
  theme?: {
    mode: 'light' | 'dark';
    primaryColor?: string;
  };
  i18n?: {
    language: string;
  };
  [key: string]: unknown;
}

declare global {
  interface Window {
    [SHARED_STATE_KEY]?: SharedState;
  }
}

export const getSharedState = (): SharedState => {
  if (typeof window === 'undefined') return {};
  return window[SHARED_STATE_KEY] || {};
};

export const setSharedState = (state: Partial<SharedState>): void => {
  if (typeof window === 'undefined') return;
  if (!window[SHARED_STATE_KEY]) {
    window[SHARED_STATE_KEY] = {};
  }
  window[SHARED_STATE_KEY] = {
    ...window[SHARED_STATE_KEY],
    ...state,
  };

  window.dispatchEvent(
    new CustomEvent('topems:shared-state-change', {
      detail: state,
    })
  );
};

export const subscribeToSharedState = (callback: (state: SharedState) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    callback(getSharedState());
  };

  window.addEventListener('topems:shared-state-change', handler);
  return () => {
    window.removeEventListener('topems:shared-state-change', handler);
  };
};

export const initSharedState = (initialState: Partial<SharedState>): void => {
  setSharedState(initialState);
};

export const syncAuthState = (auth: SharedState['auth']): void => {
  setSharedState({ auth });
};

export const getAuthState = (): SharedState['auth'] | undefined => {
  return getSharedState().auth;
};

export const syncThemeState = (theme: SharedState['theme']): void => {
  setSharedState({ theme });
};

export const getThemeState = (): SharedState['theme'] | undefined => {
  return getSharedState().theme;
};

export const syncI18nState = (i18n: SharedState['i18n']): void => {
  setSharedState({ i18n });
};

export const getI18nState = (): SharedState['i18n'] | undefined => {
  return getSharedState().i18n;
};

export default {
  getSharedState,
  setSharedState,
  subscribeToSharedState,
  initSharedState,
  syncAuthState,
  getAuthState,
  syncThemeState,
  getThemeState,
  syncI18nState,
  getI18nState,
};
