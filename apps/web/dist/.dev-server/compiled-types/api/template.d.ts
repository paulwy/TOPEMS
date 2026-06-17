import type { ApiResponse } from "./client";
export type TemplateType = "workflow" | "document" | "form" | "report" | "notification";
export type VariableType = "string" | "number" | "date" | "select" | "multiselect" | "lookup" | "user" | "now" | "context";
export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}
export interface TemplateVariable {
    key: string;
    label: string;
    type: VariableType;
    required?: boolean;
    default_value?: any;
    options?: SelectOption[];
    data_source?: string;
    validation_rules?: Record<string, any>;
    placeholder?: string;
    description?: string;
}
export interface Template {
    id: string;
    name: string;
    code: string;
    template_type: TemplateType;
    category_id?: string;
    category_name?: string;
    module?: string;
    description?: string;
    content: string;
    variables: TemplateVariable[];
    is_active: boolean;
    is_system: boolean;
    is_public: boolean;
    ai_enabled: boolean;
    version: number;
    view_count: number;
    use_count: number;
    created_at: string;
    updated_at: string;
    created_by?: string;
}
export interface TemplateCategory {
    id: string;
    name: string;
    code: string;
    category_type?: TemplateType;
    icon?: string;
    description?: string;
    template_count: number;
    is_active: boolean;
}
export interface CreateTemplateRequest {
    name: string;
    code: string;
    template_type?: TemplateType;
    category_id?: string;
    module: string;
    description?: string;
    content: string;
    variables?: TemplateVariable[];
    is_active?: boolean;
    is_public?: boolean;
    ai_enabled?: boolean;
    sort_order?: number;
}
export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
    id: string;
}
export interface PaginationParams {
    page?: number;
    page_size?: number;
    search?: string;
    type?: TemplateType;
    category?: string;
    module?: string;
    is_active?: boolean;
    is_public?: boolean;
}
export interface RenderTemplateRequest {
    variables: Record<string, any>;
}
export interface RenderTemplateResponse {
    content: string;
    missing_variables: string[];
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export declare const templateApi: {
    list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<Template>>>;
    get(id: string): Promise<ApiResponse<Template>>;
    create(data: CreateTemplateRequest): Promise<ApiResponse<Template>>;
    update(id: string, data: Partial<CreateTemplateRequest>): Promise<ApiResponse<Template>>;
    delete(id: string): Promise<ApiResponse<string>>;
    listCategories(params?: Pick<PaginationParams, "is_active" | "type">): Promise<ApiResponse<TemplateCategory[]>>;
    render(id: string, variables: Record<string, any>): Promise<ApiResponse<RenderTemplateResponse>>;
    duplicate(id: string): Promise<ApiResponse<Template>>;
    toggleStatus(id: string): Promise<ApiResponse<Template>>;
};
