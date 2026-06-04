import { useState, useCallback } from 'react';
import axios from 'axios';
import type {
  ListTemplatesResponse,
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateCategoryResponse,
  ListTemplateCategoriesResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export function useTemplateApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listTemplates = useCallback(
    async (params?: {
      page?: number;
      page_size?: number;
      search?: string;
      category?: string;
      module?: string;
      is_active?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.module) queryParams.append('module', params.module);
        if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

        const response = await axios.get<ListTemplatesResponse>(
          `${API_BASE_URL}/api/v1/templates?${queryParams}`
        );
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '获取模板列表失败';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ success: boolean; data: Template; message: string }>(
        `${API_BASE_URL}/api/v1/templates/${id}`
      );
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取模板失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (data: CreateTemplateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ success: boolean; data: Template; message: string }>(
        `${API_BASE_URL}/api/v1/templates`,
        data
      );
      return response.data;
    } catch (err: any) {
      let message = '创建模板失败';
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

  const updateTemplate = useCallback(async (id: string, data: UpdateTemplateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put<{ success: boolean; data: Template; message: string }>(
        `${API_BASE_URL}/api/v1/templates/${id}`,
        data
      );
      return response.data;
    } catch (err: any) {
      let message = '更新模板失败';
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

  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/templates/${id}`);
    } catch (err: any) {
      let message = '删除模板失败';
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

  const listCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ListTemplateCategoriesResponse>(
        `${API_BASE_URL}/api/v1/templates/categories`
      );
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '获取分类列表失败';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<{ success: boolean; data: Template; message: string }>(
        `${API_BASE_URL}/api/v1/templates/${id}/duplicate`
      );
      return response.data;
    } catch (err: any) {
      let message = '复制模板失败';
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

  const toggleTemplateStatus = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put<{ success: boolean; data: Template; message: string }>(
        `${API_BASE_URL}/api/v1/templates/${id}/toggle-status`
      );
      return response.data;
    } catch (err: any) {
      let message = '切换模板状态失败';
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
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listCategories,
    duplicateTemplate,
    toggleTemplateStatus,
  };
}
