import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockTmsClient = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  };
  return {
    apiClient: { tms: mockTmsClient },
    default: { tms: mockTmsClient },
  };
});

describe('TMS Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('vehicleApi', () => {
    it('list should call GET /vehicles with params', async () => {
      const { vehicleApi } = await import('../tms/vehicle');
      await vehicleApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/vehicles', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /vehicles/:id', async () => {
      const { vehicleApi } = await import('../tms/vehicle');
      await vehicleApi.get('veh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/vehicles/veh-001');
    });

    it('create should call POST /vehicles with data', async () => {
      const { vehicleApi } = await import('../tms/vehicle');
      const data = { vehicle_no: 'V-001', plate_number: '京A12345', capacity: 10 };
      await vehicleApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/vehicles', data);
    });

    it('update should call PUT /vehicles/:id with data', async () => {
      const { vehicleApi } = await import('../tms/vehicle');
      const data = { plate_number: '京B67890' };
      await vehicleApi.update('veh-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.put).toHaveBeenCalledWith('/vehicles/veh-001', data);
    });

    it('delete should call DELETE /vehicles/:id', async () => {
      const { vehicleApi } = await import('../tms/vehicle');
      await vehicleApi.delete('veh-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.delete).toHaveBeenCalledWith('/vehicles/veh-001');
    });
  });

  describe('driverApi', () => {
    it('list should call GET /drivers with params', async () => {
      const { driverApi } = await import('../tms/driver');
      await driverApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/drivers', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /drivers/:id', async () => {
      const { driverApi } = await import('../tms/driver');
      await driverApi.get('drv-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/drivers/drv-001');
    });

    it('create should call POST /drivers with data', async () => {
      const { driverApi } = await import('../tms/driver');
      const data = { driver_no: 'D-001', name: '张三', phone: '13800138000' };
      await driverApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/drivers', data);
    });

    it('update should call PUT /drivers/:id with data', async () => {
      const { driverApi } = await import('../tms/driver');
      const data = { phone: '13900139000' };
      await driverApi.update('drv-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.put).toHaveBeenCalledWith('/drivers/drv-001', data);
    });

    it('delete should call DELETE /drivers/:id', async () => {
      const { driverApi } = await import('../tms/driver');
      await driverApi.delete('drv-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.delete).toHaveBeenCalledWith('/drivers/drv-001');
    });
  });

  describe('carrierApi', () => {
    it('list should call GET /carriers with params', async () => {
      const { carrierApi } = await import('../tms/carrier');
      await carrierApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/carriers', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /carriers/:id', async () => {
      const { carrierApi } = await import('../tms/carrier');
      await carrierApi.get('car-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/carriers/car-001');
    });

    it('create should call POST /carriers with data', async () => {
      const { carrierApi } = await import('../tms/carrier');
      const data = { carrier_no: 'C-001', name: '顺丰速运', contact_phone: '4008111111' };
      await carrierApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/carriers', data);
    });

    it('update should call PUT /carriers/:id with data', async () => {
      const { carrierApi } = await import('../tms/carrier');
      const data = { name: '更新承运商' };
      await carrierApi.update('car-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.put).toHaveBeenCalledWith('/carriers/car-001', data);
    });

    it('delete should call DELETE /carriers/:id', async () => {
      const { carrierApi } = await import('../tms/carrier');
      await carrierApi.delete('car-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.delete).toHaveBeenCalledWith('/carriers/car-001');
    });
  });

  describe('routeApi', () => {
    it('list should call GET /routes with params', async () => {
      const { routeApi } = await import('../tms/route');
      await routeApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/routes', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /routes/:id', async () => {
      const { routeApi } = await import('../tms/route');
      await routeApi.get('rt-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/routes/rt-001');
    });

    it('create should call POST /routes with data', async () => {
      const { routeApi } = await import('../tms/route');
      const data = { route_no: 'R-001', name: '北京到上海', distance_km: 1200 };
      await routeApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/routes', data);
    });

    it('update should call PUT /routes/:id with data', async () => {
      const { routeApi } = await import('../tms/route');
      const data = { name: '北京到广州' };
      await routeApi.update('rt-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.put).toHaveBeenCalledWith('/routes/rt-001', data);
    });

    it('delete should call DELETE /routes/:id', async () => {
      const { routeApi } = await import('../tms/route');
      await routeApi.delete('rt-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.delete).toHaveBeenCalledWith('/routes/rt-001');
    });
  });

  describe('shipmentApi', () => {
    it('list should call GET /shipments with params', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.list({ page: 1, pageSize: 10 });
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/shipments', {
        params: { page: 1, pageSize: 10 },
      });
    });

    it('get should call GET /shipments/:id', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.get('shp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.get).toHaveBeenCalledWith('/shipments/shp-001');
    });

    it('create should call POST /shipments with data', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      const data = { shipment_no: 'S-001', carrier_id: 'car-001', origin: '北京', destination: '上海' };
      await shipmentApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments', data);
    });

    it('update should call PUT /shipments/:id with data', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      const data = { freight_amount: 5000 };
      await shipmentApi.update('shp-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.tms.put).toHaveBeenCalledWith('/shipments/shp-001', data);
    });

    it('delete should call DELETE /shipments/:id', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.delete('shp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.delete).toHaveBeenCalledWith('/shipments/shp-001');
    });

    it('dispatch should call POST /shipments/:id/dispatch', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.dispatch('shp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/shp-001/dispatch');
    });

    it('arrive should call POST /shipments/:id/arrive', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.arrive('shp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/shp-001/arrive');
    });

    it('cancel should call POST /shipments/:id/cancel', async () => {
      const { shipmentApi } = await import('../tms/shipment');
      await shipmentApi.cancel('shp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.tms.post).toHaveBeenCalledWith('/shipments/shp-001/cancel');
    });
  });
});
