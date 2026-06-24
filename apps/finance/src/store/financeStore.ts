import { create } from 'zustand';
import type { PaginatedResponse } from '@topems/shared-types';
import {
  accountApi,
  voucherApi,
  receivablePayableApi,
  reportApi,
  budgetApi,
  counterpartyApi,
} from '../api/finance';
import type {
  Account,
  Voucher,
  VoucherQueryParams,
  CollectionRecord,
  PaymentRecord,
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
  Budget,
  Customer,
  Supplier,
} from '../api/finance';

interface FinanceState {
  // 通用
  loading: boolean;
  error: string | null;

  // 科目
  accounts: Account[];
  accountsTotal: number;
  accountsPage: number;
  accountsPageSize: number;

  // 凭证
  vouchers: Voucher[];
  vouchersTotal: number;
  vouchersPage: number;
  vouchersPageSize: number;

  // 收付款
  collections: CollectionRecord[];
  payments: PaymentRecord[];

  // 财务报表
  balanceSheet: BalanceSheet | null;
  incomeStatement: IncomeStatement | null;
  cashFlowStatement: CashFlowStatement | null;

  // 预算
  budgets: Budget[];
  budgetsTotal: number;

  // 往来单位
  customers: Customer[];
  suppliers: Supplier[];

  // 操作
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // 科目
  loadAccounts: (params?: { page?: number; pageSize?: number; keyword?: string }) => Promise<void>;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  removeAccount: (id: string) => void;

  // 凭证
  loadVouchers: (params?: VoucherQueryParams & { pageSize?: number }) => Promise<void>;
  addVoucher: (voucher: Voucher) => void;
  updateVoucher: (voucher: Voucher) => void;
  removeVoucher: (id: string) => void;

  // 收付款
  loadCollections: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  loadPayments: (params?: { page?: number; pageSize?: number }) => Promise<void>;

  // 报表
  loadBalanceSheet: (params: ReportQueryParams) => Promise<void>;
  loadIncomeStatement: (params: ReportQueryParams) => Promise<void>;
  loadCashFlowStatement: (params: ReportQueryParams) => Promise<void>;

  // 预算
  loadBudgets: (params?: { page?: number; pageSize?: number; period?: string }) => Promise<void>;

  // 往来单位
  loadCustomers: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  loadSuppliers: (params?: { page?: number; pageSize?: number }) => Promise<void>;
}

const initialState = {
  loading: false,
  error: null as string | null,
  accounts: [] as Account[],
  accountsTotal: 0,
  accountsPage: 1,
  accountsPageSize: 10,
  vouchers: [] as Voucher[],
  vouchersTotal: 0,
  vouchersPage: 1,
  vouchersPageSize: 10,
  collections: [] as CollectionRecord[],
  payments: [] as PaymentRecord[],
  balanceSheet: null as BalanceSheet | null,
  incomeStatement: null as IncomeStatement | null,
  cashFlowStatement: null as CashFlowStatement | null,
  budgets: [] as Budget[],
  budgetsTotal: 0,
  customers: [] as Customer[],
  suppliers: [] as Supplier[],
};

export const useFinanceStore = create<FinanceState>((set) => ({
  ...initialState,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),

  // 科目
  loadAccounts: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<Account> = await accountApi.list({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 10,
        keyword: params?.keyword,
      });
      set({
        accounts: response.items,
        accountsTotal: response.total,
        accountsPage: response.page,
        accountsPageSize: response.pageSize,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载科目列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  addAccount: (account) =>
    set((state) => ({
      accounts: [account, ...state.accounts],
      accountsTotal: state.accountsTotal + 1,
    })),

  updateAccount: (account) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === account.id ? account : a)),
    })),

  removeAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
      accountsTotal: Math.max(0, state.accountsTotal - 1),
    })),

  // 凭证
  loadVouchers: async (params) => {
    set({ loading: true, error: null });
    try {
      const { pageSize: _ignored, ...rest } = params ?? {};
      void _ignored;
      const response: PaginatedResponse<Voucher> = await voucherApi.list({
        page: rest.page ?? 1,
        page_size: rest.page_size ?? 10,
        ...rest,
      });
      set({
        vouchers: response.items,
        vouchersTotal: response.total,
        vouchersPage: response.page,
        vouchersPageSize: response.pageSize,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载凭证列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  addVoucher: (voucher) =>
    set((state) => ({
      vouchers: [voucher, ...state.vouchers],
      vouchersTotal: state.vouchersTotal + 1,
    })),

  updateVoucher: (voucher) =>
    set((state) => ({
      vouchers: state.vouchers.map((v) => (v.id === voucher.id ? voucher : v)),
    })),

  removeVoucher: (id) =>
    set((state) => ({
      vouchers: state.vouchers.filter((v) => v.id !== id),
      vouchersTotal: Math.max(0, state.vouchersTotal - 1),
    })),

  // 收付款
  loadCollections: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<CollectionRecord> = await receivablePayableApi.listCollections({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      });
      set({ collections: response.items });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载收款记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadPayments: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<PaymentRecord> = await receivablePayableApi.listPayments({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      });
      set({ payments: response.items });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载付款记录失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 报表
  loadBalanceSheet: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await reportApi.getBalanceSheet(params);
      set({ balanceSheet: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载资产负债表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadIncomeStatement: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await reportApi.getIncomeStatement(params);
      set({ incomeStatement: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载利润表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadCashFlowStatement: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await reportApi.getCashFlowStatement(params);
      set({ cashFlowStatement: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载现金流量表失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 预算
  loadBudgets: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<Budget> = await budgetApi.list({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 10,
        period: params?.period,
      });
      set({
        budgets: response.items,
        budgetsTotal: response.total,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载预算列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  // 往来单位
  loadCustomers: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<Customer> = await counterpartyApi.listCustomers({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      });
      set({ customers: response.items });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载客户列表失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadSuppliers: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<Supplier> = await counterpartyApi.listSuppliers({
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      });
      set({ suppliers: response.items });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载供应商列表失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
