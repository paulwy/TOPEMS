import type { ApiResponse } from "./client";
export interface Email {
    id: string;
    subject: string;
    from_address: string;
    to_addresses: string[];
    cc_addresses?: string[];
    bcc_addresses?: string[];
    body: string;
    body_html?: string;
    status: string;
    priority: string;
    sent_at?: string;
    error_message?: string;
    template_id?: string;
    created_at: string;
    updated_at: string;
}
export interface EmailTemplate {
    id: string;
    code: string;
    name: string;
    description?: string;
    subject_template: string;
    body_template: string;
    body_html_template?: string;
    category: string;
    tags?: string[];
    status: string;
    created_at: string;
    updated_at: string;
}
export interface SendEmailRequest {
    subject: string;
    to_addresses: string[];
    cc_addresses?: string[];
    bcc_addresses?: string[];
    body: string;
    body_html?: string;
    priority?: string;
    template_id?: string;
    template_data?: Record<string, any>;
}
export interface SendEmailWithTemplateRequest {
    template_code: string;
    to_addresses: string[];
    cc_addresses?: string[];
    bcc_addresses?: string[];
    template_data: Record<string, any>;
    priority?: string;
}
export interface PaginationParams {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    priority?: string;
    category?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export interface EmailStats {
    total: number;
    sent_count: number;
    failed_count: number;
    pending_count: number;
    today_count: number;
    last_sent_at?: string;
}
export interface ResendResult {
    total: number;
    success: number;
    failed: number;
    failed_ids: string[];
}
export declare const emailApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Email>>>;
    get(id: string): Promise<ApiResponse<Email>>;
    send(data: SendEmailRequest): Promise<ApiResponse<Email>>;
    sendWithTemplate(data: SendEmailWithTemplateRequest): Promise<ApiResponse<Email>>;
    delete(id: string): Promise<ApiResponse<string>>;
    resend(emailIds: string[]): Promise<ApiResponse<ResendResult>>;
    getStats(): Promise<ApiResponse<EmailStats>>;
};
export declare const templateApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<EmailTemplate>>>;
    get(id: string): Promise<ApiResponse<EmailTemplate>>;
    create(data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>>;
    update(id: string, data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>>;
    delete(id: string): Promise<ApiResponse<string>>;
    updateStatus(id: string, status: string): Promise<ApiResponse<EmailTemplate>>;
    render(templateCode: string, data: Record<string, any>): Promise<ApiResponse<{
        subject: string;
        body: string;
        body_html?: string;
    }>>;
};
export declare const mailApi: {
    health(): Promise<ApiResponse<string>>;
};
export declare const TEMPLATE_CATEGORIES: {
    value: string;
    label: string;
}[];
export declare const PRIORITY_OPTIONS: {
    value: string;
    label: string;
}[];
export declare const STATUS_OPTIONS: {
    value: string;
    label: string;
}[];
