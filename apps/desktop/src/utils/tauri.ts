import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const currentWindow = isTauri ? getCurrentWindow() : null;

export const windowApi = {
  async minimize(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  },

  async maximize(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.maximize();
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  },

  async unmaximize(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.unmaximize();
    } catch (error) {
      console.error('Failed to unmaximize window:', error);
    }
  },

  async close(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  },

  async show(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.show();
    } catch (error) {
      console.error('Failed to show window:', error);
    }
  },

  async hide(): Promise<void> {
    if (!currentWindow) return;
    try {
      await currentWindow.hide();
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  },

  async toggleMaximize(): Promise<void> {
    if (!currentWindow) return;
    try {
      const isMaximized = await invoke('is_window_maximized');
      if (isMaximized) {
        await currentWindow.unmaximize();
      } else {
        await currentWindow.maximize();
      }
    } catch (error) {
      console.error('Failed to toggle maximize:', error);
    }
  },

  async create(title: string, path: string): Promise<string> {
    try {
      return await invoke('create_window', { title, path });
    } catch (error) {
      console.error('Failed to create window:', error);
      throw error;
    }
  },

  async getWindows(): Promise<Array<{ label: string; title: string }>> {
    try {
      const result = await invoke<Array<[string, string]>>('get_windows');
      return result.map(([label, title]) => ({ label, title }));
    } catch (error) {
      console.error('Failed to get windows:', error);
      return [];
    }
  },

  async switch(label: string): Promise<void> {
    try {
      await invoke('switch_window', { label });
    } catch (error) {
      console.error('Failed to switch window:', error);
    }
  },

  async closeByLabel(label: string): Promise<void> {
    try {
      await invoke('close_window', { label });
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  },

  async closeCurrent(): Promise<void> {
    try {
      await invoke('close_current_window');
    } catch (error) {
      console.error('Failed to close current window:', error);
    }
  },

  async next(): Promise<void> {
    try {
      await invoke('next_window');
    } catch (error) {
      console.error('Failed to switch to next window:', error);
    }
  },
};

export const appApi = {
  async exit(): Promise<void> {
    try {
      await invoke('exit_app', { code: 0 });
    } catch (error) {
      console.error('Failed to exit app:', error);
    }
  },

  async restart(): Promise<void> {
    try {
      await invoke('restart_app');
    } catch (error) {
      console.error('Failed to restart app:', error);
    }
  },

  async getVersion(): Promise<string> {
    try {
      return await invoke('get_app_version');
    } catch (error) {
      console.error('Failed to get app version:', error);
      return '1.0.0';
    }
  },

  async getName(): Promise<string> {
    try {
      return await invoke('get_app_name');
    } catch (error) {
      console.error('Failed to get app name:', error);
      return 'TOPEMS';
    }
  },
};

export const tauriApi = {
  invoke,
  window: windowApi,
  app: appApi,
};

export default tauriApi;
