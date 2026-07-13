import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

export interface ExportOptions {
  defaultName?: string;
  defaultPath?: string;
  filters?: {
    name: string;
    extensions: string[];
  }[];
}

export const fileApi = {
  async readTextFile(path: string, baseDir?: BaseDirectory): Promise<string> {
    try {
      return await readTextFile(path, baseDir ? { baseDir } : undefined);
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  },

  async writeTextFile(path: string, content: string, baseDir?: BaseDirectory): Promise<void> {
    try {
      await writeTextFile(path, content, baseDir ? { baseDir } : undefined);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  },

  async saveFile(
    content: string,
    options: ExportOptions = {}
  ): Promise<string | null> {
    try {
      const filePath = await save({
        defaultPath: options.defaultName || 'export.txt',
        filters: options.filters,
      });

      if (!filePath) return null;

      await writeTextFile(filePath, content);
      return filePath;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  },

  async openFile(options: ExportOptions = {}): Promise<string | null> {
    try {
      const filePath = await open({
        multiple: false,
        directory: false,
        filters: options.filters,
      });

      if (!filePath || Array.isArray(filePath)) return null;

      const content = await readTextFile(filePath);
      return content;
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  },

  async exportJson<T>(data: T, filename: string = 'export'): Promise<string | null> {
    const content = JSON.stringify(data, null, 2);
    return fileApi.saveFile(content, {
      defaultName: `${filename}.json`,
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });
  },

  async importJson<T>(): Promise<T | null> {
    const content = await fileApi.openFile({
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    });

    if (!content) return null;

    try {
      return JSON.parse(content) as T;
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      throw error;
    }
  },

  async exportCsv(content: string, filename: string = 'export'): Promise<string | null> {
    return fileApi.saveFile(content, {
      defaultName: `${filename}.csv`,
      filters: [
        {
          name: 'CSV',
          extensions: ['csv'],
        },
      ],
    });
  },

  async exportTxt(content: string, filename: string = 'export'): Promise<string | null> {
    return fileApi.saveFile(content, {
      defaultName: `${filename}.txt`,
      filters: [
        {
          name: 'Text',
          extensions: ['txt'],
        },
      ],
    });
  },
};
