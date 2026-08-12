import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockCrmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { crm: mockCrmClient },
    default: { crm: mockCrmClient },
  };
});

describe('CRM RFM API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rfmApi', () => {
    it('analyze should call POST /rfm/analyze', async () => {
      const { rfmApi } = await import('../crm/rfm');
      const { apiClient } = await import('../client');
      (apiClient.crm.post as vi.Mock).mockResolvedValue({ data: [] });
      await rfmApi.analyze({
        reference_date: '2026-08-12',
        period_days: 365,
        r_weights: [1.0],
        f_weights: [1.0],
        m_weights: [1.0],
      });
      expect(apiClient.crm.post).toHaveBeenCalledWith('/rfm/analyze', {
        reference_date: '2026-08-12',
        period_days: 365,
        r_weights: [1.0],
        f_weights: [1.0],
        m_weights: [1.0],
      });
    });

    it('analyze should call POST /rfm/analyze with minimal config', async () => {
      const { rfmApi } = await import('../crm/rfm');
      const { apiClient } = await import('../client');
      (apiClient.crm.post as vi.Mock).mockResolvedValue({ data: [] });
      await rfmApi.analyze({ period_days: 90 });
      expect(apiClient.crm.post).toHaveBeenCalledWith('/rfm/analyze', { period_days: 90 });
    });

    it('getSegments should call GET /rfm/segments', async () => {
      const { rfmApi } = await import('../crm/rfm');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await rfmApi.getSegments();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/rfm/segments');
    });

    it('getCustomerRfm should call GET /rfm/customer/:id', async () => {
      const { rfmApi } = await import('../crm/rfm');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: {} });
      await rfmApi.getCustomerRfm('cust-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/rfm/customer/cust-001');
    });
  });
});

describe('CRM Forecast Algorithm API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('forecastApi', () => {
    it('predict should call POST /forecast/predict', async () => {
      const { forecastApi } = await import('../crm/forecast');
      const { apiClient } = await import('../client');
      (apiClient.crm.post as vi.Mock).mockResolvedValue({ data: {} });
      await forecastApi.predict({
        method: 'moving_average',
        history_data: [10, 20, 30, 40, 50],
        forecast_periods: 3,
        window_size: 3,
      });
      expect(apiClient.crm.post).toHaveBeenCalledWith('/forecast/predict', {
        method: 'moving_average',
        history_data: [10, 20, 30, 40, 50],
        forecast_periods: 3,
        window_size: 3,
      });
    });

    it('predict should call POST /forecast/predict with exponential_smoothing', async () => {
      const { forecastApi } = await import('../crm/forecast');
      const { apiClient } = await import('../client');
      (apiClient.crm.post as vi.Mock).mockResolvedValue({ data: {} });
      await forecastApi.predict({
        method: 'exponential_smoothing',
        history_data: [100, 200, 300],
        alpha: 0.3,
        forecast_periods: 2,
      });
      expect(apiClient.crm.post).toHaveBeenCalledWith('/forecast/predict', {
        method: 'exponential_smoothing',
        history_data: [100, 200, 300],
        alpha: 0.3,
        forecast_periods: 2,
      });
    });

    it('getMethods should call GET /forecast/methods', async () => {
      const { forecastApi } = await import('../crm/forecast');
      const { apiClient } = await import('../client');
      (apiClient.crm.get as vi.Mock).mockResolvedValue({ data: [] });
      await forecastApi.getMethods();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/forecast/methods');
    });

    it('evaluate should call POST /forecast/evaluate', async () => {
      const { forecastApi } = await import('../crm/forecast');
      const { apiClient } = await import('../client');
      (apiClient.crm.post as vi.Mock).mockResolvedValue({ data: {} });
      await forecastApi.evaluate({
        method: 'linear_regression',
        history_data: [10, 15, 20, 25, 30, 35, 40],
        forecast_periods: 3,
      });
      expect(apiClient.crm.post).toHaveBeenCalledWith('/forecast/evaluate', {
        method: 'linear_regression',
        history_data: [10, 15, 20, 25, 30, 35, 40],
        forecast_periods: 3,
      });
    });
  });
});
