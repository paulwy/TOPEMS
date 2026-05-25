import { useCallback, useState } from 'react';
import { openPath } from '@tauri-apps/plugin-opener';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { tempDir, join } from '@tauri-apps/api/path';

export function useTauriFile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveBlobToTempAndOpen = useCallback(async (blob: Blob, filename: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[Tauri] 开始保存文件:', filename);
      
      const arrayBuffer = await blob.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const tempFileName = `topems_temp_${Date.now()}_${safeFilename}`;
      
      console.log('[Tauri] 写入文件到临时目录:', tempFileName);
      await writeFile(tempFileName, data, { baseDir: BaseDirectory.Temp });
      
      // 获取临时目录的完整路径并拼接
      const tempDirPath = await tempDir();
      const fullPath = await join(tempDirPath, tempFileName);
      
      console.log('[Tauri] 临时目录:', tempDirPath);
      console.log('[Tauri] 完整路径:', fullPath);
      console.log('[Tauri] 文件写入成功，准备打开');
      
      await openPath(fullPath);
      
      console.log('[Tauri] 文件已成功打开');
      return true;
    } catch (err) {
      console.error('[Tauri] 操作失败:', err);
      const message = err instanceof Error ? err.message : '保存并打开文件失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    saveBlobToTempAndOpen,
  };
}
