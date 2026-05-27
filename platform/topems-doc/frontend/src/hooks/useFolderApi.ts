import { useState, useCallback } from 'react';
import axios from 'axios';
import type { Folder, ListFoldersResponse, CreateFolderRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export function useFolderApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listFolders = useCallback(async (parentId?: string, page = 1, pageSize = 100) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (parentId) params.append('parent_id', parentId);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const response = await axios.get<ListFoldersResponse>(
        `${API_BASE_URL}/api/v1/folders?${params}`
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取文件夹列表失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (request: CreateFolderRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ success: boolean; data: Folder; message: string }>(
        `${API_BASE_URL}/api/v1/folders`,
        request
      );
      return response.data.data;
    } catch (err: any) {
      let message = '创建文件夹失败';
      
      if (err.response) {
        message = `创建失败: ${err.response.status} - ${err.response.data?.message || '未知错误'}`;
      } else if (err.request) {
        message = '网络错误，请检查后端服务是否运行在 8001 端口';
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFolder = useCallback(async (id: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put<{ success: boolean; data: Folder; message: string }>(
        `${API_BASE_URL}/api/v1/folders/${id}`,
        { name }
      );
      return response.data.data;
    } catch (err: any) {
      let message = '更新文件夹失败';
      
      if (err.response) {
        message = `更新失败: ${err.response.status} - ${err.response.data?.message || '未知错误'}`;
      } else if (err.request) {
        message = '网络错误，请检查后端服务是否运行在 8001 端口';
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/folders/${id}`);
    } catch (err: any) {
      let message = '删除文件夹失败';
      
      if (err.response) {
        message = `删除失败: ${err.response.status} - ${err.response.data?.message || '未知错误'}`;
      } else if (err.request) {
        message = '网络错误，请检查后端服务是否运行在 8001 端口';
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
    listFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
