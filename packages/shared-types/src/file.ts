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
