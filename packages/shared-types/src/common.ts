export interface AxiosInstance {
  get: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<{ data: T }>;
  post: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<{ data: T }>;
  put: <T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<{ data: T }>;
  delete: <T = unknown>(url: string, config?: Record<string, unknown>) => Promise<{ data: T }>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string;
  data: T;
  timestamp?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pageSize: number;
  total_pages: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: boolean;
  code: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: number;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
  total_pages: number;
}

export interface QueryParams extends PaginationParams {
  keyword?: string;
  status?: string | string[];
  start_date?: string;
  end_date?: string;
  company_id?: string;
  department_id?: string;
}

export interface BatchOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: {
    id: string;
    error: string;
  }[];
}