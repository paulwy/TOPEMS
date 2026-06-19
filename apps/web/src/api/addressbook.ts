import apiClient, { downloadBlob } from "./client";
import type {
  AddressbookEntry,
  AddressbookDetail,
  AddressbookQueryParams,
  AddressbookSearchParams,
  ApiResponse,
  DepartmentNode,
  ExportParams,
  PaginatedResponse,
} from "../types/addressbook";
import config from "../config/runtime";

export const addressbookApi = {
  getContacts: async (
    params: AddressbookQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<AddressbookEntry>>> => {
    const response = await apiClient.erp.get("/api/addressbook", { params });
    return response;
  },

  getContactDetail: async (
    id: string,
    contactType: string,
  ): Promise<ApiResponse<AddressbookDetail>> => {
    const response = await apiClient.erp.get(`/api/addressbook/${id}`, {
      params: { contact_type: contactType },
    });
    return response;
  },

  search: async (
    params: AddressbookSearchParams,
  ): Promise<ApiResponse<Record<string, unknown>[]>> => {
    const response = await apiClient.erp.get("/api/addressbook/search", {
      params,
    });
    return response;
  },

  getDepartmentTree: async (): Promise<ApiResponse<DepartmentNode[]>> => {
    const response = await apiClient.erp.get(
      "/api/addressbook/departments/tree",
    );
    return response;
  },

  exportContacts: async (params: ExportParams): Promise<Blob> => {
    const baseURL =
      (apiClient.erp as any).defaults?.baseURL || config.services.erp;
    return downloadBlob(baseURL, "/api/addressbook/export", { params });
  },
};
