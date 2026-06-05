import apiClient from './client';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Company {
  id: string;
  name: string;
  short_name?: string;
  registration_number?: string;
  tax_number?: string;
  address?: string;
  contact_phone?: string;
  email?: string;
  website?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  parent_id?: string;
  company_id?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  name: string;
  gender?: string;
  birth_date?: string;
  hire_date?: string;
  department_id?: string;
  position?: string;
  email?: string;
  phone?: string;
  status: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_number: string;
  name: string;
  category?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_amount?: number;
  location?: string;
  responsible_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  serial_number?: string;
  manufacturer?: string;
  rated_power?: number;
  rated_voltage?: number;
  rated_current?: number;
  specifications?: any;
  image_url?: string;
  department?: string;
}

export interface OfficeSupply {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  price?: number;
  location?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type OfficeSupplyStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | string;

export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  facilities?: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export type MeetingRoomStatus = 'available' | 'occupied' | 'maintenance' | string;

export interface MeetingBooking {
  id: string;
  room_id: string;
  room_name: string;
  title: string;
  organizer: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | string;

export interface Booking {
  id: string;
  meeting_room_id: string;
  start_time: string;
  end_time: string;
  purpose: string;
  booked_by?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  capacity?: number;
  status: string;
  driver?: string;
  last_service?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  mileage?: number;
  fuel_type?: string;
  created_at: string;
  updated_at: string;
}

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | string;

export interface VehicleRequest {
  id: string;
  vehicle_id: string;
  vehicle_plate: string;
  requester: string;
  purpose: string;
  start_time: string;
  end_time: string;
  driver_required: boolean;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  author: string;
  published_by?: string;
  status: string;
  priority?: string;
  is_published?: boolean;
  publish_at?: string;
  expire_at?: string;
  created_at: string;
  updated_at: string;
}

export type AnnouncementPriority = 'high' | 'normal' | 'low' | string;

export interface Expense {
  id: string;
  expense_number: string;
  title?: string;
  applicant_name?: string;
  department_id?: string;
  expense_type?: string;
  category?: string;
  amount: number;
  description?: string;
  expense_date?: string;
  receipt_count?: number;
  status: string;
  approver_id?: string;
  approved_at?: string;
  reimbursed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reimbursed' | string;
export type ExpenseCategory = 'travel' | 'meal' | 'office' | 'equipment' | 'training' | 'marketing' | 'other' | string;

export interface Budget {
  id: string;
  department_id?: string;
  budget_type?: string;
  fiscal_year?: string;
  total_budget: number;
  used_amount?: number;
  remaining_amount?: number;
  usage_rate?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: string;
  invoice_number: string;
  customer_name?: string;
  supplier_name?: string;
  project_name?: string;
  category?: string;
  amount: number;
  invoice_date?: string;
  due_date?: string;
  status: string;
  received_amount?: number;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface Payable {
  id: string;
  invoice_number: string;
  supplier_name?: string;
  category?: string;
  amount: number;
  invoice_date?: string;
  due_date?: string;
  status: string;
  paid_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface AccountingSubject {
  id: string;
  code: string;
  name: string;
  category?: string;
  level: number;
  parent_code?: string;
  description?: string;
  is_cash_flow: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialVoucher {
  id: string;
  voucher_number: string;
  voucher_date: string;
  period: string;
  attachment_count?: number;
  summary?: string;
  maker_id?: string;
  maker_name?: string;
  checker_id?: string;
  checker_name?: string;
  bookkeeper_id?: string;
  bookkeeper_name?: string;
  status: string;
  total_debit: number;
  total_credit: number;
  source_system?: string;
  source_id?: string;
  project_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface VoucherItem {
  id: string;
  voucher_id: string;
  line_number: number;
  subject_code: string;
  subject_name: string;
  summary?: string;
  debit_amount: number;
  credit_amount: number;
  quantity?: number;
  unit?: string;
  price?: number;
  department_id?: string;
  project_id?: string;
  contract_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectContract {
  id: string;
  project_id: string;
  contract_no: string;
  contract_type: string;
  party_a: string;
  party_b: string;
  subject: string;
  amount: number;
  tax_amount?: number;
  total_amount: number;
  currency: string;
  signing_date: string;
  effective_date: string;
  expiration_date?: string;
  status: string;
  payment_terms?: any;
  attachment_ids?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  budget_type: string;
  fiscal_year: string;
  total_budget: number;
  allocated_amount: number;
  used_amount: number;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: string;
  receivable_id?: string;
  payable_id?: string;
  project_id: string;
  contract_id?: string;
  schedule_type: string;
  due_date: string;
  amount: number;
  status: string;
  actual_payment_date?: string;
  actual_amount?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  category?: string;
  priority?: string;
  vehicle_type?: string;
  period?: string;
}

export const companyApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Company>>> {
    const response = await apiClient.get('/api/v1/companies', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Company>> {
    const response = await apiClient.get(`/api/v1/companies/${id}`);
    return response.data;
  },

  async create(data: Partial<Company>): Promise<ApiResponse<Company>> {
    const response = await apiClient.post('/api/v1/companies', data);
    return response.data;
  },

  async update(id: string, data: Partial<Company>): Promise<ApiResponse<Company>> {
    const response = await apiClient.put(`/api/v1/companies/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/companies/${id}`);
    return response.data;
  },
};

export const departmentApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Department>>> {
    const response = await apiClient.get('/api/v1/departments', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Department>> {
    const response = await apiClient.get(`/api/v1/departments/${id}`);
    return response.data;
  },

  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    const response = await apiClient.post('/api/v1/departments', data);
    return response.data;
  },

  async update(id: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
    const response = await apiClient.put(`/api/v1/departments/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/departments/${id}`);
    return response.data;
  },
};

export const employeeApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Employee>>> {
    const response = await apiClient.get('/api/v1/employees', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Employee>> {
    const response = await apiClient.get(`/api/v1/employees/${id}`);
    return response.data;
  },

  async create(data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    const response = await apiClient.post('/api/v1/employees', data);
    return response.data;
  },

  async update(id: string, data: Partial<Employee>): Promise<ApiResponse<Employee>> {
    const response = await apiClient.put(`/api/v1/employees/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/employees/${id}`);
    return response.data;
  },
};

export const assetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Asset>>> {
    const response = await apiClient.get('/api/v1/assets', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Asset>> {
    const response = await apiClient.get(`/api/v1/assets/${id}`);
    return response.data;
  },

  async create(data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    const response = await apiClient.post('/api/v1/assets', data);
    return response.data;
  },

  async update(id: string, data: Partial<Asset>): Promise<ApiResponse<Asset>> {
    const response = await apiClient.put(`/api/v1/assets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/assets/${id}`);
    return response.data;
  },
};

export const officeSupplyApi = {
  async list(params?: PaginationParams & { category?: string }): Promise<ApiResponse<PaginatedResponse<OfficeSupply>>> {
    const response = await apiClient.get('/api/v1/office-supplies', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<OfficeSupply>> {
    const response = await apiClient.get(`/api/v1/office-supplies/${id}`);
    return response.data;
  },

  async create(data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>> {
    const response = await apiClient.post('/api/v1/office-supplies', data);
    return response.data;
  },

  async update(id: string, data: Partial<OfficeSupply>): Promise<ApiResponse<OfficeSupply>> {
    const response = await apiClient.put(`/api/v1/office-supplies/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/office-supplies/${id}`);
    return response.data;
  },
};

export const meetingRoomApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<MeetingRoom>>> {
    const response = await apiClient.get('/api/v1/meeting-rooms', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<MeetingRoom>> {
    const response = await apiClient.get(`/api/v1/meeting-rooms/${id}`);
    return response.data;
  },

  async create(data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>> {
    const response = await apiClient.post('/api/v1/meeting-rooms', data);
    return response.data;
  },

  async update(id: string, data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>> {
    const response = await apiClient.put(`/api/v1/meeting-rooms/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/meeting-rooms/${id}`);
    return response.data;
  },

  async getBookings(id: string): Promise<ApiResponse<MeetingBooking[]>> {
    const response = await apiClient.get(`/api/v1/meeting-rooms/${id}/bookings`);
    return response.data;
  },
};

export const meetingBookingApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<MeetingBooking>>> {
    const response = await apiClient.get('/api/v1/meeting-bookings', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<MeetingBooking>> {
    const response = await apiClient.get(`/api/v1/meeting-bookings/${id}`);
    return response.data;
  },

  async create(data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>> {
    const response = await apiClient.post('/api/v1/meeting-bookings', data);
    return response.data;
  },

  async update(id: string, data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>> {
    const response = await apiClient.put(`/api/v1/meeting-bookings/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/meeting-bookings/${id}`);
    return response.data;
  },
};

export const bookingApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Booking>>> {
    const response = await apiClient.get('/api/v1/bookings', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Booking>> {
    const response = await apiClient.get(`/api/v1/bookings/${id}`);
    return response.data;
  },

  async create(data: Partial<Booking>): Promise<ApiResponse<Booking>> {
    const response = await apiClient.post('/api/v1/bookings', data);
    return response.data;
  },

  async update(id: string, data: Partial<Booking>): Promise<ApiResponse<Booking>> {
    const response = await apiClient.put(`/api/v1/bookings/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/bookings/${id}`);
    return response.data;
  },
};

export const vehicleApi = {
  async list(params?: PaginationParams & { vehicle_type?: string }): Promise<ApiResponse<PaginatedResponse<Vehicle>>> {
    const response = await apiClient.get('/api/v1/vehicles', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Vehicle>> {
    const response = await apiClient.get(`/api/v1/vehicles/${id}`);
    return response.data;
  },

  async create(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    const response = await apiClient.post('/api/v1/vehicles', data);
    return response.data;
  },

  async update(id: string, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    const response = await apiClient.put(`/api/v1/vehicles/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/vehicles/${id}`);
    return response.data;
  },

  async getRequests(id: string): Promise<ApiResponse<VehicleRequest[]>> {
    const response = await apiClient.get(`/api/v1/vehicles/${id}/requests`);
    return response.data;
  },
};

export const vehicleRequestApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<VehicleRequest>>> {
    const response = await apiClient.get('/api/v1/vehicle-requests', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<VehicleRequest>> {
    const response = await apiClient.get(`/api/v1/vehicle-requests/${id}`);
    return response.data;
  },

  async create(data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> {
    const response = await apiClient.post('/api/v1/vehicle-requests', data);
    return response.data;
  },

  async update(id: string, data: Partial<VehicleRequest>): Promise<ApiResponse<VehicleRequest>> {
    const response = await apiClient.put(`/api/v1/vehicle-requests/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/vehicle-requests/${id}`);
    return response.data;
  },
};

export const announcementApi = {
  async list(params?: PaginationParams & { priority?: string }): Promise<ApiResponse<PaginatedResponse<Announcement>>> {
    const response = await apiClient.get('/api/v1/announcements', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Announcement>> {
    const response = await apiClient.get(`/api/v1/announcements/${id}`);
    return response.data;
  },

  async create(data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    const response = await apiClient.post('/api/v1/announcements', data);
    return response.data;
  },

  async update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    const response = await apiClient.put(`/api/v1/announcements/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/announcements/${id}`);
    return response.data;
  },

  async publish(id: string): Promise<ApiResponse<Announcement>> {
    const response = await apiClient.post(`/api/v1/announcements/${id}/publish`);
    return response.data;
  },

  async unpublish(id: string): Promise<ApiResponse<Announcement>> {
    const response = await apiClient.post(`/api/v1/announcements/${id}/unpublish`);
    return response.data;
  },
};

export const expenseApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Expense>>> {
    const response = await apiClient.get('/api/v1/expenses', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Expense>> {
    const response = await apiClient.get(`/api/v1/expenses/${id}`);
    return response.data;
  },

  async create(data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    const response = await apiClient.post('/api/v1/expenses', data);
    return response.data;
  },

  async update(id: string, data: Partial<Expense>): Promise<ApiResponse<Expense>> {
    const response = await apiClient.put(`/api/v1/expenses/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/expenses/${id}`);
    return response.data;
  },
};

export const budgetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Budget>>> {
    const response = await apiClient.get('/api/v1/budgets', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Budget>> {
    const response = await apiClient.get(`/api/v1/budgets/${id}`);
    return response.data;
  },

  async create(data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const response = await apiClient.post('/api/v1/budgets', data);
    return response.data;
  },

  async update(id: string, data: Partial<Budget>): Promise<ApiResponse<Budget>> {
    const response = await apiClient.put(`/api/v1/budgets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/budgets/${id}`);
    return response.data;
  },
};

export const receivableApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Receivable>>> {
    const response = await apiClient.get('/api/v1/receivables', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Receivable>> {
    const response = await apiClient.get(`/api/v1/receivables/${id}`);
    return response.data;
  },

  async create(data: Partial<Receivable>): Promise<ApiResponse<Receivable>> {
    const response = await apiClient.post('/api/v1/receivables', data);
    return response.data;
  },

  async update(id: string, data: Partial<Receivable>): Promise<ApiResponse<Receivable>> {
    const response = await apiClient.put(`/api/v1/receivables/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/receivables/${id}`);
    return response.data;
  },
};

export const payableApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Payable>>> {
    const response = await apiClient.get('/api/v1/payables', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Payable>> {
    const response = await apiClient.get(`/api/v1/payables/${id}`);
    return response.data;
  },

  async create(data: Partial<Payable>): Promise<ApiResponse<Payable>> {
    const response = await apiClient.post('/api/v1/payables', data);
    return response.data;
  },

  async update(id: string, data: Partial<Payable>): Promise<ApiResponse<Payable>> {
    const response = await apiClient.put(`/api/v1/payables/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/payables/${id}`);
    return response.data;
  },
};

export const accountingSubjectApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<AccountingSubject>>> {
    const response = await apiClient.get('/api/v1/accounting-subjects', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<AccountingSubject>> {
    const response = await apiClient.get(`/api/v1/accounting-subjects/${id}`);
    return response.data;
  },

  async create(data: Partial<AccountingSubject>): Promise<ApiResponse<AccountingSubject>> {
    const response = await apiClient.post('/api/v1/accounting-subjects', data);
    return response.data;
  },

  async update(id: string, data: Partial<AccountingSubject>): Promise<ApiResponse<AccountingSubject>> {
    const response = await apiClient.put(`/api/v1/accounting-subjects/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/accounting-subjects/${id}`);
    return response.data;
  },
};

export const voucherApi = {
  async list(params?: PaginationParams & { period?: string }): Promise<ApiResponse<PaginatedResponse<FinancialVoucher>>> {
    const response = await apiClient.get('/api/v1/vouchers', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<FinancialVoucher>> {
    const response = await apiClient.get(`/api/v1/vouchers/${id}`);
    return response.data;
  },

  async getItems(id: string): Promise<ApiResponse<VoucherItem[]>> {
    const response = await apiClient.get(`/api/v1/vouchers/${id}/items`);
    return response.data;
  },

  async create(data: any): Promise<ApiResponse<FinancialVoucher>> {
    const response = await apiClient.post('/api/v1/vouchers', data);
    return response.data;
  },

  async update(id: string, data: Partial<FinancialVoucher>): Promise<ApiResponse<FinancialVoucher>> {
    const response = await apiClient.put(`/api/v1/vouchers/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/vouchers/${id}`);
    return response.data;
  },
};

export const contractApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<ProjectContract>>> {
    const response = await apiClient.get('/api/v1/contracts', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<ProjectContract>> {
    const response = await apiClient.get(`/api/v1/contracts/${id}`);
    return response.data;
  },

  async create(data: Partial<ProjectContract>): Promise<ApiResponse<ProjectContract>> {
    const response = await apiClient.post('/api/v1/contracts', data);
    return response.data;
  },

  async update(id: string, data: Partial<ProjectContract>): Promise<ApiResponse<ProjectContract>> {
    const response = await apiClient.put(`/api/v1/contracts/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/contracts/${id}`);
    return response.data;
  },
};

export const projectBudgetApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<ProjectBudget>>> {
    const response = await apiClient.get('/api/v1/project-budgets', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<ProjectBudget>> {
    const response = await apiClient.get(`/api/v1/project-budgets/${id}`);
    return response.data;
  },

  async create(data: Partial<ProjectBudget>): Promise<ApiResponse<ProjectBudget>> {
    const response = await apiClient.post('/api/v1/project-budgets', data);
    return response.data;
  },

  async update(id: string, data: Partial<ProjectBudget>): Promise<ApiResponse<ProjectBudget>> {
    const response = await apiClient.put(`/api/v1/project-budgets/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/project-budgets/${id}`);
    return response.data;
  },
};

export const paymentScheduleApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<PaymentSchedule>>> {
    const response = await apiClient.get('/api/v1/payment-schedules', { params });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<PaymentSchedule>> {
    const response = await apiClient.get(`/api/v1/payment-schedules/${id}`);
    return response.data;
  },

  async create(data: Partial<PaymentSchedule>): Promise<ApiResponse<PaymentSchedule>> {
    const response = await apiClient.post('/api/v1/payment-schedules', data);
    return response.data;
  },

  async update(id: string, data: Partial<PaymentSchedule>): Promise<ApiResponse<PaymentSchedule>> {
    const response = await apiClient.put(`/api/v1/payment-schedules/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    const response = await apiClient.delete(`/api/v1/payment-schedules/${id}`);
    return response.data;
  },
};

export const erpApi = {
  async health(): Promise<ApiResponse<string>> {
    const response = await apiClient.get('/health');
    return response.data;
  },
};
