import { equipmentApi } from './equipment';
import { maintenanceApi, inspectionApi } from './maintenance';
import { vehicleApi, vehicleRequestApi } from '../erp/admin/vehicle';
import { officeSupplyApi } from '../erp/admin/officeSupplies';
import { fixedAssetApi, assetApi as erpAssetApi } from '../erp/finance/asset';
import type {
  Equipment,
  MaintenanceRecord,
  InspectionRecord,
  PaginationParams,
  PaginatedResult,
} from './types';
import type { Vehicle, VehicleRequest, OfficeSupply, FixedAsset, Asset } from '../erp/types';

export * from './types';
export { equipmentApi, equipmentCrudApi } from './equipment';
export { maintenanceApi, inspectionApi } from './maintenance';

export const assetApi = {
  equipments: equipmentApi,
  maintenances: maintenanceApi,
  inspections: inspectionApi,
  vehicles: vehicleApi,
  vehicleRequests: vehicleRequestApi,
  officeSupplies: officeSupplyApi,
  fixedAssets: fixedAssetApi,
  assets: erpAssetApi,

  listEquipments: equipmentApi.listEquipments,
  getEquipment: equipmentApi.getEquipment,
  createEquipment: equipmentApi.createEquipment,
  updateEquipment: equipmentApi.updateEquipment,
  deleteEquipment: equipmentApi.deleteEquipment,
  batchDeleteEquipments: equipmentApi.batchDeleteEquipments,
  getEquipmentStats: equipmentApi.getEquipmentStats,

  listMaintenances: maintenanceApi.listMaintenances,
  getMaintenance: maintenanceApi.getMaintenance,
  createMaintenance: maintenanceApi.createMaintenance,
  updateMaintenance: maintenanceApi.updateMaintenance,
  deleteMaintenance: maintenanceApi.deleteMaintenance,
  getMaintenanceByEquipment: maintenanceApi.getMaintenanceByEquipment,

  listInspections: inspectionApi.listInspections,
  getInspection: inspectionApi.getInspection,
  createInspection: inspectionApi.createInspection,
  updateInspection: inspectionApi.updateInspection,
  deleteInspection: inspectionApi.deleteInspection,
  getInspectionByEquipment: inspectionApi.getInspectionByEquipment,

  listVehicles: vehicleApi.list,
  getVehicle: vehicleApi.get,
  createVehicle: vehicleApi.create,
  updateVehicle: vehicleApi.update,
  deleteVehicle: vehicleApi.delete,

  listVehicleRequests: vehicleRequestApi.list,
  getVehicleRequest: vehicleRequestApi.get,
  createVehicleRequest: vehicleRequestApi.create,
  updateVehicleRequest: vehicleRequestApi.update,
  deleteVehicleRequest: vehicleRequestApi.delete,

  listOfficeSupplies: officeSupplyApi.list,
  getOfficeSupply: officeSupplyApi.get,
  createOfficeSupply: officeSupplyApi.create,
  updateOfficeSupply: officeSupplyApi.update,
  deleteOfficeSupply: officeSupplyApi.delete,

  listFixedAssets: fixedAssetApi.list,
  getFixedAsset: fixedAssetApi.get,
  createFixedAsset: fixedAssetApi.create,
  updateFixedAsset: fixedAssetApi.update,
  deleteFixedAsset: fixedAssetApi.delete,
  depreciateFixedAssets: fixedAssetApi.depreciate,
};

export default assetApi;
