import { create } from 'zustand';
import type {
  Supplier,
  PurchaseOrder,
  PurchaseReceipt,
  InventoryItem,
  Warehouse,
  InboundOrder,
  OutboundOrder,
  StockTake,
  InventoryAlert,
  CollaborationSupplier,
  Inquiry,
  Quote,
  Tender,
} from '../api';

interface ScmStore {
  // 供应商
  suppliers: Supplier[];
  suppliersTotal: number;
  suppliersPage: number;
  suppliersPageSize: number;

  // 采购订单
  purchaseOrders: PurchaseOrder[];
  purchaseOrdersTotal: number;
  purchaseOrdersPage: number;
  purchaseOrdersPageSize: number;

  // 采购入库
  purchaseReceipts: PurchaseReceipt[];
  purchaseReceiptsTotal: number;

  // 库存
  inventory: InventoryItem[];
  inventoryTotal: number;
  inventoryPage: number;
  inventoryPageSize: number;

  // 仓库
  warehouses: Warehouse[];
  warehousesTotal: number;

  // 出入库
  inboundOrders: InboundOrder[];
  outboundOrders: OutboundOrder[];

  // 库存盘点
  stockTakes: StockTake[];

  // 库存预警
  inventoryAlerts: InventoryAlert[];

  // SRM - 供应商协同
  collaborationSuppliers: CollaborationSupplier[];
  inquiries: Inquiry[];
  quotes: Quote[];
  tenders: Tender[];

  // 状态
  loading: boolean;
  error: string | null;

  // 通用 setter
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 供应商操作
  setSuppliers: (suppliers: Supplier[], total: number) => void;
  setSuppliersPage: (page: number, pageSize: number) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;

  // 采购订单操作
  setPurchaseOrders: (orders: PurchaseOrder[], total: number) => void;
  setPurchaseOrdersPage: (page: number, pageSize: number) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (order: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;

  // 采购入库操作
  setPurchaseReceipts: (receipts: PurchaseReceipt[], total: number) => void;
  addPurchaseReceipt: (receipt: PurchaseReceipt) => void;
  updatePurchaseReceipt: (receipt: PurchaseReceipt) => void;
  deletePurchaseReceipt: (id: string) => void;

  // 库存操作
  setInventory: (items: InventoryItem[], total: number) => void;
  setInventoryPage: (page: number, pageSize: number) => void;
  updateInventoryItem: (item: InventoryItem) => void;

  // 仓库操作
  setWarehouses: (warehouses: Warehouse[], total: number) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (warehouse: Warehouse) => void;
  deleteWarehouse: (id: string) => void;

  // 出入库操作
  setInboundOrders: (orders: InboundOrder[]) => void;
  setOutboundOrders: (orders: OutboundOrder[]) => void;
  updateInboundOrder: (order: InboundOrder) => void;
  updateOutboundOrder: (order: OutboundOrder) => void;

  // 库存盘点操作
  setStockTakes: (stockTakes: StockTake[]) => void;

  // 库存预警操作
  setInventoryAlerts: (alerts: InventoryAlert[]) => void;
  updateInventoryAlert: (alert: InventoryAlert) => void;

  // SRM 操作
  setCollaborationSuppliers: (suppliers: CollaborationSupplier[]) => void;
  setInquiries: (inquiries: Inquiry[]) => void;
  setQuotes: (quotes: Quote[]) => void;
  setTenders: (tenders: Tender[]) => void;

  reset: () => void;
}

const initialState = {
  suppliers: [] as Supplier[],
  suppliersTotal: 0,
  suppliersPage: 1,
  suppliersPageSize: 10,
  purchaseOrders: [] as PurchaseOrder[],
  purchaseOrdersTotal: 0,
  purchaseOrdersPage: 1,
  purchaseOrdersPageSize: 10,
  purchaseReceipts: [] as PurchaseReceipt[],
  purchaseReceiptsTotal: 0,
  inventory: [] as InventoryItem[],
  inventoryTotal: 0,
  inventoryPage: 1,
  inventoryPageSize: 10,
  warehouses: [] as Warehouse[],
  warehousesTotal: 0,
  inboundOrders: [] as InboundOrder[],
  outboundOrders: [] as OutboundOrder[],
  stockTakes: [] as StockTake[],
  inventoryAlerts: [] as InventoryAlert[],
  collaborationSuppliers: [] as CollaborationSupplier[],
  inquiries: [] as Inquiry[],
  quotes: [] as Quote[],
  tenders: [] as Tender[],
  loading: false,
  error: null as string | null,
};

export const useScmStore = create<ScmStore>((set) => ({
  ...initialState,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // 供应商
  setSuppliers: (suppliers, total) => set({ suppliers, suppliersTotal: total }),
  setSuppliersPage: (page, pageSize) =>
    set({ suppliersPage: page, suppliersPageSize: pageSize }),
  addSupplier: (supplier) =>
    set((state) => ({
      suppliers: [supplier, ...state.suppliers],
      suppliersTotal: state.suppliersTotal + 1,
    })),
  updateSupplier: (supplier) =>
    set((state) => ({
      suppliers: state.suppliers.map((s) => (s.id === supplier.id ? supplier : s)),
    })),
  deleteSupplier: (id) =>
    set((state) => ({
      suppliers: state.suppliers.filter((s) => s.id !== id),
      suppliersTotal: Math.max(0, state.suppliersTotal - 1),
    })),

  // 采购订单
  setPurchaseOrders: (orders, total) => set({ purchaseOrders: orders, purchaseOrdersTotal: total }),
  setPurchaseOrdersPage: (page, pageSize) =>
    set({ purchaseOrdersPage: page, purchaseOrdersPageSize: pageSize }),
  addPurchaseOrder: (order) =>
    set((state) => ({
      purchaseOrders: [order, ...state.purchaseOrders],
      purchaseOrdersTotal: state.purchaseOrdersTotal + 1,
    })),
  updatePurchaseOrder: (order) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.map((o) => (o.id === order.id ? order : o)),
    })),
  deletePurchaseOrder: (id) =>
    set((state) => ({
      purchaseOrders: state.purchaseOrders.filter((o) => o.id !== id),
      purchaseOrdersTotal: Math.max(0, state.purchaseOrdersTotal - 1),
    })),

  // 采购入库
  setPurchaseReceipts: (receipts, total) =>
    set({ purchaseReceipts: receipts, purchaseReceiptsTotal: total }),
  addPurchaseReceipt: (receipt) =>
    set((state) => ({
      purchaseReceipts: [receipt, ...state.purchaseReceipts],
      purchaseReceiptsTotal: state.purchaseReceiptsTotal + 1,
    })),
  updatePurchaseReceipt: (receipt) =>
    set((state) => ({
      purchaseReceipts: state.purchaseReceipts.map((r) =>
        r.id === receipt.id ? receipt : r
      ),
    })),
  deletePurchaseReceipt: (id) =>
    set((state) => ({
      purchaseReceipts: state.purchaseReceipts.filter((r) => r.id !== id),
      purchaseReceiptsTotal: Math.max(0, state.purchaseReceiptsTotal - 1),
    })),

  // 库存
  setInventory: (items, total) => set({ inventory: items, inventoryTotal: total }),
  setInventoryPage: (page, pageSize) => set({ inventoryPage: page, inventoryPageSize: pageSize }),
  updateInventoryItem: (item) =>
    set((state) => ({
      inventory: state.inventory.map((i) => (i.id === item.id ? item : i)),
    })),

  // 仓库
  setWarehouses: (warehouses, total) => set({ warehouses, warehousesTotal: total }),
  addWarehouse: (warehouse) =>
    set((state) => ({
      warehouses: [...state.warehouses, warehouse],
      warehousesTotal: state.warehousesTotal + 1,
    })),
  updateWarehouse: (warehouse) =>
    set((state) => ({
      warehouses: state.warehouses.map((w) => (w.id === warehouse.id ? warehouse : w)),
    })),
  deleteWarehouse: (id) =>
    set((state) => ({
      warehouses: state.warehouses.filter((w) => w.id !== id),
      warehousesTotal: Math.max(0, state.warehousesTotal - 1),
    })),

  // 出入库
  setInboundOrders: (orders) => set({ inboundOrders: orders }),
  setOutboundOrders: (orders) => set({ outboundOrders: orders }),
  updateInboundOrder: (order) =>
    set((state) => ({
      inboundOrders: state.inboundOrders.map((o) => (o.id === order.id ? order : o)),
    })),
  updateOutboundOrder: (order) =>
    set((state) => ({
      outboundOrders: state.outboundOrders.map((o) => (o.id === order.id ? order : o)),
    })),

  // 库存盘点
  setStockTakes: (stockTakes) => set({ stockTakes }),

  // 库存预警
  setInventoryAlerts: (alerts) => set({ inventoryAlerts: alerts }),
  updateInventoryAlert: (alert) =>
    set((state) => ({
      inventoryAlerts: state.inventoryAlerts.map((a) => (a.id === alert.id ? alert : a)),
    })),

  // SRM
  setCollaborationSuppliers: (suppliers) => set({ collaborationSuppliers: suppliers }),
  setInquiries: (inquiries) => set({ inquiries }),
  setQuotes: (quotes) => set({ quotes }),
  setTenders: (tenders) => set({ tenders }),

  reset: () => set(initialState),
}));
