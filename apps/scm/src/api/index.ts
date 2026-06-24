/**
 * SCM/SRM/WMS 统一 API 导出
 */

export {
  scmApi,
  supplierApi,
  purchaseOrderApi,
  purchaseReceiptApi,
  inventoryApi,
  default as defaultScmApi,
} from './scm';
export type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  PurchaseReceipt,
  CreatePurchaseReceiptRequest,
  UpdatePurchaseReceiptRequest,
  InventoryItem,
  ListParams as ScmListParams,
  PaginatedResult as ScmPaginatedResult,
} from './scm';

export {
  srmApi,
  collaborationSupplierApi,
  inquiryApi,
  quoteApi,
  tenderApi,
  bidApi,
} from './srm';
export type {
  CollaborationSupplier,
  CreateCollaborationSupplierRequest,
  Inquiry,
  CreateInquiryRequest,
  Quote,
  CreateQuoteRequest,
  Tender,
  CreateTenderRequest,
  Bid,
  CreateBidRequest,
  ListParams as SrmListParams,
  PaginatedResult as SrmPaginatedResult,
} from './srm';

export {
  wmsApi,
  warehouseApi,
  inboundOrderApi,
  outboundOrderApi,
  stockTakeApi,
  inventoryAlertApi,
} from './wms';
export type {
  Warehouse,
  CreateWarehouseRequest,
  UpdateWarehouseRequest,
  InboundOrder,
  OutboundOrder,
  StockTake,
  InventoryAlert,
  ListParams as WmsListParams,
  PaginatedResult as WmsPaginatedResult,
} from './wms';
