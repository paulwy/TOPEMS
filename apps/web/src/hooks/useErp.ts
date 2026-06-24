import { useCallback, useState, useMemo } from 'react';
import {
  assetApi,
  expenseApi,
  budgetApi,
  receivableApi,
  payableApi,
  accountingSubjectApi,
  voucherApi,
  financeReportApi,
  officeSupplyApi,
  meetingRoomApi,
  meetingBookingApi,
  vehicleApi,
  vehicleRequestApi,
  announcementApi,
  type Asset,
  type Expense,
  type Budget,
  type Receivable,
  type Payable,
  type AccountingSubject,
  type FinancialVoucher,
  type OfficeSupply,
  type MeetingRoom,
  type MeetingBooking,
  type Vehicle,
  type VehicleRequest,
  type Announcement,
} from '@/api/erp';
import { useAppStore } from '../store';

export interface UseErpResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  fetch: (params?: Record<string, any>) => Promise<T[]>;
  get: (id: string) => Promise<T | null>;
  create: (item: Partial<T>) => Promise<T | null>;
  update: (id: string, item: Partial<T>) => Promise<T | null>;
  delete: (id: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  refresh: () => void;
}

function useErpBase<T extends { id?: string }>(
  api: {
    list: (params?: any) => Promise<{ success: boolean; data?: { items: T[]; total: number } }>;
    get: (id: string) => Promise<{ success: boolean; data?: T }>;
    create: (data: Partial<T>) => Promise<{ success: boolean; data?: T }>;
    update: (id: string, data: Partial<T>) => Promise<{ success: boolean; data?: T }>;
    delete: (id: string) => Promise<{ success: boolean }>;
  },
  initialData: T[] = []
): UseErpResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [total, setTotal] = useState(0);
  const addNotification = useAppStore((state) => state.addNotification);

  const handleError = useCallback(
    (err: any, defaultMessage: string) => {
      const message = err?.response?.data?.message || err?.message || defaultMessage;
      setError(message);
      addNotification({ title: '错误', message, type: 'error' });
      return Promise.reject(err);
    },
    [addNotification]
  );

  const handleSuccess = useCallback(
    (message: string) => {
      addNotification({ title: '成功', message, type: 'success' });
    },
    [addNotification]
  );

  const fetch = useCallback(
    async (params: Record<string, any> = {}) => {
      setLoading(true);
      try {
        const response = await api.list({ page, pageSize, ...params });
        if (response.success && response.data) {
          setData(response.data.items || []);
          setTotal(response.data.total || 0);
        }
        setError(null);
        return response.data?.items || [];
      } catch (err) {
        return handleError(err, '加载数据失败');
      } finally {
        setLoading(false);
      }
    },
    [api, page, pageSize, handleError]
  );

  const get = useCallback(
    async (id: string): Promise<T | null> => {
      setLoading(true);
      try {
        const response = await api.get(id);
        if (response.success && response.data) {
          setError(null);
          return response.data;
        }
        return null;
      } catch (err) {
        handleError(err, '获取数据失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [api, handleError]
  );

  const create = useCallback(
    async (item: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const response = await api.create(item);
        if (response.success && response.data) {
          setData((prev) => [...prev, response.data!]);
          setError(null);
          handleSuccess('创建成功');
          return response.data;
        }
        return null;
      } catch (err) {
        handleError(err, '创建失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [api, handleError, handleSuccess]
  );

  const update = useCallback(
    async (id: string, item: Partial<T>): Promise<T | null> => {
      setLoading(true);
      try {
        const response = await api.update(id, item);
        if (response.success && response.data) {
          setData((prev) => prev.map((d) => (d.id === id ? response.data! : d)));
          setError(null);
          handleSuccess('更新成功');
          return response.data;
        }
        return null;
      } catch (err) {
        handleError(err, '更新失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [api, handleError, handleSuccess]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const response = await api.delete(id);
        if (response.success) {
          setData((prev) => prev.filter((d) => d.id !== id));
          setTotal((prev) => Math.max(0, prev - 1));
          setError(null);
          handleSuccess('删除成功');
        }
      } catch (err) {
        handleError(err, '删除失败');
      } finally {
        setLoading(false);
      }
    },
    [api, handleError, handleSuccess]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      setLoading(true);
      try {
        await Promise.all(ids.map((id) => api.delete(id)));
        setData((prev) => prev.filter((d) => !ids.includes(d.id!)));
        setTotal((prev) => Math.max(0, prev - ids.length));
        setError(null);
        handleSuccess(`已删除 ${ids.length} 条记录`);
      } catch (err) {
        handleError(err, '批量删除失败');
      } finally {
        setLoading(false);
      }
    },
    [api, handleError, handleSuccess]
  );

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize);
    setPageState(1);
  }, []);

  const refresh = useCallback(() => {
    fetch();
  }, [fetch]);

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      total,
      setPage,
      setPageSize,
    }),
    [page, pageSize, total, setPage, setPageSize]
  );

  return {
    data,
    loading,
    error,
    fetch,
    get,
    create,
    update,
    delete: deleteItem,
    bulkDelete,
    pagination,
    refresh,
  };
}

export function useAssets() {
  return useErpBase<Asset>(assetApi);
}

export function useExpenses() {
  return useErpBase<Expense>(expenseApi);
}

export function useBudgets() {
  return useErpBase<Budget>(budgetApi);
}

export function useReceivables() {
  return useErpBase<Receivable>(receivableApi);
}

export function usePayables() {
  return useErpBase<Payable>(payableApi);
}

export function useAccountingSubjects() {
  return useErpBase<AccountingSubject>(accountingSubjectApi);
}

export function useVouchers() {
  return useErpBase<FinancialVoucher>(voucherApi as any);
}

export function useOfficeSupplies() {
  return useErpBase<OfficeSupply>(officeSupplyApi);
}

export function useMeetingRooms() {
  return useErpBase<MeetingRoom>(meetingRoomApi);
}

export function useMeetingBookings() {
  return useErpBase<MeetingBooking>(meetingBookingApi);
}

export function useVehicles() {
  return useErpBase<Vehicle>(vehicleApi);
}

export function useVehicleRequests() {
  return useErpBase<VehicleRequest>(vehicleRequestApi);
}

export function useAnnouncements() {
  return useErpBase<Announcement>(announcementApi);
}

export function useFinanceReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addNotification = useAppStore((state) => state.addNotification);

  const handleError = useCallback(
    (err: any, defaultMessage: string) => {
      const message = err?.response?.data?.message || err?.message || defaultMessage;
      setError(message);
      addNotification({ title: '错误', message, type: 'error' });
      return Promise.reject(err);
    },
    [addNotification]
  );

  const getBalanceSheet = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.balanceSheet(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取资产负债表失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getIncomeStatement = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.incomeStatement(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取利润表失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getCashFlowStatement = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.cashFlowStatement(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取现金流量表失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getBusinessOverview = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.businessOverview(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取经营概览失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getProjectSummary = useCallback(
    async (params?: { project_id?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.projectSummary(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取项目财务汇总失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getMonthlyTrend = useCallback(async () => {
    setLoading(true);
    try {
      const response = await financeReportApi.monthlyTrend();
      setError(null);
      return response.data;
    } catch (err) {
      handleError(err, '获取月度趋势失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const getDepartmentSummary = useCallback(
    async (params?: { department_id?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.departmentSummary(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取部门财务汇总失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getAgingAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await financeReportApi.agingAnalysis();
      setError(null);
      return response.data;
    } catch (err) {
      handleError(err, '获取账龄分析失败');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const getCashFlowAnalysis = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.cashFlowAnalysis(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取现金流分析失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getExpenseAnalysis = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.expenseAnalysis(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取费用分析失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getProfitAnalysis = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.profitAnalysis(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取利润分析失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  const getFinancialOverview = useCallback(
    async (params?: { period?: string }) => {
      setLoading(true);
      try {
        const response = await financeReportApi.financialOverview(params);
        setError(null);
        return response.data;
      } catch (err) {
        handleError(err, '获取财务概览失败');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleError]
  );

  return {
    loading,
    error,
    getBalanceSheet,
    getIncomeStatement,
    getCashFlowStatement,
    getBusinessOverview,
    getProjectSummary,
    getMonthlyTrend,
    getDepartmentSummary,
    getAgingAnalysis,
    getCashFlowAnalysis,
    getExpenseAnalysis,
    getProfitAnalysis,
    getFinancialOverview,
  };
}
