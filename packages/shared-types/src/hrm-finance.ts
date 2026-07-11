export type SalaryPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface EmployeeFinance {
  employee_id: string;
  status?: string;
  base_salary: number;
  position_salary?: number;
  skill_salary?: number;
  bonus: number;
  allowance: number;
  social_security: number;
  social_security_base?: number;
  social_security_ratio?: number;
  housing_fund: number;
  housing_fund_base?: number;
  housing_fund_ratio?: number;
  personal_income_tax: number;
  net_salary: number;
  bank_account: string;
  bank_card_number?: string;
  bank_name: string;
  bank_branch?: string;
  cost_center: string;
  cost_center_id?: string;
  expense_account_id?: string;
  tax_id?: string;
  taxlevel?: string;
  payroll_bank_account: string;
  salary_payment_status: SalaryPaymentStatus;
  annual_salary: number;
  hourly_rate: number;
  tax_exempt_allowance: number;
  social_security_company: number;
  housing_fund_company: number;
  total_compensation: number;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  period: string;
  base_salary: number;
  bonus: number;
  allowance: number;
  social_security: number;
  housing_fund: number;
  personal_income_tax: number;
  other_deductions: number;
  net_salary: number;
  payment_date: string;
  payment_status: SalaryPaymentStatus;
}

export interface SocialSecurityRecord {
  id: string;
  employee_id: string;
  period: string;
  pension: number;
  medical: number;
  unemployment: number;
  work_injury: number;
  maternity: number;
  company_pension: number;
  total_personal: number;
  total_company: number;
}

export interface HousingFundRecord {
  id: string;
  employee_id: string;
  period: string;
  personal_contribution: number;
  company_contribution: number;
  total: number;
}

export type PaymentStatus = 'pending' | 'partial' | 'completed';

export type InvoiceStatusType = 'none' | 'issued' | 'partial' | 'completed';

export interface ProjectFinance {
  project_id: string;
  actual_cost: number;
  cost_variance: number;
  cost_variance_rate: number;
  cost_budget_ratio: number;
  committed_cost: number;
  forecast_cost: number;
  revenue: number;
  earned_value: number;
  profit: number;
  profit_margin: number;
  investment_amount: number;
  roi: number;
  payment_status: PaymentStatus;
  invoice_status: InvoiceStatusType;
  tax_amount: number;
  cost_loaded_progress: number;
  schedule_variance: number;
  cost_performance_index: number;
  schedule_performance_index: number;
}

export interface ProjectBudgetItem {
  id: string;
  project_id: string;
  item_code: string;
  item_name: string;
  category: string;
  budget_amount: number;
  allocated_amount: number;
  spent_amount: number;
  variance_amount: number;
  variance_percent: number;
}

export interface ProjectSettlementItem {
  id: string;
  settlement_id: string;
  item_code: string;
  item_name: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
}