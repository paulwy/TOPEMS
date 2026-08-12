import apiClient from '../client';

import vehicleApi from './vehicle';
import driverApi from './driver';
import carrierApi from './carrier';
import routeApi from './route';
import shipmentApi from './shipment';

export * from './types';

export { default as vehicleApi } from './vehicle';
export { default as driverApi } from './driver';
export { default as carrierApi } from './carrier';
export { default as routeApi } from './route';
export { default as shipmentApi } from './shipment';

export const tmsApi = {
  // Vehicle
  listVehicles: vehicleApi.list,
  getVehicle: vehicleApi.get,
  createVehicle: vehicleApi.create,
  updateVehicle: vehicleApi.update,
  deleteVehicle: vehicleApi.delete,
  // Driver
  listDrivers: driverApi.list,
  getDriver: driverApi.get,
  createDriver: driverApi.create,
  updateDriver: driverApi.update,
  deleteDriver: driverApi.delete,
  // Carrier
  listCarriers: carrierApi.list,
  getCarrier: carrierApi.get,
  createCarrier: carrierApi.create,
  updateCarrier: carrierApi.update,
  deleteCarrier: carrierApi.delete,
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
};

export default tmsApi;
