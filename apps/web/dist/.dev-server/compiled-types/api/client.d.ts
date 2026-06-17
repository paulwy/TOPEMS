import type { AxiosInstance, AxiosRequestConfig } from "axios";
export interface ApiResponse<T = any> {
    code: number;
    success: boolean;
    data: T | undefined;
    message: string;
    timestamp: string;
}
export interface PaginationParams {
    page?: number;
    pageSize?: number;
    search?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
type TypedAxiosInstance = Omit<AxiosInstance, "get" | "post" | "put" | "patch" | "delete"> & {
    get<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
    post<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    put<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    patch<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>;
    delete<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>;
};
export declare const createBaseAxiosClient: (baseURL: string) => AxiosInstance;
/**
 * 统一的 Blob 下载函数
 * 解决使用 responseType: "blob" 时，401 错误被当作 blob 返回的问题
 */
export declare const downloadBlob: (baseURL: string, url: string, options?: {
    params?: Record<string, any>;
}) => Promise<Blob>;
declare class ApiClient {
    private clients;
    constructor();
    getClient(name: string): TypedAxiosInstance;
    get iam(): TypedAxiosInstance;
    get doc(): TypedAxiosInstance;
    get ai(): TypedAxiosInstance;
    get flow(): TypedAxiosInstance;
    get rs(): TypedAxiosInstance;
    get lims(): TypedAxiosInstance;
    get qms(): TypedAxiosInstance;
    get ehs(): TypedAxiosInstance;
    get srm(): TypedAxiosInstance;
    get pdm(): TypedAxiosInstance;
    get report(): TypedAxiosInstance;
    get gis(): TypedAxiosInstance;
    get bi(): TypedAxiosInstance;
    get mobile(): TypedAxiosInstance;
    get im(): TypedAxiosInstance;
    get erp(): TypedAxiosInstance;
    get notification(): TypedAxiosInstance;
    get integration(): TypedAxiosInstance;
    get wms(): TypedAxiosInstance;
    get hrm(): TypedAxiosInstance;
    get crm(): TypedAxiosInstance;
    get mes(): TypedAxiosInstance;
    get pm(): TypedAxiosInstance;
    get master(): TypedAxiosInstance;
    get mail(): TypedAxiosInstance;
    get file(): TypedAxiosInstance;
    get scm(): TypedAxiosInstance;
    get migration(): TypedAxiosInstance;
    setAuthToken(token: string): void;
    clearAuthToken(): void;
    getClients(): Record<string, TypedAxiosInstance>;
}
export declare const apiClient: ApiClient;
export default apiClient;
