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
