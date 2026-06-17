import type { ApiResponse } from "./client";
export interface DictType {
    id: string;
    code: string;
    name: string;
    category: string;
    description?: string;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface DictItem {
    id: string;
    dict_type_id: string;
    code: string;
    name: string;
    value?: string;
    sort_order: number;
    parent_id?: string;
    extra_data?: any;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface TableInfo {
    table_name: string;
    table_type: string;
}
export interface ColumnInfo {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default?: string;
    character_maximum_length?: number;
    numeric_precision?: number;
    numeric_scale?: number;
    ordinal_position: number;
}
export interface TableDetail {
    table_name: string;
    schema_name: string;
    columns: ColumnInfo[];
    row_count?: number;
}
export interface DbChange {
    id: string;
    change_type: string;
    table_name: string;
    column_name?: string;
    old_definition?: any;
    new_definition?: any;
    sql_statement: string;
    executed_by?: string;
    executed_at: string;
    backup_data?: any;
}
export interface DbColumnDefinition {
    column_name: string;
    data_type: string;
    is_nullable: boolean;
    default_value?: string;
    max_length?: number;
    numeric_precision?: number;
    numeric_scale?: number;
    comment?: string;
}
export interface SqlPreview {
    sql: string;
    warning?: string;
}
export interface PaginationParams {
    page?: number;
    page_size?: number;
    search?: string;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
}
export declare const dictTypeApi: {
    list(params?: PaginationParams & {
        category?: string;
        status?: string;
    }): Promise<ApiResponse<PaginatedResult<DictType>>>;
    get(id: string): Promise<ApiResponse<DictType>>;
    create(data: Partial<DictType>): Promise<ApiResponse<DictType>>;
    update(id: string, data: Partial<DictType>): Promise<ApiResponse<DictType>>;
    delete(id: string): Promise<ApiResponse<string>>;
};
export interface BatchCreateDictItemRequest {
    dict_type_id: string;
    items: Partial<DictItem>[];
}
export interface DictItemExport {
    code: string;
    name: string;
    value?: string;
    sort_order: number;
    status: string;
}
export declare const dictItemApi: {
    list(dictTypeId: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResult<DictItem>>>;
    get(id: string): Promise<ApiResponse<DictItem>>;
    create(data: Partial<DictItem>): Promise<ApiResponse<DictItem>>;
    update(id: string, data: Partial<DictItem>): Promise<ApiResponse<DictItem>>;
    delete(id: string): Promise<ApiResponse<string>>;
    batchCreate(data: BatchCreateDictItemRequest): Promise<ApiResponse<DictItem[]>>;
    export(dictTypeId: string): Promise<string>;
};
export declare const dbStructureApi: {
    listTables(params?: {
        schema?: string;
        search?: string;
    }): Promise<ApiResponse<TableInfo[]>>;
    getTableDetail(tableName: string): Promise<ApiResponse<TableDetail>>;
    previewAddColumn(data: {
        table_name: string;
        column: DbColumnDefinition;
    }): Promise<ApiResponse<SqlPreview>>;
    addColumn(data: {
        table_name: string;
        column: DbColumnDefinition;
    }): Promise<ApiResponse<string>>;
    modifyColumn(tableName: string, columnName: string, column: DbColumnDefinition): Promise<ApiResponse<string>>;
    dropColumn(tableName: string, columnName: string): Promise<ApiResponse<string>>;
    listChanges(params?: PaginationParams & {
        table_name?: string;
    }): Promise<ApiResponse<PaginatedResult<DbChange>>>;
};
