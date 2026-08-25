/**
 * Tauri IPC Service — Frontend ↔ Backend Token Sync
 *
 * Provides seamless token synchronization between the React frontend and
 * the Tauri Rust backend. When running in Tauri, tokens are stored in
 * the backend's process memory (not just localStorage), allowing:
 *
 * - Token persistence across app restarts (backend retains token)
 * - Secure token handling (token never exposed to JS heap alone)
 * - Shared token access from multiple webview windows
 *
 * When running in a browser (non-Tauri), all functions are no-ops,
 * and the app falls back to standard localStorage-based auth.
 */

interface TauriInvokeResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

let _isTauriAvailable: boolean | null = null;

function isTauriAvailable(): boolean {
  if (_isTauriAvailable !== null) return _isTauriAvailable;
  try {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      _isTauriAvailable = true;
    } else {
      _isTauriAvailable = false;
    }
  } catch {
    _isTauriAvailable = false;
  }
  return _isTauriAvailable;
}

async function invoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<TauriInvokeResponse<T>> {
  if (!isTauriAvailable()) {
    return { success: false, data: null, error: 'Not running in Tauri environment' };
  }

  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    const result = await tauriInvoke<TauriInvokeResponse<T>>(command, args);
    return result;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const tauriAuth = {
  /**
   * Check if running in Tauri desktop environment
   */
  isAvailable(): boolean {
    return isTauriAvailable();
  },

  /**
   * Save auth token to Tauri backend storage
   * Called after successful login or token refresh
   */
  async setToken(token: string | null): Promise<void> {
    if (!isTauriAvailable()) return;

    const result = await invoke<void>('set_token', { token });
    if (!result.success) {
      console.warn('[TauriAuth] Failed to set token:', result.error);
    }
  },

  /**
   * Retrieve auth token from Tauri backend storage
   * Called on app startup to restore session
   */
  async getToken(): Promise<string | null> {
    if (!isTauriAvailable()) return null;

    const result = await invoke<string | null>('get_token');
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  },

  /**
   * Clear auth token from Tauri backend storage
   * Called on logout
   */
  async clearToken(): Promise<void> {
    if (!isTauriAvailable()) return;

    const result = await invoke<void>('clear_token');
    if (!result.success) {
      console.warn('[TauriAuth] Failed to clear token:', result.error);
    }
  },

  // ─── User Info Sync ───

  async setUserInfo(user: unknown, roles: string[], permissions: string[]): Promise<void> {
    if (!isTauriAvailable()) {
      localStorage.setItem('user_info', JSON.stringify({ user, roles, permissions }));
      return;
    }
    try {
      const payload = JSON.stringify({ user_json: user, roles, permissions });
      console.log('[TauriAuth] Calling set_user_info with payload length:', payload.length);
      const result = await invoke<void>('set_user_info', {
        data: payload,
      });
      console.log('[TauriAuth] set_user_info result:', result);
      if (!result.success) {
        console.warn('[TauriAuth] Failed to set user info:', result.error);
      }
    } catch (err) {
      console.error('[TauriAuth] set_user_info exception:', err);
    }
  },

  async getUserInfo(): Promise<{ user: unknown; roles: string[]; permissions: string[] } | null> {
    if (!isTauriAvailable()) {
      const raw = localStorage.getItem('user_info');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return null;
    }
    const result = await invoke<{ user: unknown; roles: string[]; permissions: string[] }>(
      'get_user_info'
    );
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  },

  async clearUserInfo(): Promise<void> {
    if (!isTauriAvailable()) {
      localStorage.removeItem('user_info');
      return;
    }
    const result = await invoke<void>('clear_user_info');
    if (!result.success) {
      console.warn('[TauriAuth] Failed to clear user info:', result.error);
    }
  },

  // ─── Token Expiry Management ───

  async setTokenExpiry(expiryTimestamp: number): Promise<void> {
    if (!isTauriAvailable()) {
      localStorage.setItem('token_expiry_ts', expiryTimestamp.toString());
      return;
    }
    try {
      console.log('[TauriAuth] Calling set_token_expiry with ts:', expiryTimestamp);
      const result = await invoke<void>('set_token_expiry', { ts: expiryTimestamp });
      console.log('[TauriAuth] set_token_expiry result:', result);
      if (!result.success) {
        console.warn('[TauriAuth] Failed to set token expiry:', result.error);
      }
    } catch (err) {
      console.error('[TauriAuth] set_token_expiry exception:', err);
    }
  },

  async getTokenExpiry(): Promise<number | null> {
    if (!isTauriAvailable()) {
      const raw = localStorage.getItem('token_expiry_ts');
      if (raw) {
        const ts = parseInt(raw, 10);
        return isNaN(ts) ? null : ts;
      }
      return null;
    }
    const result = await invoke<number>('get_token_expiry');
    if (result.success && result.data !== null && result.data !== undefined) {
      return result.data;
    }
    return null;
  },

  async clearTokenExpiry(): Promise<void> {
    if (!isTauriAvailable()) {
      localStorage.removeItem('token_expiry_ts');
      return;
    }
    const result = await invoke<void>('clear_token_expiry');
    if (!result.success) {
      console.warn('[TauriAuth] Failed to clear token expiry:', result.error);
    }
  },

  async isTokenValid(): Promise<boolean> {
    if (!isTauriAvailable()) {
      const expiry = localStorage.getItem('token_expiry_ts');
      if (!expiry) return false;
      const ts = parseInt(expiry, 10);
      if (isNaN(ts)) return false;
      return Date.now() < ts;
    }
    const result = await invoke<boolean>('is_token_valid');
    if (result.success && result.data !== null && result.data !== undefined) {
      return result.data;
    }
    return false;
  },

  // ─── Multi-Window Token Change Notification ───

  async broadcastTokenChange(token: string | null): Promise<void> {
    if (!isTauriAvailable()) return;
    try {
      const { emit } = await import('@tauri-apps/api/event');
      await emit('auth-token-changed', { token });
    } catch (error) {
      console.warn('[TauriAuth] Failed to broadcast token change:', error);
    }
  },

  onTokenChange(callback: (token: string | null) => void): () => void {
    if (!isTauriAvailable()) {
      return () => {};
    }
    let unlistenFn: (() => void) | null = null;
    let isUnsubscribed = false;

    import('@tauri-apps/api/event').then(async ({ listen }) => {
      if (isUnsubscribed) return;
      const unlisten = await listen<{ token: string | null }>('auth-token-changed', (event) => {
        callback(event.payload?.token ?? null);
      });
      if (!isUnsubscribed) {
        unlistenFn = unlisten;
      } else {
        unlisten();
      }
    });

    return () => {
      isUnsubscribed = true;
      if (unlistenFn) {
        unlistenFn();
      }
    };
  },
};
