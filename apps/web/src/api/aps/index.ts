import apiClient from '../client';

import productionPlanApi from './productionPlan';
import scheduleApi from './schedule';
import capacityApi from './capacity';
import materialPlanApi from './materialPlan';
import forecastApi from './forecast';

export * from './types';

export { default as productionPlanApi } from './productionPlan';
export { default as scheduleApi } from './schedule';
export { default as capacityApi } from './capacity';
export { default as materialPlanApi } from './materialPlan';
export { default as forecastApi } from './forecast';

export const apsApi = {
  // Production Plan
  listPlans: productionPlanApi.list,
  getPlan: productionPlanApi.get,
  createPlan: productionPlanApi.create,
  updatePlan: productionPlanApi.update,
  deletePlan: productionPlanApi.delete,
  // Schedule
  listSchedules: scheduleApi.list,
  getSchedule: scheduleApi.get,
  createSchedule: scheduleApi.create,
  updateSchedule: scheduleApi.update,
  deleteSchedule: scheduleApi.delete,
  startSchedule: scheduleApi.start,
  completeSchedule: scheduleApi.complete,
  cancelSchedule: scheduleApi.cancel,
  // Capacity
  listCapacities: capacityApi.list,
  getCapacity: capacityApi.get,
  createCapacity: capacityApi.create,
  updateCapacity: capacityApi.update,
  deleteCapacity: capacityApi.delete,
  // Material Plan
  listMaterialPlans: materialPlanApi.list,
  getMaterialPlan: materialPlanApi.get,
  createMaterialPlan: materialPlanApi.create,
  updateMaterialPlan: materialPlanApi.update,
  deleteMaterialPlan: materialPlanApi.delete,
  // Forecast
  listForecasts: forecastApi.list,
  getForecast: forecastApi.get,
  createForecast: forecastApi.create,
  updateForecast: forecastApi.update,
  deleteForecast: forecastApi.delete,
  calculateForecast: forecastApi.calculate,
  validateForecast: forecastApi.validate,
};

export default apsApi;
