import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: 'topems_token',
  USER: 'topems_user',
  THEME: 'topems_theme',
  LANGUAGE: 'topems_language',
  SCAN_HISTORY: 'topems_scan_history',
};

export const storage = {
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  setToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch {}
  },

  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch {}
  },

  getUser: async <T>(): Promise<T | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser: async <T>(user: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch {}
  },

  removeUser: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
  },

  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.THEME,
        STORAGE_KEYS.LANGUAGE,
        STORAGE_KEYS.SCAN_HISTORY,
      ]);
    } catch {}
  },

  getScanHistory: async <T>(): Promise<T | null> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setScanHistory: async <T>(history: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
    } catch {}
  },

  removeScanHistory: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
    } catch {}
  },
};

export { STORAGE_KEYS };
