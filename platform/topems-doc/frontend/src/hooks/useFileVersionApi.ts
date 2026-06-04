import { useState, useCallback } from 'react';
import axios from 'axios';
import type { ListFileVersionsResponse, FileVersion, FileMetadata } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export function useFileVersionApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listVersions = useCallback(async (fileId: string, page = 1, pageSize = 20) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const response = await axios.get<ListFileVersionsResponse>(
        `${API_BASE_URL}/api/v1/files/${fileId}/versions?${params}`
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取版本列表失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVersion = useCallback(async (fileId: string, versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: FileVersion; message: string }>(
        `${API_BASE_URL}/api/v1/files/${fileId}/versions/${versionId}`
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取版本失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadVersion = useCallback(async (fileId: string, versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/files/${fileId}/versions/${versionId}/download`,
        {
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '下载版本失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (fileId: string, versionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ success: boolean; data: FileMetadata; message: string }>(
        `${API_BASE_URL}/api/v1/files/restore-version`,
        {
          file_id: fileId,
          version_id: versionId,
        }
      );
      return response.data;
    } catch (err: any) {
      let message = '恢复版本失败';
      if (err.response) {
        message = err.response.data?.message || message;
      } else if (err.request) {
        message = '网络错误，请检查后端服务';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    listVersions,
    getVersion,
    downloadVersion,
    restoreVersion,
  };
}
