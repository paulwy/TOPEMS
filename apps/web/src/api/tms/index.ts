import vehicleApi from './vehicle';
import driverApi from './driver';
import carrierApi from './carrier';
import routeApi from './route';
import shipmentApi from './shipment';
import optimizationApi from './optimization';
import { tmsAnalyticsApi } from './analytics';

export * from './types';

export { default as vehicleApi } from './vehicle';
export { default as driverApi } from './driver';
export { default as carrierApi } from './carrier';
export { default as routeApi } from './route';
export { default as shipmentApi } from './shipment';
export { default as optimizationApi } from './optimization';
export * from './optimization';
export { tmsAnalyticsApi } from './analytics';
export * from './analytics';

export const tmsApi = {
  // Vehicle
  listVehicles: vehicleApi.list,
  getVehicle: vehicleApi.get,
  createVehicle: vehicleApi.create,
  updateVehicle: vehicleApi.update,
  deleteVehicle: vehicleApi.delete,
  submitVehicleInspection: vehicleApi.submitInspection,
  approveVehicle: vehicleApi.approve,
  rejectVehicle: vehicleApi.reject,
  // Driver
  listDrivers: driverApi.list,
  getDriver: driverApi.get,
  createDriver: driverApi.create,
  updateDriver: driverApi.update,
  deleteDriver: driverApi.delete,
  submitDriverVerification: driverApi.submitVerification,
  approveDriver: driverApi.approve,
  rejectDriver: driverApi.reject,
  // Carrier
  listCarriers: carrierApi.list,
  getCarrier: carrierApi.get,
  createCarrier: carrierApi.create,
  updateCarrier: carrierApi.update,
  deleteCarrier: carrierApi.delete,
  submitCarrierQualification: carrierApi.submitQualification,
  approveCarrier: carrierApi.approve,
  rejectCarrier: carrierApi.reject,
  // Route
  listRoutes: routeApi.list,
  getRoute: routeApi.get,
  createRoute: routeApi.create,
  updateRoute: routeApi.update,
  deleteRoute: routeApi.delete,
  // Shipment
  listShipments: shipmentApi.list,
  getShipment: shipmentApi.get,
  createShipment: shipmentApi.create,
  updateShipment: shipmentApi.update,
  deleteShipment: shipmentApi.delete,
  dispatchShipment: shipmentApi.dispatch,
  arriveShipment: shipmentApi.arrive,
  cancelShipment: shipmentApi.cancel,
  submitShipmentApproval: shipmentApi.submitApproval,
  approveShipment: shipmentApi.approve,
  rejectShipment: shipmentApi.reject,
  // Optimization
  planAssignments: optimizationApi.planAssignments,
  optimizeRoutes: optimizationApi.optimizeRoutes,
  quoteFreight: optimizationApi.quoteFreight,
};

export default tmsApi;
