export interface AddressbookEntry {
  id: string;
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  name: string;
  code?: string;
  position?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  department_code?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AddressbookDetail extends AddressbookEntry {
  hire_date?: string;
}

export interface AddressbookQueryParams {
  page?: number;
  pagesize?: number;
  type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  department_id?: string;
  status?: string;
  search?: string;
  fields?: string;
}

export interface AddressbookSearchParams {
  limit?: number;
  contact_type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  search?: string;
  fields?: string;
}

export interface ExportParams {
  contact_type?: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
  format: string;
}

export interface ContactDetailParams {
  contact_type: 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';
}

export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  children: DepartmentNode[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}
