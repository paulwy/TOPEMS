import { QueryClient, QueryCache, MutationCache, type DefaultOptions } from '@tanstack/react-query';
import { useNotificationStore } from '../store';

const queryCache = new QueryCache({
  onError: (error) => {
    const addNotification = useNotificationStore.getState().addNotification;
    addNotification({
      title: '数据加载失败',
      message: error.message,
      type: 'error',
    });
  },
});

const mutationCache = new MutationCache({
  onError: (error) => {
    const addNotification = useNotificationStore.getState().addNotification;
    addNotification({
      title: '操作失败',
      message: error.message,
      type: 'error',
    });
  },
});

const defaultQueryOptions: DefaultOptions['queries'] = {
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

const defaultMutationOptions: DefaultOptions['mutations'] = {
  retry: 1,
};

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
});

export const QUERY_KEYS = {
  AUTH: {
    USER: ['auth', 'user'],
    PERMISSIONS: ['auth', 'permissions'],
    TOKEN: ['auth', 'token'],
  },
  HRM: {
    EMPLOYEES: ['hrm', 'employees'],
    EMPLOYEE: (id: string) => ['hrm', 'employee', id],
    DEPARTMENTS: ['hrm', 'departments'],
    DEPARTMENT: (id: string) => ['hrm', 'department', id],
    ATTENDANCE: ['hrm', 'attendance'],
    PAYROLL: ['hrm', 'payroll'],
    LEAVE: ['hrm', 'leave'],
    PERFORMANCE: ['hrm', 'performance'],
    TRAINING: ['hrm', 'training'],
    RECRUITMENT: ['hrm', 'recruitment'],
    CONTRACT: ['hrm', 'contract'],
  },
  CRM: {
    CUSTOMERS: ['crm', 'customers'],
    CUSTOMER: (id: string) => ['crm', 'customer', id],
    CONTACTS: ['crm', 'contacts'],
    CONTACT: (id: string) => ['crm', 'contact', id],
    OPPORTUNITIES: ['crm', 'opportunities'],
    OPPORTUNITY: (id: string) => ['crm', 'opportunity', id],
    INTERACTIONS: ['crm', 'interactions'],
    BILLING: ['crm', 'billing'],
  },
  ERP: {
    ASSETS: ['erp', 'assets'],
    ASSET: (id: string) => ['erp', 'asset', id],
    FINANCE: ['erp', 'finance'],
    ACCOUNTS: ['erp', 'accounts'],
    ACCOUNT: (id: string) => ['erp', 'account', id],
    VOUCHERS: ['erp', 'vouchers'],
    VOUCHER: (id: string) => ['erp', 'voucher', id],
    BUDGET: ['erp', 'budget'],
    VEHICLES: ['erp', 'vehicles'],
    DICT: ['erp', 'dict'],
  },
  PM: {
    PROJECTS: ['pm', 'projects'],
    PROJECT: (id: string) => ['pm', 'project', id],
    CONTRACTS: ['pm', 'contracts'],
    CONTRACT: (id: string) => ['pm', 'contracts', id],
    DOCUMENTS: ['pm', 'documents'],
    BUDGET: ['pm', 'budget'],
    REPORTS: ['pm', 'reports'],
    NOTIFICATIONS: ['pm', 'notifications'],
  },
  BI: {
    DASHBOARD: ['bi', 'dashboard'],
    REPORTS: ['bi', 'reports'],
    CHARTS: ['bi', 'charts'],
    DATA_SOURCES: ['bi', 'data-sources'],
  },
  AI: {
    MODELS: ['ai', 'models'],
    ANALYSIS: ['ai', 'analysis'],
    DOCUMENTS: ['ai', 'documents'],
    QA: ['ai', 'qa'],
    VECTOR: ['ai', 'vector'],
  },
  NOTIFICATION: {
    NOTIFICATIONS: ['notification', 'notifications'],
    SETTINGS: ['notification', 'settings'],
    TEMPLATES: ['notification', 'templates'],
  },
  SYSTEM: {
    USERS: ['system', 'users'],
    USER: (id: string) => ['system', 'user', id],
    ROLES: ['system', 'roles'],
    ROLE: (id: string) => ['system', 'role', id],
    PERMISSIONS: ['system', 'permissions'],
    PLUGINS: ['system', 'plugins'],
    AUDIT: ['system', 'audit'],
  },
};

export const CACHE_DURATIONS = {
  SHORT: 30 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 30 * 60 * 1000,
  VERY_LONG: 2 * 60 * 60 * 1000,
};
