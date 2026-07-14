import { QueryClient, QueryCache, MutationCache, type DefaultOptions } from '@tanstack/react-query';

let queryCache: QueryCache;
let mutationCache: MutationCache;

try {
  const { useNotificationStore } = require('../store');
  
  queryCache = new QueryCache({
    onError: (error) => {
      try {
        const addNotification = useNotificationStore.getState().addNotification;
        addNotification({
          title: '数据加载失败',
          message: error.message,
          type: 'error',
        });
      } catch {
        console.error('Query error:', error);
      }
    },
  });

  mutationCache = new MutationCache({
    onError: (error) => {
      try {
        const addNotification = useNotificationStore.getState().addNotification;
        addNotification({
          title: '操作失败',
          message: error.message,
          type: 'error',
        });
      } catch {
        console.error('Mutation error:', error);
      }
    },
  });
} catch {
  queryCache = new QueryCache();
  mutationCache = new MutationCache();
}

const defaultQueryOptions: DefaultOptions['queries'] = {
  retry: 2,
  retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  networkMode: 'online',
};

const defaultMutationOptions: DefaultOptions['mutations'] = {
  retry: 1,
  onSuccess: () => {
    try {
      const addNotification = require('../store').useNotificationStore.getState().addNotification;
      addNotification({
        title: '操作成功',
        message: '数据已更新',
        type: 'success',
      });
    } catch {
      // ignore
    }
  },
};

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: defaultQueryOptions,
    mutations: defaultMutationOptions,
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
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
  PDM: {
    STATS: ['pdm', 'stats'],
    PROCESSES: ['pdm', 'processes'],
    PROCESS: (id: string) => ['pdm', 'process', id],
    STEPS: ['pdm', 'steps'],
    STEP: (id: string) => ['pdm', 'step', id],
    FORMULAS: ['pdm', 'formulas'],
    FORMULA: (id: string) => ['pdm', 'formula', id],
    BATCHES: ['pdm', 'batches'],
    BATCH: (id: string) => ['pdm', 'batch', id],
    PRODUCTS: ['pdm', 'products'],
    PRODUCT: (id: string) => ['pdm', 'product', id],
    PRODUCT_CONFIGS: ['pdm', 'product-configs'],
    PRODUCT_CONFIG: (id: string) => ['pdm', 'product-config', id],
    VERSIONS: ['pdm', 'versions'],
    VERSION: (id: string) => ['pdm', 'version', id],
    PROJECTS: ['pdm', 'projects'],
    PROJECT: (id: string) => ['pdm', 'project', id],
    PROJECT_MEMBERS: (projectId: string) => ['pdm', 'project', projectId, 'members'],
    PROJECT_PHASES: (projectId: string) => ['pdm', 'project', projectId, 'phases'],
    DOCUMENTS: ['pdm', 'documents'],
    DOCUMENT: (id: string) => ['pdm', 'document', id],
    DOCUMENT_VERSIONS: (documentId: string) => ['pdm', 'document', documentId, 'versions'],
    MATERIALS: ['pdm', 'materials'],
    MATERIAL: (id: string) => ['pdm', 'material', id],
    BOM_VERSIONS: ['pdm', 'bom-versions'],
    BOM_VERSION: (id: string) => ['pdm', 'bom-version', id],
    BOM_ITEMS: ['pdm', 'bom-items'],
    BOM_ITEM: (id: string) => ['pdm', 'bom-item', id],
    CHANGE_ORDERS: ['pdm', 'change-orders'],
    CHANGE_ORDER: (id: string) => ['pdm', 'change-order', id],
  },
  SYSTEM: {
    USERS: ['system', 'users'],
    USER: (id: string) => ['system', 'user', id],
    ROLES: ['system', 'roles'],
    ROLE: (id: string) => ['system', 'role', id],
    PERMISSIONS: ['system', 'permissions'],
    PLUGINS: ['system', 'plugins'],
    AUDIT: ['system', 'audit'],
    DICT_TYPES: ['system', 'dict-types'],
    DICT_ITEMS: (typeId: string) => ['system', 'dict-items', typeId],
  },
  MES: {
    WORK_ORDERS: ['mes', 'work-orders'],
    WORK_ORDER: (id: string) => ['mes', 'work-order', id],
    PRODUCTION_ORDERS: ['mes', 'production-orders'],
    PRODUCTION_ORDER: (id: string) => ['mes', 'production-order', id],
    EQUIPMENT: ['mes', 'equipment'],
    EQUIPMENT_DETAIL: (id: string) => ['mes', 'equipment', id],
    WORK_STATIONS: ['mes', 'work-stations'],
    WORK_STATION: (id: string) => ['mes', 'work-station', id],
    TEAMS: ['mes', 'teams'],
    TEAM: (id: string) => ['mes', 'team', id],
    MATERIALS: ['mes', 'materials'],
    MATERIAL: (id: string) => ['mes', 'material', id],
    PROCESS_ROUTES: ['mes', 'process-routes'],
    PROCESS_ROUTE: (id: string) => ['mes', 'process-route', id],
    WIP: ['mes', 'wip'],
    QUALITY_INSPECTION: ['mes', 'quality-inspection'],
    PRODUCTION_RECORDS: ['mes', 'production-records'],
  },
  WMS: {
    INVENTORY: ['wms', 'inventory'],
    INVENTORY_ITEM: (id: string) => ['wms', 'inventory', id],
    WAREHOUSES: ['wms', 'warehouses'],
    WAREHOUSE: (id: string) => ['wms', 'warehouse', id],
    LOCATIONS: ['wms', 'locations'],
    LOCATION: (id: string) => ['wms', 'location', id],
    INBOUND_ORDERS: ['wms', 'inbound-orders'],
    INBOUND_ORDER: (id: string) => ['wms', 'inbound-order', id],
    OUTBOUND_ORDERS: ['wms', 'outbound-orders'],
    OUTBOUND_ORDER: (id: string) => ['wms', 'outbound-order', id],
    TRANSFER_ORDERS: ['wms', 'transfer-orders'],
    TRANSFER_ORDER: (id: string) => ['wms', 'transfer-order', id],
    STOCK_TAKES: ['wms', 'stock-takes'],
    STOCK_TAKE: (id: string) => ['wms', 'stock-take', id],
    SUPPLIERS: ['wms', 'suppliers'],
    SUPPLIER: (id: string) => ['wms', 'supplier', id],
    SERIAL_NUMBERS: ['wms', 'serial-numbers'],
    BATCHES: ['wms', 'batches'],
  },
  QMS: {
    INSPECTIONS: ['qms', 'inspections'],
    INSPECTION: (id: string) => ['qms', 'inspection', id],
    NONCONFORMANCES: ['qms', 'nonconformances'],
    NONCONFORMANCE: (id: string) => ['qms', 'nonconformance', id],
    STANDARDS: ['qms', 'standards'],
    STANDARD: (id: string) => ['qms', 'standard', id],
    AUDITS: ['qms', 'audits'],
    AUDIT: (id: string) => ['qms', 'audit', id],
    SPC: ['qms', 'spc'],
    FMEA: ['qms', 'fmea'],
    EIGHT_D: ['qms', 'eight-d'],
    APQP: ['qms', 'apqp'],
    QUALITY_COST: ['qms', 'quality-cost'],
  },
  RD: {
    STATISTICS: ['rd', 'statistics'],
    PROJECTS: ['rd', 'projects'],
    PROJECT: (id: string) => ['rd', 'project', id],
    EXPERIMENTS: ['rd', 'experiments'],
    EXPERIMENT: (id: string) => ['rd', 'experiment', id],
    FORMULAS: ['rd', 'formulas'],
    FORMULA: (id: string) => ['rd', 'formula', id],
    TEST_CASES: ['rd', 'test-cases'],
    BUILDS: ['rd', 'builds'],
    RELEASES: ['rd', 'releases'],
    DOCS: ['rd', 'docs'],
    REVIEWS: ['rd', 'reviews'],
  },
  SCM: {
    OVERVIEW: ['scm', 'overview'],
    FULL_LINK_STATS: ['scm', 'full-link-stats'],
    MRP_PLANS: ['scm', 'mrp-plans'],
    INCOMING_INSPECTIONS: ['scm', 'incoming-inspections'],
    INVENTORY_TURNOVER: ['scm', 'inventory-turnover'],
    PRICE_COMPARISONS: ['scm', 'price-comparisons'],
    PURCHASE_ORDERS: ['scm', 'purchase-orders'],
    SUPPLIERS: ['scm', 'suppliers'],
    CONTRACTS: ['scm', 'contracts'],
  },
  SRM: {
    STATISTICS: ['srm', 'statistics'],
    SUPPLIERS: ['srm', 'suppliers'],
    SUPPLIER: (id: string) => ['srm', 'supplier', id],
    ORDERS: ['srm', 'orders'],
    ORDER: (id: string) => ['srm', 'order', id],
    CONTRACTS: ['srm', 'contracts'],
    CONTRACT: (id: string) => ['srm', 'contract', id],
    EVALUATIONS: ['srm', 'evaluations'],
    BIDDING: ['srm', 'bidding'],
    QUOTATIONS: ['srm', 'quotations'],
  },
};

export const CACHE_DURATIONS = {
  SHORT: 30 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 30 * 60 * 1000,
  VERY_LONG: 2 * 60 * 60 * 1000,
};
