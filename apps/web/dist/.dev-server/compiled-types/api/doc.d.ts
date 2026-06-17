import type { ApiResponse } from "./client";
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
export interface FileListResponse {
    files: FileMetadata[];
    total: number;
    page: number;
    page_size: number;
}
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
export interface CreateFolderRequest {
    name: string;
    parent_id?: string;
}
export declare const docApi: {
    list: (folderId?: string) => Promise<ApiResponse<FileListResponse>>;
    get: (id: string) => Promise<ApiResponse<FileMetadata>>;
    upload: (file: File, folderId?: string) => Promise<ApiResponse<FileMetadata>>;
    download: (id: string) => Promise<Blob>;
    preview: (id: string) => Promise<string>;
    delete: (id: string) => Promise<ApiResponse<void>>;
    health: () => Promise<ApiResponse<string>>;
    listFolders: (parentId?: string) => Promise<ApiResponse<ListFoldersData>>;
    createFolder: (request: CreateFolderRequest) => Promise<ApiResponse<Folder>>;
    getFolder: (id: string) => Promise<ApiResponse<Folder>>;
    updateFolder: (id: string, request: CreateFolderRequest) => Promise<ApiResponse<Folder>>;
    deleteFolder: (id: string) => Promise<ApiResponse<void>>;
};
