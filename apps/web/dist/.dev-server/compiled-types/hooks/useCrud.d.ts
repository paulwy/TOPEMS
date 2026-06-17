import type { AxiosInstance } from "axios";
export interface UseCrudOptions<T> {
    api: AxiosInstance;
    basePath: string;
    initialData?: T[];
    onError?: (error: any) => void;
    onSuccess?: (message: string) => void;
    cacheTime?: number;
    autoFetch?: boolean;
}
export interface UseCrudResult<T, TCreate = Omit<T, "id">, TUpdate = Partial<T>> {
    data: T[];
    loading: boolean;
    error: string | null;
    fetch: (params?: Record<string, any>) => Promise<T[]>;
    get: (id: string | number) => Promise<T>;
    create: (item: TCreate) => Promise<T>;
    update: (id: string | number, item: TUpdate) => Promise<T>;
    delete: (id: string | number) => Promise<void>;
    bulkDelete: (ids: (string | number)[]) => Promise<void>;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        setPage: (page: number) => void;
        setPageSize: (size: number) => void;
    };
    refresh: () => Promise<T[]>;
    clearCache: () => void;
}
export declare function useCrud<T extends {
    id?: string | number;
}, TCreate = Omit<T, "id">, TUpdate = Partial<T>>({ api, basePath, initialData, onError, onSuccess, cacheTime, autoFetch, }: UseCrudOptions<T>): UseCrudResult<T, TCreate, TUpdate>;
export default useCrud;
