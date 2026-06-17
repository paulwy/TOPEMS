import type { AddressbookEntry, AddressbookDetail, AddressbookQueryParams, AddressbookSearchParams, ApiResponse, DepartmentNode, ExportParams, PaginatedResponse } from "../types/addressbook";
export declare const addressbookApi: {
    getContacts: (params: AddressbookQueryParams) => Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>>;
    getContactDetail: (id: string, contactType: string) => Promise<ApiResponse<AddressbookDetail>>;
    search: (params: AddressbookSearchParams) => Promise<ApiResponse<Record<string, unknown>[]>>;
    getDepartmentTree: () => Promise<ApiResponse<DepartmentNode[]>>;
    exportContacts: (params: ExportParams) => Promise<Blob>;
};
