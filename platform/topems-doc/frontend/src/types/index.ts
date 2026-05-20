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

export interface ListFilesResponse {
  files: FileMetadata[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadFileRequest {
  file: File;
  folder_id?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}
