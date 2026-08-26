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
  submitPlan: productionPlanApi.submit,
  approvePlan: productionPlanApi.approve,
  rejectPlan: productionPlanApi.reject,
  // Schedule
  listSchedules: scheduleApi.list,
  getSchedule: scheduleApi.get,
  createSchedule: scheduleApi.create,
  updateSchedule: scheduleApi.update,
  deleteSchedule: scheduleApi.delete,
  startSchedule: scheduleApi.start,
  completeSchedule: scheduleApi.complete,
  cancelSchedule: scheduleApi.cancel,
  submitSchedule: scheduleApi.submit,
  releaseSchedule: scheduleApi.release,
  holdSchedule: scheduleApi.hold,
  // Capacity
  listCapacities: capacityApi.list,
  getCapacity: capacityApi.get,
  createCapacity: capacityApi.create,
  updateCapacity: capacityApi.update,
  deleteCapacity: capacityApi.delete,
  submitCapacity: capacityApi.submit,
  allocateCapacity: capacityApi.allocate,
  releaseCapacity: capacityApi.release,
  // Material Plan
  listMaterialPlans: materialPlanApi.list,
  getMaterialPlan: materialPlanApi.get,
  createMaterialPlan: materialPlanApi.create,
  updateMaterialPlan: materialPlanApi.update,
  deleteMaterialPlan: materialPlanApi.delete,
  submitMaterialPlan: materialPlanApi.submit,
  requisitionMaterialPlan: materialPlanApi.requisition,
  cancelMaterialPlan: materialPlanApi.cancel,
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
