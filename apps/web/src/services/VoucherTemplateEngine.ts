/**
 * 凭证模板引擎
 * 实现根据模板自动生成凭证的逻辑
 */

import type { VoucherTemplate, VoucherTemplateEntry } from '../types/finance';
import i18n from '@/i18n';

// ============================================
// 一、类型定义
// ============================================

/**
 * 模板上下文（数据源）
 */
export interface TemplateContext {
  // 来源模块
  source_module: string;

  // 来源ID
  source_id: string;

  // 业务数据
  data: Record<string, unknown>;

  // 关联实体
  entities?: {
    company?: { id: string; code: string; name: string };
    department?: { id: string; code: string; name: string };
    project?: { id: string; code: string; name: string };
    customer?: { id: string; code: string; name: string };
    supplier?: { id: string; code: string; name: string };
    employee?: { id: string; code: string; name: string };
    bank_account?: { id: string; account_no: string; bank_name: string };
  };

  // 环境变量
  env: {
    period: string;
    voucher_date: string;
    operator_id?: string;
    operator_name?: string;
  };
}

/**
 * 生成的凭证条目
 */
export interface GeneratedEntry {
  account_id: string;
  account_code: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;

  // 辅助核算
  company_id?: string;
  department_id?: string;
  project_id?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;
  bank_account_id?: string;

  summary?: string;
}

/**
 * 生成的凭证结果
 */
export interface GeneratedVoucher {
  voucher_date: string;
  period: string;
  voucher_type: string;
  summary: string;
  entries: GeneratedEntry[];
}

// ============================================
// 二、表达式求值器
// ============================================

/**
 * 简单的表达式求值器
 * 支持基本运算、字段引用、条件判断
 */
class ExpressionEvaluator {
  private context: TemplateContext;

  constructor(context: TemplateContext) {
    this.context = context;
  }

  /**
   * 求值表达式
   */
  evaluate(expression: string): unknown {
    if (!expression) return undefined;

    // 清理表达式
    expression = expression.trim();

    // 处理字段引用 ${field.path}
    const fieldPattern = /\$\{([^}]+)\}/g;
    expression = expression.replace(fieldPattern, (_, path) => {
      const value = this.getFieldValue(path);
      if (value === null || value === undefined) return 'null';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });

    // 处理条件表达式 ${condition ? value1 : value2}
    const conditionalPattern = /\$\{([^?]+)\?([^:]+):([^}]+)\}/g;
    expression = expression.replace(conditionalPattern, (_, condition, trueValue, falseValue) => {
      const result = this.evaluateCondition(condition);
      return result ? trueValue.trim() : falseValue.trim();
    });

    // 处理算术表达式
    if (/^[\d\s+\-*/().]+$/.test(expression)) {
      try {
        return Function(`"use strict"; return (${expression})`)();
      } catch {
        return expression;
      }
    }

    // 处理字符串
    if (/^["'].*["']$/.test(expression)) {
      return expression.slice(1, -1);
    }

    // 返回原值
    return this.parseValue(expression);
  }

  /**
   * 获取字段值
   */
  private getFieldValue(path: string): unknown {
    const parts = path.split('.');
    let value: unknown = this.context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as unknown as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * 计算条件
   */
  private evaluateCondition(condition: string): boolean {
    // 替换字段引用
    condition = condition.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const value = this.getFieldValue(path);
      return typeof value === 'string' ? `"${value}"` : String(value ?? 'null');
    });

    try {
      return Function(`"use strict"; return !!(${condition})`)();
    } catch {
      return false;
    }
  }

  /**
   * 解析值
   */
  private parseValue(value: string): unknown {
    // null
    if (value === 'null' || value === 'undefined') return undefined;

    // 数字
    if (/^\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 字符串（去除引号）
    if (/^["'].*["']$/.test(value)) {
      return value.slice(1, -1);
    }

    return value;
  }
}

// ============================================
// 三、科目查找器
// ============================================

/**
 * 科目查找器接口
 */
export interface AccountFinder {
  findByCode(code: string): Promise<{ id: string; code: string; name: string } | null>;
  findByName(name: string): Promise<{ id: string; code: string; name: string } | null>;
  getAccountMapping(): Promise<Map<string, { id: string; code: string; name: string }>>;
}

// ============================================
// 四、凭证模板引擎
// ============================================

/**
 * 凭证模板引擎
 */
class VoucherTemplateEngine {
  private accountFinder: AccountFinder;
  private accountCache: Map<string, { id: string; code: string; name: string }>;

  constructor(accountFinder: AccountFinder) {
    this.accountFinder = accountFinder;
    this.accountCache = new Map();
  }

  /**
   * 根据模板生成凭证
   */
  async generate(template: VoucherTemplate, context: TemplateContext): Promise<GeneratedVoucher> {
    // 检查模板适用条件
    if (template.condition) {
      const evaluator = new ExpressionEvaluator(context);
      if (!evaluator.evaluate(template.condition)) {
        throw new Error(i18n.t('shared.voucher_template_engine.k0'));
      }
    }

    // 生成凭证分录
    const entries: GeneratedEntry[] = [];

    for (const entryRule of template.entries) {
      // 检查分录启用条件
      if (entryRule.condition) {
        const evaluator = new ExpressionEvaluator(context);
        if (!evaluator.evaluate(entryRule.condition)) {
          continue;
        }
      }

      const entry = await this.generateEntry(entryRule, context);
      if (entry.debit_amount > 0 || entry.credit_amount > 0) {
        entries.push(entry);
      }
    }

    // 生成凭证摘要
    const summary = this.generateSummary(template, context);

    return {
      voucher_date: context.env.voucher_date,
      period: context.env.period,
      voucher_type: template.type,
      summary,
      entries,
    };
  }

  /**
   * 生成单个分录
   */
  private async generateEntry(
    rule: VoucherTemplateEntry,
    context: TemplateContext
  ): Promise<GeneratedEntry> {
    const evaluator = new ExpressionEvaluator(context);

    // 获取科目信息
    let account: { id: string; code: string; name: string } | null = null;

    if (rule.account_rule_type === 'fixed' && rule.account_id) {
      account = await this.findAccount(rule.account_id);
    } else if (rule.account_rule_type === 'fixed' && rule.account_code) {
      account = await this.findAccountByCode(rule.account_code);
    } else if (rule.account_rule_type === 'dynamic' && rule.account_expression) {
      const accountCode = evaluator.evaluate(rule.account_expression);
      if (typeof accountCode === 'string' && accountCode) {
        account = await this.findAccountByCode(accountCode);
      }
    }

    if (!account) {
      throw new Error(
        `${i18n.t('shared.voucher_template_engine.k0')}${rule.account_code || rule.account_expression}`
      );
    }

    // 计算金额
    let debitAmount = 0;
    let creditAmount = 0;

    if (rule.amount_rule_type === 'fixed' && rule.fixed_amount !== undefined) {
      const amount = rule.fixed_amount;
      if (rule.direction_rule_type === 'fixed') {
        if (rule.fixed_direction === 'debit') {
          debitAmount = amount;
        } else {
          creditAmount = amount;
        }
      }
    } else if (rule.amount_rule_type === 'field' && rule.amount_field) {
      const rawAmount = evaluator.evaluate(rule.amount_field);
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount) || 0;
      if (rule.direction_rule_type === 'fixed') {
        if (rule.fixed_direction === 'debit') {
          debitAmount = amount;
        } else {
          creditAmount = amount;
        }
      }
    } else if (rule.amount_rule_type === 'expression' && rule.amount_expression) {
      const rawAmount = evaluator.evaluate(rule.amount_expression);
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(rawAmount) || 0;
      if (rule.direction_rule_type === 'expression' && rule.direction_expression) {
        const direction = evaluator.evaluate(rule.direction_expression);
        if (direction === 'debit') {
          debitAmount = amount;
        } else {
          creditAmount = amount;
        }
      }
    }

    // 获取辅助核算维度
    const dimensionValues: Record<string, string> = {};

    if (rule.dimension_rules) {
      for (const dimRule of rule.dimension_rules) {
        let value: string | undefined;

        if (dimRule.source_type === 'fixed' && dimRule.fixed_value) {
          value = dimRule.fixed_value;
        } else if (dimRule.source_type === 'field' && dimRule.field) {
          const raw = evaluator.evaluate(dimRule.field);
          value = raw !== null && raw !== undefined ? String(raw) : undefined;
        } else if (dimRule.source_type === 'expression' && dimRule.expression) {
          const raw = evaluator.evaluate(dimRule.expression);
          value = raw !== null && raw !== undefined ? String(raw) : undefined;
        }

        if (value) {
          dimensionValues[dimRule.dimension] = value;
        }
      }
    }

    // 生成摘要
    let summary = '';
    if (rule.summary_rule_type === 'fixed' && rule.fixed_summary) {
      summary = rule.fixed_summary;
    } else if (rule.summary_rule_type === 'field' && rule.summary_field) {
      const raw = evaluator.evaluate(rule.summary_field);
      summary = raw !== null && raw !== undefined ? String(raw) : '';
    } else if (rule.summary_rule_type === 'expression' && rule.summary_expression) {
      const raw = evaluator.evaluate(rule.summary_expression);
      summary = raw !== null && raw !== undefined ? String(raw) : '';
    }

    return {
      account_id: account.id,
      account_code: account.code,
      account_name: account.name,
      debit_amount: debitAmount,
      credit_amount: creditAmount,

      company_id: dimensionValues.company,
      department_id: dimensionValues.department,
      project_id: dimensionValues.project,
      customer_id: dimensionValues.customer,
      supplier_id: dimensionValues.supplier,
      employee_id: dimensionValues.employee,
      bank_account_id: dimensionValues.bank,

      summary,
    };
  }

  /**
   * 生成凭证摘要
   */
  private generateSummary(template: VoucherTemplate, context: TemplateContext): string {
    // 默认摘要格式
    const summaryTemplates: Record<string, string> = {
      payroll: i18n.t('shared.voucher_template_engine.period_1'),
      sales_invoice: i18n.t('shared.voucher_template_engine.period_2'),
      purchase_invoice: i18n.t('shared.voucher_template_engine.period_3'),
      collection: i18n.t('shared.voucher_template_engine.k4'),
      payment: i18n.t('shared.voucher_template_engine.k5'),
      depreciation: i18n.t('shared.voucher_template_engine.period_6'),
      expense: i18n.t('shared.voucher_template_engine.k7'),
      cost_allocation: i18n.t('shared.voucher_template_engine.period_8'),
    };

    const defaultTemplate = summaryTemplates[template.type] || `${template.name}`;
    const evaluator = new ExpressionEvaluator(context);

    const result = evaluator.evaluate(defaultTemplate);
    if (result === null || result === undefined) return '';
    return String(result);
  }

  /**
   * 查找科目
   */
  private async findAccount(
    accountId: string
  ): Promise<{ id: string; code: string; name: string } | null> {
    if (this.accountCache.has(accountId)) {
      return this.accountCache.get(accountId)!;
    }

    const account = await this.accountFinder.findByCode(accountId);
    if (account) {
      this.accountCache.set(accountId, account);
    }

    return account;
  }

  /**
   * 按编码查找科目
   */
  private async findAccountByCode(
    code: string
  ): Promise<{ id: string; code: string; name: string } | null> {
    if (this.accountCache.has(code)) {
      return this.accountCache.get(code)!;
    }

    const account = await this.accountFinder.findByCode(code);
    if (account) {
      this.accountCache.set(code, account);
    }

    return account;
  }

  /**
   * 验证凭证平衡
   */
  validateBalance(entries: GeneratedEntry[]): {
    balanced: boolean;
    debitTotal: number;
    creditTotal: number;
  } {
    const debitTotal = entries.reduce((sum, e) => sum + e.debit_amount, 0);
    const creditTotal = entries.reduce((sum, e) => sum + e.credit_amount, 0);

    return {
      balanced: Math.abs(debitTotal - creditTotal) < 0.01, // 允许0.01误差
      debitTotal,
      creditTotal,
    };
  }
}

// ============================================
// 四、预定义凭证模板
// ============================================

/**
 * 工资计提凭证模板
 */
const PAYROLL_ACCURAL_TEMPLATE: VoucherTemplate = {
  id: 'tpl-payroll-accrual',
  code: 'PAYROLL_ACCRUAL',
  name: i18n.t('shared.voucher_template_engine.k1'),
  type: 'payroll',
  description: i18n.t('shared.voucher_template_engine.k2'),

  entries: [
    // 借: 应付职工薪酬-工资
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '6602.01',
      amount_rule_type: 'field',
      amount_field: 'data.gross_salary',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'department',
          source_type: 'field',
          field: 'data.department_id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.envperiod_9'),
    },
    // 贷: 应交税费-个人所得税
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '2221.01',
      amount_rule_type: 'field',
      amount_field: 'data.individual_income_tax',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k10'),
    },
    // 贷: 其他应付款-社保个人
    {
      id: 'e3',
      line_no: 3,
      account_rule_type: 'fixed',
      account_code: '2241.01',
      amount_rule_type: 'expression',
      amount_expression: 'data.social_security_employee + data.housing_fund_employee',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k11'),
    },
    // 贷: 应付职工薪酬-工资（实发）
    {
      id: 'e4',
      line_no: 4,
      account_rule_type: 'fixed',
      account_code: '6602.01',
      amount_rule_type: 'field',
      amount_field: 'data.net_salary',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [
        {
          dimension: 'department',
          source_type: 'field',
          field: 'data.department_id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.envperiod_12'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 销售发票应收凭证模板
 */
const SALES_INVOICE_TEMPLATE: VoucherTemplate = {
  id: 'tpl-sales-invoice',
  code: 'SALES_INVOICE',
  name: i18n.t('shared.voucher_template_engine.k3'),
  type: 'sales_invoice',
  description: i18n.t('shared.voucher_template_engine.k4'),

  entries: [
    // 借: 应收账款
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '1122',
      amount_rule_type: 'expression',
      amount_expression: 'data.amount + data.tax_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'customer',
          source_type: 'field',
          field: 'entities.customer.id',
        },
        {
          dimension: 'project',
          source_type: 'field',
          field: 'entities.project.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k5'),
    },
    // 贷: 主营业务收入
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '6001',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [
        {
          dimension: 'project',
          source_type: 'field',
          field: 'entities.project.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k6'),
    },
    // 贷: 应交税费-销项税额
    {
      id: 'e3',
      line_no: 3,
      account_rule_type: 'fixed',
      account_code: '2221.02',
      amount_rule_type: 'field',
      amount_field: 'data.tax_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k7'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 收款凭证模板
 */
const COLLECTION_TEMPLATE: VoucherTemplate = {
  id: 'tpl-collection',
  code: 'COLLECTION',
  name: i18n.t('shared.voucher_template_engine.k8'),
  type: 'collection',
  description: i18n.t('shared.voucher_template_engine.k9'),

  entries: [
    // 借: 银行存款
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '1002',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'bank',
          source_type: 'field',
          field: 'entities.bank_account.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k10'),
    },
    // 贷: 应收账款
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '1122',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [
        {
          dimension: 'customer',
          source_type: 'field',
          field: 'entities.customer.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k13'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 采购发票应付凭证模板
 */
const PURCHASE_INVOICE_TEMPLATE: VoucherTemplate = {
  id: 'tpl-purchase-invoice',
  code: 'PURCHASE_INVOICE',
  name: i18n.t('shared.voucher_template_engine.k11'),
  type: 'purchase_invoice',
  description: i18n.t('shared.voucher_template_engine.k12'),

  entries: [
    // 借: 在途物资/库存商品
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '1405',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'project',
          source_type: 'field',
          field: 'entities.project.id',
        },
        {
          dimension: 'department',
          source_type: 'field',
          field: 'data.department_id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k13'),
    },
    // 借: 应交税费-进项税额
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '2221.01',
      amount_rule_type: 'field',
      amount_field: 'data.tax_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k14'),
    },
    // 贷: 应付账款
    {
      id: 'e3',
      line_no: 3,
      account_rule_type: 'fixed',
      account_code: '2202',
      amount_rule_type: 'expression',
      amount_expression: 'data.amount + data.tax_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [
        {
          dimension: 'supplier',
          source_type: 'field',
          field: 'entities.supplier.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k14'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 付款凭证模板
 */
const PAYMENT_TEMPLATE: VoucherTemplate = {
  id: 'tpl-payment',
  code: 'PAYMENT',
  name: i18n.t('shared.voucher_template_engine.k15'),
  type: 'payment',
  description: i18n.t('shared.voucher_template_engine.k16'),

  entries: [
    // 借: 应付账款
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '2202',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'supplier',
          source_type: 'field',
          field: 'entities.supplier.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k15'),
    },
    // 贷: 银行存款
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '1002',
      amount_rule_type: 'field',
      amount_field: 'data.amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [
        {
          dimension: 'bank',
          source_type: 'field',
          field: 'entities.bank_account.id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k17'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * 固定资产折旧凭证模板
 */
const DEPRECIATION_TEMPLATE: VoucherTemplate = {
  id: 'tpl-depreciation',
  code: 'DEPRECIATION',
  name: i18n.t('shared.voucher_template_engine.k18'),
  type: 'depreciation',
  description: i18n.t('shared.voucher_template_engine.k19'),

  entries: [
    // 借: 管理费用-折旧费
    {
      id: 'e1',
      line_no: 1,
      account_rule_type: 'fixed',
      account_code: '6602.02',
      amount_rule_type: 'field',
      amount_field: 'data.depreciation_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'debit',
      dimension_rules: [
        {
          dimension: 'department',
          source_type: 'field',
          field: 'data.department_id',
        },
      ],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.k16'),
    },
    // 贷: 累计折旧
    {
      id: 'e2',
      line_no: 2,
      account_rule_type: 'fixed',
      account_code: '1602',
      amount_rule_type: 'field',
      amount_field: 'data.depreciation_amount',
      direction_rule_type: 'fixed',
      fixed_direction: 'credit',
      dimension_rules: [{ dimension: 'project', source_type: 'field', field: 'data.asset_id' }],
      summary_rule_type: 'expression',
      summary_expression: i18n.t('shared.voucher_template_engine.dataasset_name_17'),
    },
  ],
  status: 'active',
  is_default: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================
// 五、导出
// ============================================
// 所有类型和函数已在定义时导出，此处不需要重复导出
