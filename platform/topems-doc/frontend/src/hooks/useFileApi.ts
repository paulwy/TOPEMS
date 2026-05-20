import { useState, useCallback } from 'react';
import axios from 'axios';
import type { FileMetadata, ListFilesResponse } from '../types';

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
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folder_id', folderId);

      const response = await axios.post<FileMetadata>(
        `${API_BASE_URL}/api/v1/files`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      throw err;
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

  return {
    loading,
    error,
    listFiles,
    uploadFile,
    deleteFile,
  };
}
