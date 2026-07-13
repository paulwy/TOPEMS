import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const currentWindow = getCurrentWindow();

export const windowApi = {
  async minimize(): Promise<void> {
    try {
      await currentWindow.minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  },

  async maximize(): Promise<void> {
    try {
      await currentWindow.maximize();
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  },

  async unmaximize(): Promise<void> {
    try {
      await currentWindow.unmaximize();
    } catch (error) {
      console.error('Failed to unmaximize window:', error);
    }
  },

  async close(): Promise<void> {
    try {
      await currentWindow.close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  },

  async show(): Promise<void> {
    try {
      await currentWindow.show();
    } catch (error) {
      console.error('Failed to show window:', error);
    }
  },

  async hide(): Promise<void> {
    try {
      await currentWindow.hide();
    } catch (error) {
      console.error('Failed to hide window:', error);
    }
  },

  async toggleMaximize(): Promise<void> {
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