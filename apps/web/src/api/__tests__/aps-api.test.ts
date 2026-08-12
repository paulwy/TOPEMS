import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockApsClient = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return {
    apiClient: { aps: mockApsClient },
    default: { aps: mockApsClient },
  };
});

describe('APS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('productionPlanApi', () => {
    it('list should call GET /production-plans with params', async () => {
      const { productionPlanApi } = await import('../aps/productionPlan');
      await productionPlanApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/production-plans', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /production-plans/:id', async () => {
      const { productionPlanApi } = await import('../aps/productionPlan');
      await productionPlanApi.get('plan-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/production-plans/plan-001');
    });

    it('create should call POST /production-plans with data', async () => {
      const { productionPlanApi } = await import('../aps/productionPlan');
      const data = { plan_no: 'P-001', plan_name: '2026年1月生产计划', plan_type: 'monthly' };
      await productionPlanApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/production-plans', data);
    });

    it('update should call PUT /production-plans/:id with data', async () => {
      const { productionPlanApi } = await import('../aps/productionPlan');
      const data = { plan_name: '更新计划名称' };
      await productionPlanApi.update('plan-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.put).toHaveBeenCalledWith('/production-plans/plan-001', data);
    });

    it('delete should call DELETE /production-plans/:id', async () => {
      const { productionPlanApi } = await import('../aps/productionPlan');
      await productionPlanApi.delete('plan-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.delete).toHaveBeenCalledWith('/production-plans/plan-001');
    });
  });

  describe('scheduleApi', () => {
    it('list should call GET /schedules with params', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/schedules', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /schedules/:id', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.get('sch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/schedules/sch-001');
    });

    it('create should call POST /schedules with data', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      const data = { schedule_no: 'SCH-001', plan_id: 'plan-001', product_name: '产品A' };
      await scheduleApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/schedules', data);
    });

    it('update should call PUT /schedules/:id with data', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      const data = { priority: 10 };
      await scheduleApi.update('sch-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.put).toHaveBeenCalledWith('/schedules/sch-001', data);
    });

    it('delete should call DELETE /schedules/:id', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.delete('sch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.delete).toHaveBeenCalledWith('/schedules/sch-001');
    });

    it('start should call POST /schedules/:id/start', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.start('sch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/schedules/sch-001/start');
    });

    it('complete should call POST /schedules/:id/complete', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.complete('sch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/schedules/sch-001/complete');
    });

    it('cancel should call POST /schedules/:id/cancel', async () => {
      const { scheduleApi } = await import('../aps/schedule');
      await scheduleApi.cancel('sch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/schedules/sch-001/cancel');
    });
  });

  describe('capacityApi', () => {
    it('list should call GET /capacities with params', async () => {
      const { capacityApi } = await import('../aps/capacity');
      await capacityApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/capacities', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /capacities/:id', async () => {
      const { capacityApi } = await import('../aps/capacity');
      await capacityApi.get('cap-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/capacities/cap-001');
    });

    it('create should call POST /capacities with data', async () => {
      const { capacityApi } = await import('../aps/capacity');
      const data = { work_center_id: 'wc-001', work_center_name: '车间A', available_hours: 8 };
      await capacityApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/capacities', data);
    });

    it('update should call PUT /capacities/:id with data', async () => {
      const { capacityApi } = await import('../aps/capacity');
      const data = { used_hours: 6 };
      await capacityApi.update('cap-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.put).toHaveBeenCalledWith('/capacities/cap-001', data);
    });

    it('delete should call DELETE /capacities/:id', async () => {
      const { capacityApi } = await import('../aps/capacity');
      await capacityApi.delete('cap-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.delete).toHaveBeenCalledWith('/capacities/cap-001');
    });
  });

  describe('materialPlanApi', () => {
    it('list should call GET /material-plans with params', async () => {
      const { materialPlanApi } = await import('../aps/materialPlan');
      await materialPlanApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/material-plans', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /material-plans/:id', async () => {
      const { materialPlanApi } = await import('../aps/materialPlan');
      await materialPlanApi.get('mp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/material-plans/mp-001');
    });

    it('create should call POST /material-plans with data', async () => {
      const { materialPlanApi } = await import('../aps/materialPlan');
      const data = { plan_no: 'MP-001', material_code: 'M-001', material_name: '原料A', required_quantity: 100 };
      await materialPlanApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/material-plans', data);
    });

    it('update should call PUT /material-plans/:id with data', async () => {
      const { materialPlanApi } = await import('../aps/materialPlan');
      const data = { available_quantity: 80 };
      await materialPlanApi.update('mp-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.put).toHaveBeenCalledWith('/material-plans/mp-001', data);
    });

    it('delete should call DELETE /material-plans/:id', async () => {
      const { materialPlanApi } = await import('../aps/materialPlan');
      await materialPlanApi.delete('mp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.delete).toHaveBeenCalledWith('/material-plans/mp-001');
    });
  });

  describe('forecastApi', () => {
    it('list should call GET /forecasts with params', async () => {
      const { forecastApi } = await import('../aps/forecast');
      await forecastApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/forecasts', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /forecasts/:id', async () => {
      const { forecastApi } = await import('../aps/forecast');
      await forecastApi.get('fc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.get).toHaveBeenCalledWith('/forecasts/fc-001');
    });

    it('create should call POST /forecasts with data', async () => {
      const { forecastApi } = await import('../aps/forecast');
      const data = { forecast_no: 'F-001', product_name: '产品A', forecast_quantity: 1000, method: 'moving_average' };
      await forecastApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/forecasts', data);
    });

    it('update should call PUT /forecasts/:id with data', async () => {
      const { forecastApi } = await import('../aps/forecast');
      const data = { forecast_quantity: 1200 };
      await forecastApi.update('fc-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.aps.put).toHaveBeenCalledWith('/forecasts/fc-001', data);
    });

    it('delete should call DELETE /forecasts/:id', async () => {
      const { forecastApi } = await import('../aps/forecast');
      await forecastApi.delete('fc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.delete).toHaveBeenCalledWith('/forecasts/fc-001');
    });

    it('calculate should call POST /forecasts/:id/calculate', async () => {
      const { forecastApi } = await import('../aps/forecast');
      await forecastApi.calculate('fc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/forecasts/fc-001/calculate');
    });

    it('validate should call POST /forecasts/:id/validate', async () => {
      const { forecastApi } = await import('../aps/forecast');
      await forecastApi.validate('fc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.aps.post).toHaveBeenCalledWith('/forecasts/fc-001/validate');
    });
  });
});
