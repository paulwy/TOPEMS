/**
 * MDM · 主数据 API 统一出口
 *
 * 按既有 scmApi / srmApi / erpApi 风格聚合各子域。
 * 后端 baseURL 由 config.runtime.ts 的 services['master-data'] 提供（指向 /api/master-data），
 * apiClient.master getter 已在 client.ts 注册（master 与 master-data 同路径别名）。
 */
import { masterDataSuppliersApi } from './suppliers';
import { masterDataSupplierCategoriesApi } from './supplierCategories';

export {
  masterDataSuppliersApi,
  type MasterDataSupplier,
  type MasterDataSupplierListParams,
  type MasterDataSupplierListResponse,
  type CreateMasterDataSupplierRequest,
  type UpdateMasterDataSupplierRequest,
} from './suppliers';

export {
  masterDataSupplierCategoriesApi,
  type MasterDataSupplierCategory,
} from './supplierCategories';

export const masterDataApi = {
  suppliers: masterDataSuppliersApi,
  supplierCategories: masterDataSupplierCategoriesApi,
};

export default masterDataApi;
