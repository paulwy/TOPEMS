/**
 * HRM财务整合API和类型定义
 * 包含工资核算、社保公积金等与财务相关的接口
 */

import { apiClient, downloadBlob } from "./client";
import config from "../config/runtime";

// ============================================
// 一、类型定义
// ============================================

/**
 * 员工财务信息
 */
export interface EmployeeFinanceInfo {
  employee_id: string;

  // 银行账户信息
  bank_card_number: string;
  bank_name: string;
  bank_branch?: string;

  // 薪资信息
  base_salary: number;
  position_salary: number;
  skill_salary: number;

  // 社保公积金
  social_security_base: number;
  social_security_ratio: number;
  housing_fund_base: number;
  housing_fund_ratio: number;

  // 税务信息
  tax_id?: string;
  tax_level?: number;

  // 费用归属
  cost_center_id: string;
  expense_account_id: string;

  // 状态
  status: "active" | "inactive";

  created_at: string;
  updated_at: string;
}

/**
 * 工资单记录
 */
export interface PayrollRecord {
  id: string;
  period: string; // YYYY-MM
  company_id: string;
  department_id: string;
  department_name?: string;
  employee_id: string;
  employee_name?: string;
  employee_number?: string;

  // 应发项目
  base_salary: number;
  position_salary: number;
  skill_salary: number;
  overtime_pay: number;
  bonus: number;
  allowances: number;
  other_additions: number;

  // 扣款项目
  absence_deduction: number;
  late_deduction: number;
  personal_insurance: number;
  other_deductions: number;

  // 社保公积金(个人部分)
  social_security_employee: number;
  housing_fund_employee: number;

  // 税务
  individual_income_tax: number;
  taxable_income: number;

  // 汇总
  gross_salary: number; // 应发工资
  total_deductions: number; // 扣款合计
  net_salary: number; // 实发工资

  // 社保公积金(公司部分)
  social_security_company: number;
  housing_fund_company: number;
  total_company_cost: number; // 公司总成本

  // 状态
  status: "draft" | "calculating" | "approved" | "paid" | "cancelled";

  // 关联凭证
  voucher_id?: string;
  voucher_no?: string;

  // 审计
  created_at: string;
  updated_at: string;
  approved_at?: string;
  paid_at?: string;
}

/**
 * 社保公积金配置
 */
export interface SocialSecurityConfig {
  id: string;

  // 社保配置
  pension_ratio_employee: number; // 养老保险(个人)
  pension_ratio_company: number; // 养老保险(公司)
  medical_ratio_employee: number; // 医疗保险(个人)
  medical_ratio_company: number; // 医疗保险(公司)
  unemployment_ratio_employee: number; // 失业保险(个人)
  unemployment_ratio_company: number; // 失业保险(公司)
  maternity_ratio_company: number; // 生育保险(公司)
  work_injury_ratio_company: number; // 工伤保险(公司)

  // 公积金配置
  housing_fund_ratio_employee: number;
  housing_fund_ratio_company: number;

  // 上下限
  min_base: number;
  max_base: number;

  // 生效日期
  effective_date: string;
  status: "active" | "inactive";
}

/**
 * 考勤汇总
 */
export interface AttendanceSummary {
  employee_id: string;
  period: string;

  // 出勤
  normal_days: number;
  overtime_hours: number;
  overtime_days: number;

  // 缺勤
  absent_days: number;
  sick_leave_days: number;
  personal_leave_days: number;

  // 迟到早退
  late_times: number;
  late_hours: number;
  early_leave_times: number;

  // 加班
  weekday_overtime_hours: number;
  weekend_overtime_hours: number;
  holiday_overtime_hours: number;

  // 工作时长
  total_work_hours: number;

  created_at: string;
}

/**
 * 工资发放记录
 */
export interface PayrollPaymentRecord {
  id: string;
  period: string;
  company_id: string;
  bank_code: string;
  bank_name: string;

  // 汇总
  total_count: number;
  total_amount: number;
  success_count: number;
  success_amount: number;
  fail_count: number;
  fail_amount: number;

  // 状态
  status: "pending" | "processing" | "completed" | "failed";

  // 银行返回
  bank_batch_no?: string;
  bank_return_at?: string;

  // 凭证
  voucher_id?: string;

  created_at: string;
  completed_at?: string;
}

// ============================================
// 二、API接口
// ============================================

export const hrmFinanceApi = {
  // -------- 员工财务信息 --------

  /**
   * 获取员工财务信息
   */
  getEmployeeFinanceInfo: (employeeId: string) =>
    apiClient.hrm.get(`/api/hrm/employees/${employeeId}/finance`),

  /**
   * 更新员工财务信息
   */
  updateEmployeeFinanceInfo: (
    employeeId: string,
    data: Partial<EmployeeFinanceInfo>,
  ) => apiClient.hrm.put(`/api/hrm/employees/${employeeId}/finance`, data),

  /**
   * 批量更新员工财务信息
   */
  batchUpdateEmployeeFinance: (
    requests: {
      employee_id: string;
      data: Partial<EmployeeFinanceInfo>;
    }[],
  ) =>
    apiClient.hrm.post("/api/hrm/employees/finance/batch-update", {
      requests,
    }),

  // -------- 工资核算 --------

  /**
   * 计算工资
   */
  calculatePayroll: (params: {
    company_id: string;
    period: string;
    department_ids?: string[];
    employee_ids?: string[];
  }) => apiClient.hrm.post("/api/hrm/payroll/calculate", params),

  /**
   * 获取工资单列表
   */
  getPayrollRecords: (params?: {
    period?: string;
    company_id?: string;
    department_id?: string;
    employee_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.hrm.get("/api/hrm/payroll/records", { params }),

  /**
   * 获取工资单详情
   */
  getPayrollRecord: (recordId: string) =>
    apiClient.hrm.get(`/api/hrm/payroll/records/${recordId}`),

  /**
   * 审核工资单
   */
  approvePayroll: (recordIds: string[]) =>
    apiClient.hrm.post("/api/hrm/payroll/approve", {
      record_ids: recordIds,
    }),

  /**
   * 批量审核工资单
   */
  batchApprovePayroll: (recordIds: string[]) =>
    apiClient.hrm.post("/api/hrm/payroll/batch-approve", {
      record_ids: recordIds,
    }),

  /**
   * 生成工资凭证
   */
  generatePayrollVoucher: (params: {
    period: string;
    company_id: string;
    record_ids?: string[];
    template_id?: string;
  }) => apiClient.hrm.post("/api/hrm/payroll/generate-voucher", params),

  /**
   * 批量生成工资凭证
   */
  batchGeneratePayrollVouchers: (params: {
    periods: string[];
    company_id: string;
  }) => apiClient.hrm.post("/api/hrm/payroll/batch-generate-vouchers", params),

  /**
   * 导出银行报盘文件
   */
  exportBankFile: async (params: {
    period: string;
    company_id: string;
    bank_code: string;
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.hrm as any).defaults?.baseURL || config.services.hrm;
    return downloadBlob(baseURL, "/api/hrm/payroll/export-bank-file", {
      params,
    });
  },

  /**
   * 导出工资条
   */
  exportPayrollSlips: async (params: {
    period: string;
    company_id: string;
    format?: "pdf" | "excel";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.hrm as any).defaults?.baseURL || config.services.hrm;
    return downloadBlob(baseURL, "/api/hrm/payroll/export-slips", {
      params,
    });
  },

  /**
   * 更新发放状态
   */
  updatePaymentStatus: (
    recordIds: string[],
    status: string,
    bankBatchNo?: string,
  ) =>
    apiClient.hrm.put("/api/hrm/payroll/payment-status", {
      record_ids: recordIds,
      status,
      bank_batch_no: bankBatchNo,
    }),

  // -------- 社保公积金 --------

  /**
   * 获取社保配置列表
   */
  getSocialSecurityConfigs: (params?: {
    company_id?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.hrm.get("/api/hrm/social-security/configs", { params }),

  /**
   * 获取社保配置
   */
  getSocialSecurityConfig: (configId: string) =>
    apiClient.hrm.get(`/api/hrm/social-security/configs/${configId}`),

  /**
   * 创建社保配置
   */
  createSocialSecurityConfig: (data: Partial<SocialSecurityConfig>) =>
    apiClient.hrm.post("/api/hrm/social-security/configs", data),

  /**
   * 更新社保配置
   */
  updateSocialSecurityConfig: (
    configId: string,
    data: Partial<SocialSecurityConfig>,
  ) => apiClient.hrm.put(`/api/hrm/social-security/configs/${configId}`, data),

  /**
   * 删除社保配置
   */
  deleteSocialSecurityConfig: (configId: string) =>
    apiClient.hrm.delete(`/api/hrm/social-security/configs/${configId}`),

  /**
   * 计算社保公积金
   */
  calculateSocialSecurity: (params: {
    base: number;
    employee_ids?: string[];
  }) => apiClient.hrm.post("/api/hrm/social-security/calculate", params),

  // -------- 考勤汇总 --------

  /**
   * 获取考勤汇总
   */
  getAttendanceSummary: (params: {
    period: string;
    employee_ids?: string[];
    department_id?: string;
  }) => apiClient.hrm.get("/api/hrm/attendance/summary", { params }),

  // -------- 工资发放记录 --------

  /**
   * 获取工资发放记录
   */
  getPaymentRecords: (params?: {
    period?: string;
    company_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.hrm.get("/api/hrm/payroll/payment-records", { params }),

  /**
   * 创建工资发放批次
   */
  createPaymentBatch: (data: {
    period: string;
    company_id: string;
    bank_code: string;
    record_ids: string[];
  }) => apiClient.hrm.post("/api/hrm/payroll/payment-records", data),

  // -------- 报表 --------

  /**
   * 获取工资汇总报表
   */
  getPayrollSummaryReport: (params: {
    start_period: string;
    end_period: string;
    company_id?: string;
    department_id?: string;
  }) => apiClient.hrm.get("/api/hrm/payroll/reports/summary", { params }),

  /**
   * 获取部门工资对比报表
   */
  getDepartmentPayrollComparison: (params: {
    period: string;
    department_ids?: string[];
  }) =>
    apiClient.hrm.get("/api/hrm/payroll/reports/department-comparison", {
      params,
    }),

  // -------- 导出 --------

  /**
   * 导出工资单
   */
  exportPayrollRecords: async (params: {
    company_id?: string;
    period?: string;
    department_id?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.hrm as any).defaults?.baseURL || config.services.hrm;
    return downloadBlob(baseURL, "/api/hrm/payroll/export-records", {
      params,
    });
  },

  /**
   * 导出社保公积金明细
   */
  exportSocialSecurityDetails: async (params: {
    company_id?: string;
    period?: string;
    format: "csv" | "xlsx";
  }): Promise<Blob> => {
    const baseURL =
      (apiClient.hrm as any).defaults?.baseURL || config.services.hrm;
    return downloadBlob(baseURL, "/api/hrm/social-security/export-details", {
      params,
    });
  },
};

export default hrmFinanceApi;
