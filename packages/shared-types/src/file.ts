export interface FileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  bucket: string;
  folder?: string;
  uploaderId: string;
  createdAt: string;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
}

export interface FileUploadResult {
  success: boolean;
  fileId: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface FileDownloadResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
}
