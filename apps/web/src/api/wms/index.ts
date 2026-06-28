import { inventoryApi, inventoryAlertsApi, inventoryStatsApi } from './inventory';
import { warehouseApi } from './warehouse';
import { locationApi } from './location';
import { inboundOrderApi } from './inbound';
import { outboundOrderApi, wavePickApi } from './outbound';
import { stockTakeApi } from './stocktake';
import { transferApi } from './transfer';
import { smartReplenishmentApi } from './replenishment';
import { syncRecordApi, syncApi } from './sync';
import { auditLogApi } from './audit';
import { batchApi } from './batch';
import { serialNumberApi } from './serialNumber';

export * from './types';

export { inventoryApi, inventoryAlertsApi, inventoryStatsApi } from './inventory';
export * from './inventory';

export { warehouseApi } from './warehouse';
export * from './warehouse';

export { locationApi } from './location';
export * from './location';

export { inboundOrderApi } from './inbound';
export * from './inbound';

export { outboundOrderApi, wavePickApi } from './outbound';
export * from './outbound';

export { stockTakeApi } from './stocktake';
export * from './stocktake';

export { transferApi } from './transfer';
export * from './transfer';

export { smartReplenishmentApi } from './replenishment';
export * from './replenishment';

export { syncRecordApi, syncApi } from './sync';
export * from './sync';

export { auditLogApi } from './audit';
export * from './audit';

export { batchApi } from './batch';
export * from './batch';

export { serialNumberApi } from './serialNumber';
export * from './serialNumber';

export const wmsApi = {
  inventory: inventoryApi,
  inboundOrders: inboundOrderApi,
  outboundOrders: outboundOrderApi,
  stockTakes: stockTakeApi,
  warehouses: warehouseApi,
  inventoryAlerts: inventoryAlertsApi,
  smartReplenishment: smartReplenishmentApi,
  locations: locationApi,
  transfers: transferApi,
  syncRecords: syncRecordApi,
  sync: syncApi,
  auditLogs: auditLogApi,
  inventoryStats: inventoryStatsApi,
  wavePicks: wavePickApi,
  batches: batchApi,
  serialNumbers: serialNumberApi,
};

export default wmsApi;
