/**
 * 项目财务扩展类型定义
 * 包含项目成本、挣值、ROI等财务指标
 */

/**
 * 项目财务数据
 */
export interface ProjectFinance {
  project_id: string;
  actual_cost: number; // 实际成本
  cost_variance: number; // 成本差异
  cost_variance_rate: number; // 成本差异率
  cost_budget_ratio: number; // 成本预算比
  committed_cost: number; // 已承诺成本
  forecast_cost: number; // 预测成本
  revenue: number; // 收入
  earned_value: number; // 挣值
  profit: number; // 利润
  profit_margin: number; // 利润率
  investment_amount: number; // 投资金额
  roi: number; // 投资回报率
  payment_status: PaymentStatus; // 付款状态
  invoice_status: InvoiceStatus; // 发票状态
  tax_amount: number; // 税额
  cost_loaded_progress: number; // 成本加载进度
  schedule_variance: number; // 进度差异
  cost_performance_index: number; // 成本绩效指数
  schedule_performance_index: number; // 进度绩效指数
}

/**
 * 付款状态
 */
export type PaymentStatus = "pending" | "partial" | "completed";

/**
 * 发票状态
 */
export type InvoiceStatus = "none" | "issued" | "partial" | "completed";

/**
 * 项目预算项
 */
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

/**
 * 项目结算项
 */
export interface ProjectSettlementItem {
  id: string;
  settlement_id: string;
  item_code: string;
  item_name: string;
  budget_amount: number;
  actual_amount: number;
  variance_amount: number;
}
