export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  sizeBytes?: number;
  updatedAt: string;
  starred: boolean;
  tags: string[];
  content_type?: string;
  folder_id?: string | null;
}

export type SortField = 'date' | 'name' | 'size';

export type SortOrder = 'asc' | 'desc';

export type ViewMode = 'grid' | 'list';

export interface DisplayItem extends FileItem {
  updatedAtRaw: number;
}
