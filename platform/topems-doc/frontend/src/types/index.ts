export interface FileMetadata {
  id: string;
  name: string;
  folder_id: string | null;
  size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ListFilesData {
  files: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

export interface ListFilesResponse extends ApiResponse<ListFilesData> {}

export interface UploadResponse extends ApiResponse<FileMetadata> {}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ListFoldersData {
  folders: Folder[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListFoldersResponse extends ApiResponse<ListFoldersData> {}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string;
}

export interface UpdateFolderRequest {
  name: string;
  parent_id?: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  size: number;
  checksum: string;
  storage_path: string;
  created_at: string;
  created_by: string;
}

export interface ListFileVersionsData {
  versions: FileVersion[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListFileVersionsResponse extends ApiResponse<ListFileVersionsData> {}

export interface Template {
  id: string;
  name: string;
  code: string;
  category_id: string | null;
  module: string;
  description: string | null;
  content: string;
  variables: any;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TemplateResponse extends Template {
  category_name: string | null;
}

export interface ListTemplatesData {
  items: TemplateResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListTemplatesResponse extends ApiResponse<ListTemplatesData> {}

export interface CreateTemplateRequest {
  name: string;
  code: string;
  category_id?: string;
  module: string;
  description?: string;
  content: string;
  variables?: any;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  code?: string;
  category_id?: string;
  module?: string;
  description?: string;
  content?: string;
  variables?: any;
  is_active?: boolean;
  sort_order?: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategoryResponse extends TemplateCategory {
  template_count: number;
}

export interface ListTemplateCategoriesResponse extends ApiResponse<TemplateCategoryResponse[]> {}
