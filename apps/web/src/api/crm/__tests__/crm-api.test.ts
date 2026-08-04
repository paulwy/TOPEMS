import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../../client';
import {
  customerApi,
  tagApi,
  contactApi,
  opportunityApi,
  interactionApi,
  customerScoringApi,
  salesForecastApi,
  billingApi,
  customerSegmentationApi,
  customerRecommendationApi,
} from '..';

vi.mock('../../client', () => ({
  apiClient: {
    crm: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('CRM Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('customerApi', () => {
    it('list should call GET /customers with params', async () => {
      await customerApi.list({ page: 1, pagesize: 10, status: 'active' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customers', {
        params: { page: 1, pagesize: 10, status: 'active' },
      });
    });

    it('create should call POST /customers with data', async () => {
      const data = { name: 'Test Customer', email: 'test@example.com' };
      await customerApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customers', data);
    });

    it('get should call GET /customers/:id', async () => {
      await customerApi.get('cust-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customers/cust-001');
    });

    it('update should call PUT /customers/:id with data', async () => {
      const data = { name: 'Updated Customer' };
      await customerApi.update('cust-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/customers/cust-001', data);
    });

    it('delete should call DELETE /customers/:id', async () => {
      await customerApi.delete('cust-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/customers/cust-001');
    });

    it('batchDelete should call POST /customers/batch-delete with ids', async () => {
      await customerApi.batchDelete(['cust-001', 'cust-002']);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customers/batch-delete', {
        ids: ['cust-001', 'cust-002'],
      });
    });

    it('getTags should call GET /customers/:id/tags', async () => {
      await customerApi.getTags('cust-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customers/cust-001/tags');
    });

    it('addTag should call POST /customers/:id/tags with tag_id', async () => {
      await customerApi.addTag('cust-001', 'tag-001');
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customers/cust-001/tags', {
        tag_id: 'tag-001',
      });
    });

    it('removeTag should call DELETE /customers/:id/tags/:tagId', async () => {
      await customerApi.removeTag('cust-001', 'tag-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/customers/cust-001/tags/tag-001');
    });
  });

  describe('tagApi', () => {
    it('list should call GET /tags with params', async () => {
      await tagApi.list({ page: 1, pagesize: 20 });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/tags', {
        params: { page: 1, pagesize: 20 },
      });
    });

    it('create should call POST /tags with data', async () => {
      const data = { name: 'VIP', color: 'yellow.400' };
      await tagApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/tags', data);
    });

    it('get should call GET /tags/:id', async () => {
      await tagApi.get('tag-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/tags/tag-001');
    });

    it('update should call PUT /tags/:id with data', async () => {
      const data = { name: 'VIP Gold' };
      await tagApi.update('tag-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/tags/tag-001', data);
    });

    it('delete should call DELETE /tags/:id', async () => {
      await tagApi.delete('tag-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/tags/tag-001');
    });

    it('getTaggedCustomers should call GET /tags/:id/customers', async () => {
      await tagApi.getTaggedCustomers('tag-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/tags/tag-001/customers');
    });
  });

  describe('contactApi', () => {
    it('list should call GET /contacts with params', async () => {
      await contactApi.list({ page: 1, pagesize: 10, customer_id: 'cust-001' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/contacts', {
        params: { page: 1, pagesize: 10, customer_id: 'cust-001' },
      });
    });

    it('create should call POST /contacts with data', async () => {
      const data = { first_name: 'John', last_name: 'Doe', email: 'john@example.com' };
      await contactApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/contacts', data);
    });

    it('get should call GET /contacts/:id', async () => {
      await contactApi.get('cont-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/contacts/cont-001');
    });

    it('update should call PUT /contacts/:id with data', async () => {
      const data = { email: 'new@example.com' };
      await contactApi.update('cont-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/contacts/cont-001', data);
    });

    it('delete should call DELETE /contacts/:id', async () => {
      await contactApi.delete('cont-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/contacts/cont-001');
    });

    it('batchDelete should call POST /contacts/batch-delete with ids', async () => {
      await contactApi.batchDelete(['cont-001', 'cont-002']);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/contacts/batch-delete', {
        ids: ['cont-001', 'cont-002'],
      });
    });
  });

  describe('opportunityApi', () => {
    it('list should call GET /opportunities with params', async () => {
      await opportunityApi.list({ page: 1, pagesize: 10, stage: 'proposal' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/opportunities', {
        params: { page: 1, pagesize: 10, stage: 'proposal' },
      });
    });

    it('create should call POST /opportunities with data', async () => {
      const data = { name: 'New Deal', value: 100000, probability: 50 };
      await opportunityApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/opportunities', data);
    });

    it('get should call GET /opportunities/:id', async () => {
      await opportunityApi.get('opp-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/opportunities/opp-001');
    });

    it('update should call PUT /opportunities/:id with data', async () => {
      const data = { stage: 'negotiation' };
      await opportunityApi.update('opp-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/opportunities/opp-001', data);
    });

    it('delete should call DELETE /opportunities/:id', async () => {
      await opportunityApi.delete('opp-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/opportunities/opp-001');
    });

    it('batchDelete should call POST /opportunities/batch-delete with ids', async () => {
      await opportunityApi.batchDelete(['opp-001', 'opp-002']);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/opportunities/batch-delete', {
        ids: ['opp-001', 'opp-002'],
      });
    });

    it('getFunnel should call GET /opportunities/funnel', async () => {
      await opportunityApi.getFunnel();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/opportunities/funnel');
    });

    it('getStats should call GET /opportunities/stats', async () => {
      await opportunityApi.getStats();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/opportunities/stats');
    });

    it('getForecast should call GET /opportunities/forecast with params', async () => {
      await opportunityApi.getForecast({ months: 3 });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/opportunities/forecast', {
        params: { months: 3 },
      });
    });
  });

  describe('interactionApi', () => {
    it('list should call GET /interactions with params', async () => {
      await interactionApi.list({ page: 1, pagesize: 10, customer_id: 'cust-001' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/interactions', {
        params: { page: 1, pagesize: 10, customer_id: 'cust-001' },
      });
    });

    it('create should call POST /interactions with data', async () => {
      const data = { type: 'call', subject: 'Follow up', content: 'Checked in with customer' };
      await interactionApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/interactions', data);
    });

    it('get should call GET /interactions/:id', async () => {
      await interactionApi.get('int-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/interactions/int-001');
    });

    it('update should call PUT /interactions/:id with data', async () => {
      const data = { status: 'completed' };
      await interactionApi.update('int-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/interactions/int-001', data);
    });

    it('delete should call DELETE /interactions/:id', async () => {
      await interactionApi.delete('int-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/interactions/int-001');
    });

    it('batchDelete should call POST /interactions/batch-delete with ids', async () => {
      await interactionApi.batchDelete(['int-001', 'int-002']);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/interactions/batch-delete', {
        ids: ['int-001', 'int-002'],
      });
    });
  });

  describe('customerScoringApi', () => {
    it('list should call GET /customer-scoring with params', async () => {
      await customerScoringApi.list({ page: 1, pagesize: 10, scorelevel: 'high' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customer-scoring', {
        params: { page: 1, pagesize: 10, scorelevel: 'high' },
      });
    });

    it('get should call GET /customer-scoring/:id', async () => {
      await customerScoringApi.get('score-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customer-scoring/score-001');
    });

    it('create should call POST /customer-scoring with data', async () => {
      const data = { customer_id: 'cust-001', score: 85 };
      await customerScoringApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customer-scoring', data);
    });

    it('update should call PUT /customer-scoring/:id with data', async () => {
      const data = { score: 90 };
      await customerScoringApi.update('score-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/customer-scoring/score-001', data);
    });

    it('delete should call DELETE /customer-scoring/:id', async () => {
      await customerScoringApi.delete('score-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/customer-scoring/score-001');
    });

    it('calculateBatch should call POST /customer-scoring/calculate with customer_ids', async () => {
      await customerScoringApi.calculateBatch(['cust-001', 'cust-002']);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/customer-scoring/calculate', {
        customer_ids: ['cust-001', 'cust-002'],
      });
    });
  });

  describe('salesForecastApi', () => {
    it('list should call GET /sales-forecast with params', async () => {
      await salesForecastApi.list({ page: 1, pagesize: 10, period_type: 'monthly' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-forecast', {
        params: { page: 1, pagesize: 10, period_type: 'monthly' },
      });
    });

    it('get should call GET /sales-forecast/:id', async () => {
      await salesForecastApi.get('forecast-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/sales-forecast/forecast-001');
    });

    it('create should call POST /sales-forecast with data', async () => {
      const data = { period_type: 'monthly', period: '2024-01' };
      await salesForecastApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/sales-forecast', data);
    });

    it('update should call PUT /sales-forecast/:id with data', async () => {
      const data = { predicted_amount: 500000 };
      await salesForecastApi.update('forecast-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/sales-forecast/forecast-001', data);
    });

    it('delete should call DELETE /sales-forecast/:id', async () => {
      await salesForecastApi.delete('forecast-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/sales-forecast/forecast-001');
    });

    it('generate should call POST /sales-forecast/generate with data', async () => {
      const data = { period_type: 'monthly', period: '2024-02' };
      await salesForecastApi.generate(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/sales-forecast/generate', data);
    });
  });

  describe('billingApi', () => {
    it('list should call GET /billing with params', async () => {
      await billingApi.list({ page: 1, pagesize: 10, status: 'overdue' });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/billing', {
        params: { page: 1, pagesize: 10, status: 'overdue' },
      });
    });

    it('get should call GET /billing/:id', async () => {
      await billingApi.get('bill-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/billing/bill-001');
    });

    it('create should call POST /billing with data', async () => {
      const data = {
        customer_id: 'cust-001',
        amount: 1000,
        due_date: '2024-02-01',
        items: [{ name: 'Service', quantity: 1, unit_price: 1000, amount: 1000 }],
      };
      await billingApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/billing', data);
    });

    it('update should call PUT /billing/:id with data', async () => {
      const data = { amount: 1500 };
      await billingApi.update('bill-001', data);
      expect(apiClient.crm.put).toHaveBeenCalledWith('/billing/bill-001', data);
    });

    it('delete should call DELETE /billing/:id', async () => {
      await billingApi.delete('bill-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/billing/bill-001');
    });

    it('markPaid should call POST /billing/:id/paid', async () => {
      await billingApi.markPaid('bill-001');
      expect(apiClient.crm.post).toHaveBeenCalledWith('/billing/bill-001/paid');
    });

    it('sendNotification should call POST /billing/:id/notify', async () => {
      await billingApi.sendNotification('bill-001');
      expect(apiClient.crm.post).toHaveBeenCalledWith('/billing/bill-001/notify');
    });
  });

  describe('customerSegmentationApi', () => {
    it('list should call GET /segments with params', async () => {
      await customerSegmentationApi.list({ page: 1, pagesize: 10 });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/segments', {
        params: { page: 1, pagesize: 10 },
      });
    });

    it('create should call POST /segments with data', async () => {
      const data = { name: 'VIP Customers', criteria: { score_min: 80 } };
      await customerSegmentationApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/segments', data);
    });

    it('get should call GET /segments/:id', async () => {
      await customerSegmentationApi.get('seg-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/segments/seg-001');
    });

    it('delete should call DELETE /segments/:id', async () => {
      await customerSegmentationApi.delete('seg-001');
      expect(apiClient.crm.delete).toHaveBeenCalledWith('/segments/seg-001');
    });

    it('getCustomers should call GET /segments/:id/customers with params', async () => {
      await customerSegmentationApi.getCustomers('seg-001', { page: 1, pagesize: 20 });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/segments/seg-001/customers', {
        params: { page: 1, pagesize: 20 },
      });
    });

    it('autoSegment should call GET /segments/auto', async () => {
      await customerSegmentationApi.autoSegment();
      expect(apiClient.crm.get).toHaveBeenCalledWith('/segments/auto');
    });
  });

  describe('customerRecommendationApi', () => {
    it('list should call GET /recommendations with params', async () => {
      await customerRecommendationApi.list({
        page: 1,
        pagesize: 10,
        recommendation_type: 'product',
      });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/recommendations', {
        params: { page: 1, pagesize: 10, recommendation_type: 'product' },
      });
    });

    it('create should call POST /recommendations with data', async () => {
      const data = { customer_id: 'cust-001', recommendation_type: 'product', top_k: 5 };
      await customerRecommendationApi.create(data);
      expect(apiClient.crm.post).toHaveBeenCalledWith('/recommendations', data);
    });

    it('get should call GET /recommendations/:id', async () => {
      await customerRecommendationApi.get('rec-001');
      expect(apiClient.crm.get).toHaveBeenCalledWith('/recommendations/rec-001');
    });

    it('getCustomerRecommendations should call GET /customers/:id/recommendations with params', async () => {
      await customerRecommendationApi.getCustomerRecommendations('cust-001', {
        recommendation_type: 'service',
      });
      expect(apiClient.crm.get).toHaveBeenCalledWith('/customers/cust-001/recommendations', {
        params: { recommendation_type: 'service' },
      });
    });
  });
});
