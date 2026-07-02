export interface ExpenseClaim {
  id: string;
  expense_number: string;
  applicant_id?: string;
  applicant_name?: string;
  department_id?: string;
  department_name?: string;
  expense_type: string;
  amount: number;
  currency?: string;
  description?: string;
  expense_date?: string;
  receipt_count?: number;
  attachments?: string[];
  status: string;
  workflow_instance_id?: string;
  current_approver?: string;
  approver_id?: string;
  approved_at?: string;
  reimbursed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id?: string;
  expense_claim_id?: string;
  category?: string;
  description?: string;
  amount: number;
  expense_date?: string;
  receipt_url?: string;
}

export interface OADashboardStats {
  pending_approvals: number;
  my_expenses: number;
  pending_expenses: number;
  announcements: number;
  meetings_today: number;
  total_employees: number;
}

export interface PaginationParams {
  page?: number;
  pagesize?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pagesize: number;
}
