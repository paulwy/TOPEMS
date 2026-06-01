export type ContactType = 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY';

export interface AddressbookEntry {
  contact_type: ContactType;
  id: string;
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

export interface DepartmentNode {
  id: string;
  name: string;
  code?: string;
  children: DepartmentNode[];
}

export interface AddressbookQueryParams {
  type_?: ContactType;
  department_id?: string;
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
  fields?: string;
}

export interface AddressbookSearchParams {
  type?: ContactType;
  search?: string;
  limit?: number;
  fields?: string;
}

export interface ExportParams {
  type?: ContactType;
  format?: 'csv' | 'xlsx';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
