/**
 * CRM (Customer Relationship Management) API Client
 * 客户关系管理 API 客户端
 */
import type { ApiResponse, PaginationParams, PaginatedResponse } from "./client";
/**
 * 客户
 */
export interface Customer {
    id: string;
    name: string;
    code?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateCustomerRequest {
    name: string;
    code?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}
export interface UpdateCustomerRequest {
    name?: string;
    code?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    status?: string;
    notes?: string;
}
/**
 * 联系人
 */
export interface Contact {
    id: string;
    customer_id?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    position?: string;
    status: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateContactRequest {
    customer_id?: string;
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    position?: string;
    notes?: string;
}
export interface UpdateContactRequest {
    customer_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    position?: string;
    status?: string;
    notes?: string;
}
export interface ContactQueryParams extends PaginationParams {
    customer_id?: string;
}
/**
 * 商机
 */
export interface Opportunity {
    id: string;
    name: string;
    customer_id?: string;
    value?: number;
    stage: string;
    probability?: number;
    close_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}
export interface CreateOpportunityRequest {
    name: string;
    customer_id?: string;
    value?: number;
    probability?: number;
    close_date?: string;
    notes?: string;
}
export interface UpdateOpportunityRequest {
    name?: string;
    customer_id?: string;
    value?: number;
    stage?: string;
    probability?: number;
    close_date?: string;
    notes?: string;
}
export interface OpportunityQueryParams extends PaginationParams {
    stage?: string;
    customer_id?: string;
}
/**
 * 交互记录
 */
export interface Interaction {
    id: string;
    customer_id?: string;
    contact_id?: string;
    type: string;
    subject?: string;
    content?: string;
    scheduled_at?: string;
    completed_at?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface CreateInteractionRequest {
    customer_id?: string;
    contact_id?: string;
    type: string;
    subject?: string;
    content?: string;
    scheduled_at?: string;
    notes?: string;
}
export interface UpdateInteractionRequest {
    customer_id?: string;
    contact_id?: string;
    type?: string;
    subject?: string;
    content?: string;
    scheduled_at?: string;
    completed_at?: string;
    status?: string;
}
export interface InteractionQueryParams extends PaginationParams {
    customer_id?: string;
    contact_id?: string;
}
declare const customerApi: {
    /**
     * 获取客户列表
     */
    list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<Customer>>>;
    /**
     * 创建客户
     */
    create: (data: CreateCustomerRequest) => Promise<ApiResponse<Customer>>;
    /**
     * 获取客户详情
     */
    get: (id: string) => Promise<ApiResponse<Customer>>;
    /**
     * 更新客户
     */
    update: (id: string, data: UpdateCustomerRequest) => Promise<ApiResponse<Customer>>;
    /**
     * 删除客户
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 批量删除客户
     */
    batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
};
declare const contactApi: {
    /**
     * 获取联系人列表
     */
    list: (params?: ContactQueryParams) => Promise<ApiResponse<PaginatedResponse<Contact>>>;
    /**
     * 创建联系人
     */
    create: (data: CreateContactRequest) => Promise<ApiResponse<Contact>>;
    /**
     * 获取联系人详情
     */
    get: (id: string) => Promise<ApiResponse<Contact>>;
    /**
     * 更新联系人
     */
    update: (id: string, data: UpdateContactRequest) => Promise<ApiResponse<Contact>>;
    /**
     * 删除联系人
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 批量删除联系人
     */
    batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
};
declare const opportunityApi: {
    /**
     * 获取商机列表
     */
    list: (params?: OpportunityQueryParams) => Promise<ApiResponse<PaginatedResponse<Opportunity>>>;
    /**
     * 创建商机
     */
    create: (data: CreateOpportunityRequest) => Promise<ApiResponse<Opportunity>>;
    /**
     * 获取商机详情
     */
    get: (id: string) => Promise<ApiResponse<Opportunity>>;
    /**
     * 更新商机
     */
    update: (id: string, data: UpdateOpportunityRequest) => Promise<ApiResponse<Opportunity>>;
    /**
     * 删除商机
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 批量删除商机
     */
    batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
};
declare const interactionApi: {
    /**
     * 获取交互记录列表
     */
    list: (params?: InteractionQueryParams) => Promise<ApiResponse<PaginatedResponse<Interaction>>>;
    /**
     * 创建交互记录
     */
    create: (data: CreateInteractionRequest) => Promise<ApiResponse<Interaction>>;
    /**
     * 获取交互记录详情
     */
    get: (id: string) => Promise<ApiResponse<Interaction>>;
    /**
     * 更新交互记录
     */
    update: (id: string, data: UpdateInteractionRequest) => Promise<ApiResponse<Interaction>>;
    /**
     * 删除交互记录
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 批量删除交互记录
     */
    batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
};
export interface CustomerScore {
    id: string;
    customer_id: string;
    customer_name: string;
    score: number;
    score_level: string;
    scoring_date: string;
    factors: ScoreFactor[];
    trend: "up" | "down" | "stable";
    last_score?: number;
    created_at: string;
    updated_at: string;
}
export interface ScoreFactor {
    name: string;
    weight: number;
    score: number;
    max_score: number;
}
export interface CreateCustomerScoreRequest {
    customer_id: string;
    score?: number;
    score_level?: string;
}
export interface CustomerScoringQueryParams extends PaginationParams {
    customer_id?: string;
    score_level?: string;
}
declare const customerScoringApi: {
    /**
     * 获取客户评分列表
     */
    list: (params?: CustomerScoringQueryParams) => Promise<ApiResponse<PaginatedResponse<CustomerScore>>>;
    /**
     * 获取客户评分详情
     */
    get: (id: string) => Promise<ApiResponse<CustomerScore>>;
    /**
     * 创建客户评分
     */
    create: (data: CreateCustomerScoreRequest) => Promise<ApiResponse<CustomerScore>>;
    /**
     * 更新客户评分
     */
    update: (id: string, data: Partial<CreateCustomerScoreRequest>) => Promise<ApiResponse<CustomerScore>>;
    /**
     * 删除客户评分
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 批量计算客户评分
     */
    calculateBatch: (customerIds: string[]) => Promise<ApiResponse<CustomerScore[]>>;
};
export interface SalesForecast {
    id: string;
    period_type: "monthly" | "quarterly" | "yearly";
    period: string;
    predicted_amount: number;
    actual_amount?: number;
    accuracy?: number;
    trend: "up" | "down" | "stable";
    confidence_level: number;
    factors: ForecastFactor[];
    status: string;
    created_at: string;
    updated_at: string;
}
export interface ForecastFactor {
    name: string;
    impact: number;
    description?: string;
}
export interface CreateSalesForecastRequest {
    period_type: "monthly" | "quarterly" | "yearly";
    period: string;
}
export interface SalesForecastQueryParams extends PaginationParams {
    period_type?: string;
    status?: string;
}
declare const salesForecastApi: {
    /**
     * 获取销售预测列表
     */
    list: (params?: SalesForecastQueryParams) => Promise<ApiResponse<PaginatedResponse<SalesForecast>>>;
    /**
     * 获取销售预测详情
     */
    get: (id: string) => Promise<ApiResponse<SalesForecast>>;
    /**
     * 创建销售预测
     */
    create: (data: CreateSalesForecastRequest) => Promise<ApiResponse<SalesForecast>>;
    /**
     * 更新销售预测
     */
    update: (id: string, data: Partial<SalesForecast>) => Promise<ApiResponse<SalesForecast>>;
    /**
     * 删除销售预测
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 生成预测
     */
    generate: (data: CreateSalesForecastRequest) => Promise<ApiResponse<SalesForecast>>;
};
export interface BillingRecord {
    id: string;
    customer_id: string;
    customer_name: string;
    invoice_no: string;
    amount: number;
    currency: string;
    status: "pending" | "paid" | "overdue" | "cancelled";
    due_date: string;
    paid_at?: string;
    items: BillingItem[];
    created_at: string;
    updated_at: string;
}
export interface BillingItem {
    id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    amount: number;
}
export interface CreateBillingRequest {
    customer_id: string;
    invoice_no?: string;
    amount: number;
    currency?: string;
    due_date: string;
    items: BillingItem[];
}
export interface BillingQueryParams extends PaginationParams {
    customer_id?: string;
    status?: string;
}
declare const billingApi: {
    /**
     * 获取账单列表
     */
    list: (params?: BillingQueryParams) => Promise<ApiResponse<PaginatedResponse<BillingRecord>>>;
    /**
     * 获取账单详情
     */
    get: (id: string) => Promise<ApiResponse<BillingRecord>>;
    /**
     * 创建账单
     */
    create: (data: CreateBillingRequest) => Promise<ApiResponse<BillingRecord>>;
    /**
     * 更新账单
     */
    update: (id: string, data: Partial<BillingRecord>) => Promise<ApiResponse<BillingRecord>>;
    /**
     * 删除账单
     */
    delete: (id: string) => Promise<ApiResponse<void>>;
    /**
     * 标记账单已支付
     */
    markPaid: (id: string) => Promise<ApiResponse<BillingRecord>>;
    /**
     * 发送账单通知
     */
    sendNotification: (id: string) => Promise<ApiResponse<void>>;
};
/**
 * CRM API 统一导出
 */
export declare const crmApi: {
    customers: {
        /**
         * 获取客户列表
         */
        list: (params?: PaginationParams) => Promise<ApiResponse<PaginatedResponse<Customer>>>;
        /**
         * 创建客户
         */
        create: (data: CreateCustomerRequest) => Promise<ApiResponse<Customer>>;
        /**
         * 获取客户详情
         */
        get: (id: string) => Promise<ApiResponse<Customer>>;
        /**
         * 更新客户
         */
        update: (id: string, data: UpdateCustomerRequest) => Promise<ApiResponse<Customer>>;
        /**
         * 删除客户
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 批量删除客户
         */
        batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
    };
    contacts: {
        /**
         * 获取联系人列表
         */
        list: (params?: ContactQueryParams) => Promise<ApiResponse<PaginatedResponse<Contact>>>;
        /**
         * 创建联系人
         */
        create: (data: CreateContactRequest) => Promise<ApiResponse<Contact>>;
        /**
         * 获取联系人详情
         */
        get: (id: string) => Promise<ApiResponse<Contact>>;
        /**
         * 更新联系人
         */
        update: (id: string, data: UpdateContactRequest) => Promise<ApiResponse<Contact>>;
        /**
         * 删除联系人
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 批量删除联系人
         */
        batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
    };
    opportunities: {
        /**
         * 获取商机列表
         */
        list: (params?: OpportunityQueryParams) => Promise<ApiResponse<PaginatedResponse<Opportunity>>>;
        /**
         * 创建商机
         */
        create: (data: CreateOpportunityRequest) => Promise<ApiResponse<Opportunity>>;
        /**
         * 获取商机详情
         */
        get: (id: string) => Promise<ApiResponse<Opportunity>>;
        /**
         * 更新商机
         */
        update: (id: string, data: UpdateOpportunityRequest) => Promise<ApiResponse<Opportunity>>;
        /**
         * 删除商机
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 批量删除商机
         */
        batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
    };
    interactions: {
        /**
         * 获取交互记录列表
         */
        list: (params?: InteractionQueryParams) => Promise<ApiResponse<PaginatedResponse<Interaction>>>;
        /**
         * 创建交互记录
         */
        create: (data: CreateInteractionRequest) => Promise<ApiResponse<Interaction>>;
        /**
         * 获取交互记录详情
         */
        get: (id: string) => Promise<ApiResponse<Interaction>>;
        /**
         * 更新交互记录
         */
        update: (id: string, data: UpdateInteractionRequest) => Promise<ApiResponse<Interaction>>;
        /**
         * 删除交互记录
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 批量删除交互记录
         */
        batchDelete: (ids: string[]) => Promise<ApiResponse<void>>;
    };
    customerScoring: {
        /**
         * 获取客户评分列表
         */
        list: (params?: CustomerScoringQueryParams) => Promise<ApiResponse<PaginatedResponse<CustomerScore>>>;
        /**
         * 获取客户评分详情
         */
        get: (id: string) => Promise<ApiResponse<CustomerScore>>;
        /**
         * 创建客户评分
         */
        create: (data: CreateCustomerScoreRequest) => Promise<ApiResponse<CustomerScore>>;
        /**
         * 更新客户评分
         */
        update: (id: string, data: Partial<CreateCustomerScoreRequest>) => Promise<ApiResponse<CustomerScore>>;
        /**
         * 删除客户评分
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 批量计算客户评分
         */
        calculateBatch: (customerIds: string[]) => Promise<ApiResponse<CustomerScore[]>>;
    };
    salesForecast: {
        /**
         * 获取销售预测列表
         */
        list: (params?: SalesForecastQueryParams) => Promise<ApiResponse<PaginatedResponse<SalesForecast>>>;
        /**
         * 获取销售预测详情
         */
        get: (id: string) => Promise<ApiResponse<SalesForecast>>;
        /**
         * 创建销售预测
         */
        create: (data: CreateSalesForecastRequest) => Promise<ApiResponse<SalesForecast>>;
        /**
         * 更新销售预测
         */
        update: (id: string, data: Partial<SalesForecast>) => Promise<ApiResponse<SalesForecast>>;
        /**
         * 删除销售预测
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 生成预测
         */
        generate: (data: CreateSalesForecastRequest) => Promise<ApiResponse<SalesForecast>>;
    };
    billing: {
        /**
         * 获取账单列表
         */
        list: (params?: BillingQueryParams) => Promise<ApiResponse<PaginatedResponse<BillingRecord>>>;
        /**
         * 获取账单详情
         */
        get: (id: string) => Promise<ApiResponse<BillingRecord>>;
        /**
         * 创建账单
         */
        create: (data: CreateBillingRequest) => Promise<ApiResponse<BillingRecord>>;
        /**
         * 更新账单
         */
        update: (id: string, data: Partial<BillingRecord>) => Promise<ApiResponse<BillingRecord>>;
        /**
         * 删除账单
         */
        delete: (id: string) => Promise<ApiResponse<void>>;
        /**
         * 标记账单已支付
         */
        markPaid: (id: string) => Promise<ApiResponse<BillingRecord>>;
        /**
         * 发送账单通知
         */
        sendNotification: (id: string) => Promise<ApiResponse<void>>;
    };
    /**
     * 健康检查
     */
    health: () => Promise<ApiResponse<string>>;
};
export { customerApi, contactApi, opportunityApi, interactionApi, customerScoringApi, salesForecastApi, billingApi, };
