import apiClient from '../client';
import type { ApiResponse } from '../client';

// ============== Attachment API ==============
export interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
  entity_type?: string;
  entity_id?: string;
}

export interface UploadAttachmentRequest {
  file: File;
  entity_type?: string;
  entity_id?: string;
}

export const attachmentApi = {
  async upload(
    file: File,
    entityType?: string,
    entityId?: string
  ): Promise<ApiResponse<Attachment>> {
    const formData = new FormData();
    formData.append('file', file);
    if (entityType) formData.append('entity_type', entityType);
    if (entityId) formData.append('entity_id', entityId);

    return apiClient.file.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async list(params?: {
    entity_type?: string;
    entity_id?: string;
  }): Promise<ApiResponse<Attachment[]>> {
    const searchParams = new URLSearchParams();
    if (params?.entity_type) searchParams.set('entity_type', params.entity_type);
    if (params?.entity_id) searchParams.set('entity_id', params.entity_id);
    const queryString = searchParams.toString();
    return apiClient.file.get(`/attachments${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Attachment>> {
    return apiClient.file.get(`/attachments/${id}`);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.file.delete(`/attachments/${id}`);
  },

  async download(id: string): Promise<Blob> {
    const response = await apiClient.file.get(`/attachments/${id}/download`, {
      responseType: 'blob',
    });
    return response as unknown as Blob;
  },
};

// ============== Comment API ==============
export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  entity_type: string;
  entity_id: string;
  parentId?: string;
  replies?: Comment[];
  created_at: string;
  updated_at?: string;
}

export interface CreateCommentRequest {
  content: string;
  entity_type: string;
  entity_id: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export const commentApi = {
  async list(entityType: string, entityId: string): Promise<ApiResponse<Comment[]>> {
    return apiClient.core.get(`/comments?entity_type=${entityType}&entity_id=${entityId}`);
  },

  async create(data: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    return apiClient.core.post('/comments', data);
  },

  async update(id: string, data: UpdateCommentRequest): Promise<ApiResponse<Comment>> {
    return apiClient.core.put(`/comments/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.core.delete(`/comments/${id}`);
  },
};

// ============== Favorite API ==============
export interface Favorite {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  user_id: string;
  created_at: string;
}

export interface AddFavoriteRequest {
  entity_type: string;
  entity_id: string;
  entity_name: string;
}

export const favoriteApi = {
  async list(): Promise<ApiResponse<Favorite[]>> {
    return apiClient.core.get('/favorites');
  },

  async add(data: AddFavoriteRequest): Promise<ApiResponse<Favorite>> {
    return apiClient.core.post('/favorites', data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.core.delete(`/favorites/${id}`);
  },

  async check(entityType: string, entityId: string): Promise<ApiResponse<boolean>> {
    return apiClient.core.get(`/favorites/check?entity_type=${entityType}&entity_id=${entityId}`);
  },
};

// ============== Global Search API ==============
export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  highlights?: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pagesize: number;
  aggregations?: Record<string, number>;
}

export const searchApi = {
  async search(
    query: string,
    params?: {
      types?: string[];
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<SearchResponse>> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.types?.length) searchParams.set('types', params.types.join(','));
    return apiClient.core.get(`/search?${searchParams.toString()}`);
  },

  async getSuggestions(query: string): Promise<ApiResponse<string[]>> {
    return apiClient.core.get(`/search/suggestions?q=${encodeURIComponent(query)}`);
  },

  async getRecentSearches(): Promise<ApiResponse<string[]>> {
    return apiClient.core.get('/search/recent');
  },

  async clearRecentSearches(): Promise<ApiResponse<string>> {
    return apiClient.core.delete('/search/recent');
  },
};

// ============== Export all ==============
const sharedApi = {
  attachment: attachmentApi,
  comment: commentApi,
  favorite: favoriteApi,
  search: searchApi,
};

export default sharedApi;
