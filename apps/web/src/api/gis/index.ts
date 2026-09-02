import { deviceApi } from './device';
import { pipelineApi } from './pipeline';
import { storageApi } from './storage';
import { mapApi } from './map';
import { businessApi } from './business';

export * from './types';

export { deviceApi } from './device';
export { businessApi } from './business';
export { mapApi } from './map';
export { pipelineApi } from './pipeline';
export { storageApi } from './storage';

export const gisApi = {
  devices: deviceApi,
  pipelines: pipelineApi,
  storage: storageApi,
  maps: mapApi,
  business: businessApi,

  getStatistics: mapApi.getStatistics,

  listDevicePoints: deviceApi.listDevicePoints,
  getDevicePoint: deviceApi.getDevicePoint,
  listDevicePointsByMap: deviceApi.listDevicePointsByMap,
  createDevicePoint: deviceApi.createDevicePoint,
  updateDevicePoint: deviceApi.updateDevicePoint,
  deleteDevicePoint: deviceApi.deleteDevicePoint,

  listPipelines: pipelineApi.listPipelines,
  getPipeline: pipelineApi.getPipeline,
  listPipelinesByMap: pipelineApi.listPipelinesByMap,
  createPipeline: pipelineApi.createPipeline,
  updatePipeline: pipelineApi.updatePipeline,
  deletePipeline: pipelineApi.deletePipeline,

  listStorageLocations: storageApi.listStorageLocations,
  getStorageLocation: storageApi.getStorageLocation,
  listStorageLocationsByMap: storageApi.listStorageLocationsByMap,
  createStorageLocation: storageApi.createStorageLocation,
  updateStorageLocation: storageApi.updateStorageLocation,
  deleteStorageLocation: storageApi.deleteStorageLocation,

  listEvidenceRecords: storageApi.listEvidenceRecords,
  getEvidenceRecord: storageApi.getEvidenceRecord,
  listEvidenceRecordsByMap: storageApi.listEvidenceRecordsByMap,
  createEvidenceRecord: storageApi.createEvidenceRecord,
  deleteEvidenceRecord: storageApi.deleteEvidenceRecord,

  listFactoryMaps: mapApi.listFactoryMaps,
  getFactoryMap: mapApi.getFactoryMap,
  createFactoryMap: mapApi.createFactoryMap,
  updateFactoryMap: mapApi.updateFactoryMap,
  deleteFactoryMap: mapApi.deleteFactoryMap,

  listBusinessLocations: businessApi.listBusinessLocations,
  getBusinessLocation: businessApi.getBusinessLocation,
  listBusinessLocationsByType: businessApi.listBusinessLocationsByType,
  createBusinessLocation: businessApi.createBusinessLocation,
  updateBusinessLocation: businessApi.updateBusinessLocation,
  deleteBusinessLocation: businessApi.deleteBusinessLocation,

  listMapMarkers: mapApi.listMapMarkers,
  createMapMarker: mapApi.createMapMarker,
  updateMapMarker: mapApi.updateMapMarker,
  deleteMapMarker: mapApi.deleteMapMarker,

  search: mapApi.search,
  exportGeoJSON: mapApi.exportGeoJSON,
  health: mapApi.health,
  importData: mapApi.importData,

  getDeviceTrack: deviceApi.getDeviceTrack,
  getDeviceTrackStatistics: deviceApi.getDeviceTrackStatistics,
  listDevicesWithTracks: deviceApi.listDevicesWithTracks,
};

export default gisApi;
