import { useState, useCallback } from 'react';
import axios from 'axios';
import type { ListFilesResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export function useFileApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFiles = useCallback(async (folderId?: string, page = 1, pageSize = 20) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (folderId) params.append('folder_id', folderId);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const response = await axios.get<ListFilesResponse>(
        `${API_BASE_URL}/api/v1/files?${params}`
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (file: File, folderId?: string) => {
    setLoading(true);
    setError(null);
    
    console.log('开始上传文件:', file.name, '大小:', file.size, '类型:', file.type);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folder_id', folderId);

      const response = await axios.post(
        `${API_BASE_URL}/api/v1/files`,
        formData,
        {
          timeout: 10 * 60 * 1000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );
      
      console.log('文件上传成功:', response.data);
      return response.data.data;
    } catch (err: any) {
      console.error('文件上传失败:', err);
      let message = '上传失败';
      
      if (err.response) {
        message = `上传失败: ${err.response.status} - ${err.response.data?.message || '未知错误'}`;
      } else if (err.request) {
        message = '网络错误，请检查后端服务是否运行在 8001 端口';
      } else if (err.code === 'ECONNABORTED') {
        message = '上传超时，请检查文件大小或网络连接';
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/files/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadFile = useCallback(async (id: string, fileName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/files/${id}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    listFiles,
    uploadFile,
    deleteFile,
    downloadFile,
  };
}
