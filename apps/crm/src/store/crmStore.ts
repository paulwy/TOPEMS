import { create } from 'zustand';
import type {
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerQueryParams,
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ContactQueryParams,
  Opportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  OpportunityQueryParams,
  Interaction,
  CreateInteractionRequest,
  UpdateInteractionRequest,
  InteractionQueryParams,
  BillingRecord,
  CreateBillingRequest,
  BillingQueryParams,
  CustomerScore,
  CreateCustomerScoreRequest,
  SalesForecast,
  CreateSalesForecastRequest,
  DashboardSummary,
} from '../api/crm';
import {
  customerApi,
  contactApi,
  opportunityApi,
  interactionApi,
  billingApi,
  customerScoringApi,
  salesForecastApi,
  dashboardApi,
} from '../api/crm';

export interface CrmStore {
  // ==================== State ====================
  customers: Customer[];
  customersTotal: number;
  customersPage: number;
  customersPageSize: number;

  contacts: Contact[];
  contactsTotal: number;
  contactsPage: number;
  contactsPageSize: number;

  opportunities: Opportunity[];
  opportunitiesTotal: number;
  opportunitiesPage: number;
  opportunitiesPageSize: number;

  interactions: Interaction[];
  interactionsTotal: number;
  interactionsPage: number;
  interactionsPageSize: number;

  billings: BillingRecord[];
  billingsTotal: number;
  billingsPage: number;
  billingsPageSize: number;

  customerScores: CustomerScore[];
  salesForecasts: SalesForecast[];

  dashboardSummary: DashboardSummary | null;

  loading: boolean;
  error: string | null;

  // ==================== Customer Actions ====================
  loadCustomers: (params?: CustomerQueryParams) => Promise<void>;
  loadCustomer: (id: string) => Promise<Customer | null>;
  addCustomer: (data: CreateCustomerRequest) => Promise<Customer | null>;
  updateCustomer: (id: string, data: UpdateCustomerRequest) => Promise<Customer | null>;
  removeCustomer: (id: string) => Promise<void>;
  removeCustomers: (ids: string[]) => Promise<void>;

  // ==================== Contact Actions ====================
  loadContacts: (params?: ContactQueryParams) => Promise<void>;
  loadContact: (id: string) => Promise<Contact | null>;
  addContact: (data: CreateContactRequest) => Promise<Contact | null>;
  updateContact: (id: string, data: UpdateContactRequest) => Promise<Contact | null>;
  removeContact: (id: string) => Promise<void>;
  removeContacts: (ids: string[]) => Promise<void>;

  // ==================== Opportunity Actions ====================
  loadOpportunities: (params?: OpportunityQueryParams) => Promise<void>;
  loadOpportunity: (id: string) => Promise<Opportunity | null>;
  addOpportunity: (data: CreateOpportunityRequest) => Promise<Opportunity | null>;
  updateOpportunity: (id: string, data: UpdateOpportunityRequest) => Promise<Opportunity | null>;
  removeOpportunity: (id: string) => Promise<void>;
  removeOpportunities: (ids: string[]) => Promise<void>;

  // ==================== Interaction Actions ====================
  loadInteractions: (params?: InteractionQueryParams) => Promise<void>;
  loadInteraction: (id: string) => Promise<Interaction | null>;
  addInteraction: (data: CreateInteractionRequest) => Promise<Interaction | null>;
  updateInteraction: (id: string, data: UpdateInteractionRequest) => Promise<Interaction | null>;
  removeInteraction: (id: string) => Promise<void>;
  removeInteractions: (ids: string[]) => Promise<void>;

  // ==================== Billing Actions ====================
  loadBillings: (params?: BillingQueryParams) => Promise<void>;
  loadBilling: (id: string) => Promise<BillingRecord | null>;
  addBilling: (data: CreateBillingRequest) => Promise<BillingRecord | null>;
  markBillingPaid: (id: string) => Promise<void>;
  removeBilling: (id: string) => Promise<void>;

  // ==================== Customer Scoring Actions ====================
  loadCustomerScores: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addCustomerScore: (data: CreateCustomerScoreRequest) => Promise<CustomerScore | null>;
  removeCustomerScore: (id: string) => Promise<void>;

  // ==================== Sales Forecast Actions ====================
  loadSalesForecasts: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  generateSalesForecast: (data: CreateSalesForecastRequest) => Promise<SalesForecast | null>;
  removeSalesForecast: (id: string) => Promise<void>;

  // ==================== Dashboard Actions ====================
  loadDashboardSummary: () => Promise<void>;

  // ==================== UI Actions ====================
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  customers: [] as Customer[],
  customersTotal: 0,
  customersPage: 1,
  customersPageSize: 10,

  contacts: [] as Contact[],
  contactsTotal: 0,
  contactsPage: 1,
  contactsPageSize: 10,

  opportunities: [] as Opportunity[],
  opportunitiesTotal: 0,
  opportunitiesPage: 1,
  opportunitiesPageSize: 10,

  interactions: [] as Interaction[],
  interactionsTotal: 0,
  interactionsPage: 1,
  interactionsPageSize: 10,

  billings: [] as BillingRecord[],
  billingsTotal: 0,
  billingsPage: 1,
  billingsPageSize: 10,

  customerScores: [] as CustomerScore[],
  salesForecasts: [] as SalesForecast[],

  dashboardSummary: null as DashboardSummary | null,

  loading: false,
  error: null as string | null,
};

const handleError = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
};

export const useCrmStore = create<CrmStore>((set) => ({
  ...initialState,

  // ==================== Customer Actions ====================
  loadCustomers: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await customerApi.list(params);
      set({
        customers: response.items,
        customersTotal: response.total,
        customersPage: response.page,
        customersPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载客户列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadCustomer: async (id) => {
    try {
      return await customerApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载客户详情失败') });
      return null;
    }
  },

  addCustomer: async (data) => {
    try {
      const customer = await customerApi.create(data);
      set((state) => ({
        customers: [customer, ...state.customers],
        customersTotal: state.customersTotal + 1,
      }));
      return customer;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建客户失败') });
      return null;
    }
  },

  updateCustomer: async (id, data) => {
    try {
      const customer = await customerApi.update(id, data);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? customer : c)),
      }));
      return customer;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新客户失败') });
      return null;
    }
  },

  removeCustomer: async (id) => {
    try {
      await customerApi.delete(id);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        customersTotal: Math.max(0, state.customersTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除客户失败') });
    }
  },

  removeCustomers: async (ids) => {
    try {
      await customerApi.batchDelete(ids);
      set((state) => ({
        customers: state.customers.filter((c) => !ids.includes(c.id)),
        customersTotal: Math.max(0, state.customersTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除客户失败') });
    }
  },

  // ==================== Contact Actions ====================
  loadContacts: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await contactApi.list(params);
      set({
        contacts: response.items,
        contactsTotal: response.total,
        contactsPage: response.page,
        contactsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载联系人列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadContact: async (id) => {
    try {
      return await contactApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载联系人详情失败') });
      return null;
    }
  },

  addContact: async (data) => {
    try {
      const contact = await contactApi.create(data);
      set((state) => ({
        contacts: [contact, ...state.contacts],
        contactsTotal: state.contactsTotal + 1,
      }));
      return contact;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建联系人失败') });
      return null;
    }
  },

  updateContact: async (id, data) => {
    try {
      const contact = await contactApi.update(id, data);
      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === id ? contact : c)),
      }));
      return contact;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新联系人失败') });
      return null;
    }
  },

  removeContact: async (id) => {
    try {
      await contactApi.delete(id);
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
        contactsTotal: Math.max(0, state.contactsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除联系人失败') });
    }
  },

  removeContacts: async (ids) => {
    try {
      await contactApi.batchDelete(ids);
      set((state) => ({
        contacts: state.contacts.filter((c) => !ids.includes(c.id)),
        contactsTotal: Math.max(0, state.contactsTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除联系人失败') });
    }
  },

  // ==================== Opportunity Actions ====================
  loadOpportunities: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await opportunityApi.list(params);
      set({
        opportunities: response.items,
        opportunitiesTotal: response.total,
        opportunitiesPage: response.page,
        opportunitiesPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载销售机会列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadOpportunity: async (id) => {
    try {
      return await opportunityApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载销售机会详情失败') });
      return null;
    }
  },

  addOpportunity: async (data) => {
    try {
      const opportunity = await opportunityApi.create(data);
      set((state) => ({
        opportunities: [opportunity, ...state.opportunities],
        opportunitiesTotal: state.opportunitiesTotal + 1,
      }));
      return opportunity;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建销售机会失败') });
      return null;
    }
  },

  updateOpportunity: async (id, data) => {
    try {
      const opportunity = await opportunityApi.update(id, data);
      set((state) => ({
        opportunities: state.opportunities.map((o) => (o.id === id ? opportunity : o)),
      }));
      return opportunity;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新销售机会失败') });
      return null;
    }
  },

  removeOpportunity: async (id) => {
    try {
      await opportunityApi.delete(id);
      set((state) => ({
        opportunities: state.opportunities.filter((o) => o.id !== id),
        opportunitiesTotal: Math.max(0, state.opportunitiesTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除销售机会失败') });
    }
  },

  removeOpportunities: async (ids) => {
    try {
      await opportunityApi.batchDelete(ids);
      set((state) => ({
        opportunities: state.opportunities.filter((o) => !ids.includes(o.id)),
        opportunitiesTotal: Math.max(0, state.opportunitiesTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除销售机会失败') });
    }
  },

  // ==================== Interaction Actions ====================
  loadInteractions: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await interactionApi.list(params);
      set({
        interactions: response.items,
        interactionsTotal: response.total,
        interactionsPage: response.page,
        interactionsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载互动记录失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadInteraction: async (id) => {
    try {
      return await interactionApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载互动记录详情失败') });
      return null;
    }
  },

  addInteraction: async (data) => {
    try {
      const interaction = await interactionApi.create(data);
      set((state) => ({
        interactions: [interaction, ...state.interactions],
        interactionsTotal: state.interactionsTotal + 1,
      }));
      return interaction;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建互动记录失败') });
      return null;
    }
  },

  updateInteraction: async (id, data) => {
    try {
      const interaction = await interactionApi.update(id, data);
      set((state) => ({
        interactions: state.interactions.map((i) => (i.id === id ? interaction : i)),
      }));
      return interaction;
    } catch (err: unknown) {
      set({ error: handleError(err, '更新互动记录失败') });
      return null;
    }
  },

  removeInteraction: async (id) => {
    try {
      await interactionApi.delete(id);
      set((state) => ({
        interactions: state.interactions.filter((i) => i.id !== id),
        interactionsTotal: Math.max(0, state.interactionsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除互动记录失败') });
    }
  },

  removeInteractions: async (ids) => {
    try {
      await interactionApi.batchDelete(ids);
      set((state) => ({
        interactions: state.interactions.filter((i) => !ids.includes(i.id)),
        interactionsTotal: Math.max(0, state.interactionsTotal - ids.length),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '批量删除互动记录失败') });
    }
  },

  // ==================== Billing Actions ====================
  loadBillings: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await billingApi.list(params);
      set({
        billings: response.items,
        billingsTotal: response.total,
        billingsPage: response.page,
        billingsPageSize: response.pageSize,
      });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载账单列表失败') });
    } finally {
      set({ loading: false });
    }
  },

  loadBilling: async (id) => {
    try {
      return await billingApi.get(id);
    } catch (err: unknown) {
      set({ error: handleError(err, '加载账单详情失败') });
      return null;
    }
  },

  addBilling: async (data) => {
    try {
      const billing = await billingApi.create(data);
      set((state) => ({
        billings: [billing, ...state.billings],
        billingsTotal: state.billingsTotal + 1,
      }));
      return billing;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建账单失败') });
      return null;
    }
  },

  markBillingPaid: async (id) => {
    try {
      const billing = await billingApi.markPaid(id);
      set((state) => ({
        billings: state.billings.map((b) => (b.id === id ? billing : b)),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '标记账单已支付失败') });
    }
  },

  removeBilling: async (id) => {
    try {
      await billingApi.delete(id);
      set((state) => ({
        billings: state.billings.filter((b) => b.id !== id),
        billingsTotal: Math.max(0, state.billingsTotal - 1),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除账单失败') });
    }
  },

  // ==================== Customer Scoring Actions ====================
  loadCustomerScores: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await customerScoringApi.list(params);
      set({ customerScores: response.items });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载客户评分失败') });
    } finally {
      set({ loading: false });
    }
  },

  addCustomerScore: async (data) => {
    try {
      const score = await customerScoringApi.create(data);
      set((state) => ({
        customerScores: [score, ...state.customerScores],
      }));
      return score;
    } catch (err: unknown) {
      set({ error: handleError(err, '创建客户评分失败') });
      return null;
    }
  },

  removeCustomerScore: async (id) => {
    try {
      await customerScoringApi.delete(id);
      set((state) => ({
        customerScores: state.customerScores.filter((s) => s.id !== id),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除客户评分失败') });
    }
  },

  // ==================== Sales Forecast Actions ====================
  loadSalesForecasts: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await salesForecastApi.list(params);
      set({ salesForecasts: response.items });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载销售预测失败') });
    } finally {
      set({ loading: false });
    }
  },

  generateSalesForecast: async (data) => {
    try {
      const forecast = await salesForecastApi.generate(data);
      set((state) => ({
        salesForecasts: [forecast, ...state.salesForecasts],
      }));
      return forecast;
    } catch (err: unknown) {
      set({ error: handleError(err, '生成销售预测失败') });
      return null;
    }
  },

  removeSalesForecast: async (id) => {
    try {
      await salesForecastApi.delete(id);
      set((state) => ({
        salesForecasts: state.salesForecasts.filter((f) => f.id !== id),
      }));
    } catch (err: unknown) {
      set({ error: handleError(err, '删除销售预测失败') });
    }
  },

  // ==================== Dashboard Actions ====================
  loadDashboardSummary: async () => {
    set({ loading: true, error: null });
    try {
      const summary = await dashboardApi.summary();
      set({ dashboardSummary: summary });
    } catch (err: unknown) {
      set({ error: handleError(err, '加载仪表盘数据失败') });
    } finally {
      set({ loading: false });
    }
  },

  // ==================== UI Actions ====================
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
