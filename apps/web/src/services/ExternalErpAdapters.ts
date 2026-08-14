/**
 * 外部ERP系统适配器
 * 支持金蝶、用友、SAP等主流ERP系统的数据同步
 */

import type { AxiosInstance } from 'axios';
import axios from 'axios';
import type { CreateVoucherRequest } from '../types/finance';
import i18n from '@/i18n';

// ============================================
// 一、类型定义
// ============================================

/**
 * 外部ERP类型
 */
export type ExternalErpType =
  | 'kingdee_k3' // 金蝶K3
  | 'kingdee_cloud' // 金蝶云星空
  | 'kingdee_eas' // 金蝶EAS
  | 'yonyou_u8' // 用友U8
  | 'yonyou_nc' // 用友NC
  | 'sap_s4' // SAP S/4HANA
  | '浪潮GS' // 浪潮GS
  | 'custom'; // 自定义

/**
 * 适配器配置
 */
export interface AdapterConfig {
  type: ExternalErpType;
  name: string;
  endpoint: string;
  api_key?: string;
  username?: string;
  password?: string;
  client_id?: string;
  client_secret?: string;
  timeout?: number;
  retry_times?: number;
  retry_delay?: number;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { id: string; error: string }[];
  duration: number;
}

/**
 * 通用适配器接口
 */
export interface ErpAdapter {
  /** 连接测试 */
  testConnection(): Promise<boolean>;

  /** 认证 */
  authenticate(): Promise<string>;

  /** 获取科目列表 */
  getAccounts(params?: { page?: number; pageSize?: number }): Promise<{
    items: Record<string, unknown>[];
    total: number;
  }>;

  /** 获取客户列表 */
  getCustomers(params?: { page?: number; pageSize?: number }): Promise<{
    items: Record<string, unknown>[];
    total: number;
  }>;

  /** 获取供应商列表 */
  getSuppliers(params?: { page?: number; pageSize?: number }): Promise<{
    items: Record<string, unknown>[];
    total: number;
  }>;

  /** 获取凭证列表 */
  getVouchers(params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }>;

  /** 创建凭证 */
  createVoucher(voucher: CreateVoucherRequest): Promise<string>;

  /** 批量创建凭证 */
  batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<SyncResult>;
}

// ============================================
// 二、基类适配器
// ============================================

/**
 * 基础适配器类
 */
abstract class BaseAdapter implements ErpAdapter {
  protected config: AdapterConfig;
  protected httpClient: AxiosInstance;
  protected token: string | null = null;

  constructor(config: AdapterConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.endpoint,
      timeout: config.timeout || 30000,
    });
  }

  abstract testConnection(): Promise<boolean>;
  abstract authenticate(): Promise<string>;
  abstract getAccounts(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }>;
  abstract getCustomers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }>;
  abstract getSuppliers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }>;
  abstract getVouchers(params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }>;
  abstract createVoucher(voucher: CreateVoucherRequest): Promise<string>;
  abstract batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<SyncResult>;

  /**
   * 带重试的请求
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.retry_times || 3
  ): Promise<T> {
    let lastError: Error | null = null;
    const retryDelay = this.config.retry_delay || 1000;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 判断是否可重试
        if (!this.isRetryable(error) || i === maxRetries) {
          throw lastError;
        }

        // 指数退避
        const delay = retryDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否可重试
   */
  protected isRetryable(error: unknown): boolean {
    const err = error as { code?: string; response?: { status?: number } };
    if (err.code === 'ECONNABORTED' || err.code === 'ENOTFOUND') {
      return true;
    }
    if (err.response?.status && err.response.status >= 500) {
      return true;
    }
    if (err.response?.status === 429) {
      return true;
    }
    return false;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// 三、金蝶K3 Cloud适配器
// ============================================

export class KingdeeAdapter extends BaseAdapter {
  /**
   * 连接测试
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        await this.authenticate();
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 认证
   */
  async authenticate(): Promise<string> {
    if (this.token) return this.token;

    const response = await this.httpClient.post('/api/v1/core/iam/auth/login', {
      username: this.config.username,
      password: this.config.password,
    });

    this.token = response.data.access_token;
    return this.token as string;
  }

  /**
   * 获取会计科目
   */
  async getAccounts(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/api/v1/bd/account', {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.List || [],
      total: response.data.TotalCount || 0,
    };
  }

  /**
   * 获取客户
   */
  async getCustomers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/api/v1/crm/customers', {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.List || [],
      total: response.data.TotalCount || 0,
    };
  }

  /**
   * 获取供应商
   */
  async getSuppliers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/api/v1/ap/suppliers', {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.List || [],
      total: response.data.TotalCount || 0,
    };
  }

  /**
   * 获取凭证
   */
  async getVouchers(params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/api/v1/gl/vouchers', {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          date_begin: params?.start_date,
          date_end: params?.end_date,
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.List || [],
      total: response.data.TotalCount || 0,
    };
  }

  /**
   * 创建凭证
   */
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    await this.authenticate();

    const kingdeeVoucher = this.transformToKingdeeFormat(voucher);

    const response = await this.withRetry(() =>
      this.httpClient.post('/api/v1/gl/vouchers', kingdeeVoucher, {
        headers: { Authorization: `Bearer ${this.token}` },
      })
    );

    return response.data.FVoucherId;
  }

  /**
   * 批量创建凭证
   */
  async batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      total: vouchers.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    // 分批处理
    const batchSize = 10;
    for (let i = 0; i < vouchers.length; i += batchSize) {
      const batch = vouchers.slice(i, i + batchSize);

      try {
        await this.withRetry(() =>
          this.httpClient.post(
            '/api/v1/gl/vouchers/batch',
            { vouchers: batch.map((v) => this.transformToKingdeeFormat(v)) },
            { headers: { Authorization: `Bearer ${this.token}` } }
          )
        );
        result.created += batch.length;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        result.failed += batch.length;
        result.errors.push({
          id: `batch-${i}`,
          error: msg || i18n.t('shared.external_erp_adapters.k1'),
        });
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 转换为金蝶格式
   */
  private transformToKingdeeFormat(voucher: CreateVoucherRequest): Record<string, unknown> {
    return {
      FDate: voucher.voucher_date,
      FPeriod: voucher.period,
      FExplanation: voucher.summary,
      FEntity: voucher.entries.map((entry, index) => ({
        FSeq: index + 1,
        FAccountID: entry.account_id,
        FDebitAmountFor: entry.debit_amount || 0,
        FCreditAmountFor: entry.credit_amount || 0,
        FExplanation: entry.summary,
        FDepartmentID: entry.department_id,
        FProfitCenterID: entry.project_id,
        FCustomerID: entry.customer_id,
        FSupplierID: entry.supplier_id,
      })),
    };
  }
}

// ============================================
// 四、用友U8适配器
// ============================================

export class YonyouAdapter extends BaseAdapter {
  private session: string = '';

  /**
   * 连接测试
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        await this.authenticate();
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 认证
   */
  async authenticate(): Promise<string> {
    if (this.session) return this.session;

    const response = await this.httpClient.post('/u8api/login', {
      account: this.config.username,
      password: this.config.password,
    });

    this.session = response.data.session_id || '';
    return this.session;
  }

  /**
   * 获取会计科目
   */
  async getAccounts(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.post(
        '/u8api/account/query',
        {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
        { headers: { Authorization: this.session } }
      )
    );

    return {
      items: response.data.account_list || [],
      total: response.data.total_count || 0,
    };
  }

  /**
   * 获取客户
   */
  async getCustomers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.post(
        '/u8api/customer/query',
        {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
        { headers: { Authorization: this.session } }
      )
    );

    return {
      items: response.data.customer_list || [],
      total: response.data.total_count || 0,
    };
  }

  /**
   * 获取供应商
   */
  async getSuppliers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.post(
        '/u8api/supplier/query',
        {
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
        { headers: { Authorization: this.session } }
      )
    );

    return {
      items: response.data.supplier_list || [],
      total: response.data.total_count || 0,
    };
  }

  /**
   * 获取凭证
   */
  async getVouchers(params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.post(
        '/u8api/voucher/query',
        {
          date_begin: params?.start_date,
          date_end: params?.end_date,
          page: params?.page || 1,
          pagesize: params?.pageSize || 100,
        },
        { headers: { Authorization: this.session } }
      )
    );

    return {
      items: response.data.voucher_list || [],
      total: response.data.total_count || 0,
    };
  }

  /**
   * 创建凭证
   */
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    await this.authenticate();

    const yonyouVoucher = this.transformToYonyouFormat(voucher);

    const response = await this.withRetry(() =>
      this.httpClient.post('/u8api/voucher/add', yonyouVoucher, {
        headers: { Authorization: this.session },
      })
    );

    return response.data.voucher_id;
  }

  /**
   * 批量创建凭证
   */
  async batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      total: vouchers.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    for (const voucher of vouchers) {
      try {
        await this.createVoucher(voucher);
        result.created++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        result.failed++;
        result.errors.push({
          id: voucher.entries[0]?.account_id || 'unknown',
          error: msg || i18n.t('shared.external_erp_adapters.k2'),
        });
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 转换为用友格式
   */
  private transformToYonyouFormat(voucher: CreateVoucherRequest): Record<string, unknown> {
    return {
      vouch_type: i18n.t('shared.external_erp_adapters.k3'),
      date: voucher.voucher_date,
      period: voucher.period,
      explanation: voucher.summary,
      entry_list: voucher.entries.map((entry, index) => ({
        line_no: index + 1,
        acc_num: entry.account_id,
        debit: entry.debit_amount || 0,
        credit: entry.credit_amount || 0,
        explanation: entry.summary,
        dept_num: entry.department_id,
        person_name: entry.employee_id,
        project_num: entry.project_id,
      })),
    };
  }
}

// ============================================
// 五、SAP S/4HANA适配器
// ============================================

export class SapAdapter extends BaseAdapter {
  /**
   * 连接测试
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.withRetry(async () => {
        await this.authenticate();
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 认证
   */
  async authenticate(): Promise<string> {
    if (this.token) return this.token;

    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

    this.token = `Basic ${auth}`;
    return this.token;
  }

  /**
   * 获取会计科目
   */
  async getAccounts(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/sap/opu/odata/sap/API_GLACCOUNTHierarchy', {
        headers: { Authorization: this.token },
        params: {
          $select: 'GLAccount,GLAccountHierarchyName,GLAccountName',
          $skip: ((params?.page || 1) - 1) * (params?.pageSize || 100),
          $top: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.d.results || [],
      total: response.data.d.__count || 0,
    };
  }

  /**
   * 获取客户
   */
  async getCustomers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER', {
        headers: { Authorization: this.token },
        params: {
          $filter: 'Customer',
          $skip: ((params?.page || 1) - 1) * (params?.pageSize || 100),
          $top: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.d.results || [],
      total: response.data.d.__count || 0,
    };
  }

  /**
   * 获取供应商
   */
  async getSuppliers(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const response = await this.withRetry(() =>
      this.httpClient.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER', {
        headers: { Authorization: this.token },
        params: {
          $filter: 'Supplier',
          $skip: ((params?.page || 1) - 1) * (params?.pageSize || 100),
          $top: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.d.results || [],
      total: response.data.d.__count || 0,
    };
  }

  /**
   * 获取凭证
   */
  async getVouchers(params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: Record<string, unknown>[]; total: number }> {
    await this.authenticate();

    const filter = params?.start_date
      ? `PostingDate ge datetime'${params.start_date}' and PostingDate le datetime'${params.end_date}'`
      : '';

    const response = await this.withRetry(() =>
      this.httpClient.get('/sap/opu/odata/sap/API_JOURNALENTRY', {
        headers: { Authorization: this.token },
        params: {
          $filter: filter,
          $skip: ((params?.page || 1) - 1) * (params?.pageSize || 100),
          $top: params?.pageSize || 100,
        },
      })
    );

    return {
      items: response.data.d.results || [],
      total: response.data.d.__count || 0,
    };
  }

  /**
   * 创建凭证 (通过BAPI)
   */
  async createVoucher(voucher: CreateVoucherRequest): Promise<string> {
    await this.authenticate();

    const bapiParams = this.transformToSapFormat(voucher);

    const response = await this.withRetry(() =>
      this.httpClient.post('/sap/bc/rest/ygl/bapi_acc_document_post', bapiParams, {
        headers: { Authorization: this.token },
      })
    );

    // 检查错误
    const errors = response.data.RETURN?.filter((r: { TYPE: string }) => r.TYPE === 'E');
    if (errors && errors.length > 0) {
      throw new Error(errors.map((e: { MESSAGE: string }) => e.MESSAGE).join('; '));
    }

    // 提交事务
    await this.httpClient.post(
      '/sap/bc/rest/ygl/bapi_transaction_commit',
      {},
      { headers: { Authorization: this.token } }
    );

    return response.data.AC_DOC_NO;
  }

  /**
   * 批量创建凭证
   */
  async batchCreateVouchers(vouchers: CreateVoucherRequest[]): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      total: vouchers.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    for (const voucher of vouchers) {
      try {
        await this.createVoucher(voucher);
        result.created++;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        result.failed++;
        result.errors.push({
          id: voucher.entries[0]?.account_id || 'unknown',
          error: msg || i18n.t('shared.external_erp_adapters.k4'),
        });
      }
    }

    result.success = result.failed === 0;
    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * 转换为SAP格式 (BAPI参数)
   */
  private transformToSapFormat(voucher: CreateVoucherRequest): Record<string, unknown> {
    const lines = voucher.entries
      .flatMap((entry, index) => [
        {
          ITEMNO_ACC: String(index * 10 + 1),
          GL_ACCOUNT: entry.account_id,
          COSTCENTER: entry.department_id,
          PROFIT_CTR: entry.project_id,
          VALUE_DATE: voucher.voucher_date,
          ITEM_TEXT: entry.summary,
        },
        {
          ITEMNO_ACC: String(index * 10 + 2),
          GL_ACCOUNT: entry.account_id,
          AMT_DOCCUR: entry.credit_amount ? -entry.credit_amount : 0,
        },
      ])
      .filter((line: { GL_ACCOUNT?: string }) => line.GL_ACCOUNT);

    return {
      DOCUMENTHEADER: {
        DOC_TYPE: 'SA',
        DOC_DATE: voucher.voucher_date,
        PSTNG_DATE: voucher.voucher_date,
        FISCAL_YEAR: voucher.voucher_date.substring(0, 4),
        PERIOD: voucher.voucher_date.substring(5, 7),
        HEADER_TXT: voucher.summary,
        USERNAME: this.config.username,
      },
      ACCOUNTGL: lines,
      CURRENCYAMOUNT: lines.map((line: { ITEMNO_ACC: string; AMT_DOCCUR?: number }) => ({
        ITEMNO_ACC: line.ITEMNO_ACC,
        CURRENCY: 'CNY',
        AMT_DOCCUR: line.AMT_DOCCUR || 0,
      })),
    };
  }
}

// ============================================
// 六、工厂函数
// ============================================

/**
 * 创建适配器实例
 */
export function createAdapter(config: AdapterConfig): ErpAdapter {
  switch (config.type) {
    case 'kingdee_k3':
    case 'kingdee_cloud':
    case 'kingdee_eas':
      return new KingdeeAdapter(config);
    case 'yonyou_u8':
    case 'yonyou_nc':
      return new YonyouAdapter(config);
    case 'sap_s4':
      return new SapAdapter(config);
    default:
      throw new Error(`${i18n.t('services.external_erp_adapters.erp_1')} ${config.type}`);
  }
}

// ============================================
// 七、导出
// ============================================
// 所有类型和函数已在定义时导出，此处不需要重复导出
