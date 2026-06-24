/**
 * 员工财务扩展类型定义
 * 包含工资、社保、公积金等财务信息
 */

/**
 * 员工财务数据
 */
export interface EmployeeFinance {
  employee_id: string;
  status?: string; // 状态
  base_salary: number; // 基本工资
  position_salary?: number; // 岗位工资
  skill_salary?: number; // 技能工资
  bonus: number; // 奖金
  allowance: number; // 补贴
  social_security: number; // 社保个人部分
  social_security_base?: number; // 社保基数
  social_security_ratio?: number; // 社保比例
  housing_fund: number; // 公积金个人部分
  housing_fund_base?: number; // 公积金基数
  housing_fund_ratio?: number; // 公积金比例
  personal_income_tax: number; // 个人所得税
  net_salary: number; // 实发工资
  bank_account: string; // 银行账号
  bank_card_number?: string; // 银行卡号
  bank_name: string; // 开户银行
  bank_branch?: string; // 开户行支行
  cost_center: string; // 成本中心
  cost_center_id?: string; // 成本中心ID
  expense_account_id?: string; // 费用科目ID
  tax_id?: string; // 税务ID
  tax_level?: string; // 税率级别
  payroll_bank_account: string; // 工资卡号
  salary_payment_status: SalaryPaymentStatus; // 工资发放状态
  annual_salary: number; // 年薪
  hourly_rate: number; // 时薪
  tax_exempt_allowance: number; // 免税补贴
  social_security_company: number; // 社保公司部分
  housing_fund_company: number; // 公积金公司部分
  total_compensation: number; // 总薪酬
}

/**
 * 工资发放状态
 */
export type SalaryPaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 工资条记录
 */
export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department_name: string;
  period: string; // 工资期间，格式：YYYY-MM
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

/**
 * 社保缴纳记录
 */
export interface SocialSecurityRecord {
  id: string;
  employee_id: string;
  period: string;
  pension: number; // 养老保险
  medical: number; // 医疗保险
  unemployment: number; // 失业保险
  work_injury: number; // 工伤保险
  maternity: number; // 生育保险
  company_pension: number; // 企业年金
  total_personal: number;
  total_company: number;
}

/**
 * 公积金缴纳记录
 */
export interface HousingFundRecord {
  id: string;
  employee_id: string;
  period: string;
  personal_contribution: number; // 个人缴存
  company_contribution: number; // 公司缴存
  total: number;
}
