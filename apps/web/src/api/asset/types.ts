export interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  specifications?: string;
  purchase_date?: string;
  purchase_amount?: number;
  location?: string;
  department?: string;
  responsible_id?: string;
  responsible_name?: string;
  status: string;
  image_url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  maintenance_type: string;
  maintenance_date: string;
  description?: string;
  cost?: number;
  operator?: string;
  parts_used?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionRecord {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  inspection_date: string;
  inspector?: string;
  inspection_items?: InspectionItem[];
  result: string;
  issues?: string;
  remarks?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionItem {
  name: string;
  standard?: string;
  result: string;
  remark?: string;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}
