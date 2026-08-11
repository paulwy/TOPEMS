import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockFinanceClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { finance: mockFinanceClient },
    default: { finance: mockFinanceClient },
  };
});

describe('Finance Risk V54 API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('riskV54Api', () => {
    it('getRiskDashboard should call GET /finance-v54/risk/dashboard', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockData = {
        total_indicators: 20,
        critical_count: 2,
        high_count: 5,
        medium_count: 8,
        low_count: 5,
        composite_score: 45.5,
        open_alerts: 3,
        by_category: { credit: 5, market: 3 },
      };
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: mockData });

      const result = await riskV54Api.getRiskDashboard();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/risk/dashboard');
      expect(result.data).toEqual(mockData);
    });

    it('getRiskAlerts should call GET /finance-v54/risk/alerts with params', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockAlerts = [
        {
          id: 'alert-1',
          indicator_id: 'ind-1',
          level: 'high',
          message: '指标超过阈值',
          entity: 'credit',
          created_at: '2026-08-01T00:00:00Z',
          acknowledged: false,
          resolved: false,
        },
      ];
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: mockAlerts });

      await riskV54Api.getRiskAlerts({ category: 'credit', entity: 'account-1' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/risk/alerts', {
        params: { category: 'credit', entity: 'account-1' },
      });
    });

    it('acknowledgeAlert should call PUT /finance-v54/risk/alerts/{id}/acknowledge', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockAlert = {
        id: 'alert-1',
        indicator_id: 'ind-1',
        level: 'high',
        message: 'test',
        entity: 'credit',
        created_at: '2026-08-01T00:00:00Z',
        acknowledged: true,
        resolved: false,
      };
      (apiClient.finance.put as vi.Mock).mockResolvedValue({ data: mockAlert });

      await riskV54Api.acknowledgeAlert('alert-1');
      expect(apiClient.finance.put).toHaveBeenCalledWith('/finance-v54/risk/alerts/alert-1/acknowledge');
    });

    it('resolveAlert should call PUT /finance-v54/risk/alerts/{id}/resolve', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockAlert = {
        id: 'alert-1',
        indicator_id: 'ind-1',
        level: 'high',
        message: 'test',
        entity: 'credit',
        created_at: '2026-08-01T00:00:00Z',
        acknowledged: true,
        resolved: true,
      };
      (apiClient.finance.put as vi.Mock).mockResolvedValue({ data: mockAlert });

      await riskV54Api.resolveAlert('alert-1');
      expect(apiClient.finance.put).toHaveBeenCalledWith('/finance-v54/risk/alerts/alert-1/resolve');
    });

    it('scoreTransaction should call POST /finance-v54/fraud/score', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockScore = {
        id: 'score-1',
        transaction_id: 'txn-1',
        score: 75.0,
        triggered_rules: ['rule-1'],
        risk_level: 'high',
        recommendation: 'review',
        scored_at: '2026-08-01T00:00:00Z',
      };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockScore });

      const txn = {
        id: 'txn-1',
        account_id: 'acc-1',
        amount: 10000,
        currency: 'CNY',
        merchant: 'test',
        location: 'Beijing',
        device_id: 'dev-1',
        timestamp: '2026-08-01T00:00:00Z',
      };
      await riskV54Api.scoreTransaction({ transaction: txn });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v54/fraud/score', { transaction: txn });
    });

    it('getFraudRules should call GET /finance-v54/fraud/rules', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockRules = [
        { id: 'rule-1', name: '高速交易', rule_type: 'velocity', condition: 'count > 5', threshold: 5, enabled: true },
      ];
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: mockRules });

      await riskV54Api.getFraudRules();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/fraud/rules');
    });

    it('updateFraudRule should call PUT /finance-v54/fraud/rules/{id}', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockRule = { id: 'rule-1', name: 'updated', rule_type: 'velocity', condition: 'count > 10', threshold: 10, enabled: true };
      (apiClient.finance.put as vi.Mock).mockResolvedValue({ data: mockRule });

      await riskV54Api.updateFraudRule('rule-1', { threshold: 10 });
      expect(apiClient.finance.put).toHaveBeenCalledWith('/finance-v54/fraud/rules/rule-1', { threshold: 10 });
    });

    it('getFraudScore should call GET /finance-v54/fraud/scores/{transaction_id}', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockScore = {
        id: 'score-1', transaction_id: 'txn-1', score: 50.0,
        triggered_rules: [], risk_level: 'medium', recommendation: 'review',
        scored_at: '2026-08-01T00:00:00Z',
      };
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: mockScore });

      await riskV54Api.getFraudScore('txn-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/fraud/scores/txn-1');
    });

    it('reviewEntity should call POST /finance-v54/compliance/review', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockResults = [
        { id: 'res-1', entity_type: 'voucher', entity_id: 'v-1', rule_id: 'rule-1', passed: true, details: {}, reviewed_at: '2026-08-01T00:00:00Z', reviewer: 'admin' },
      ];
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockResults });

      await riskV54Api.reviewEntity({ entity_type: 'voucher', entity_id: 'v-1' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v54/compliance/review', { entity_type: 'voucher', entity_id: 'v-1' });
    });

    it('getReviewResults should call GET /finance-v54/compliance/results', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV54Api.getReviewResults({ entity_type: 'voucher' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/compliance/results', { params: { entity_type: 'voucher' } });
    });

    it('getComplianceStatus should call GET /finance-v54/compliance/status/{entity_type}/{entity_id}', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV54Api.getComplianceStatus('voucher', 'v-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/compliance/status/voucher/v-1');
    });

    it('createWorkflow should call POST /finance-v54/compliance/workflow', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockWf = { id: 'wf-1', entity_type: 'voucher', entity_id: 'v-1', status: 'pending', assigned_to: 'admin', steps: [], created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockWf });

      await riskV54Api.createWorkflow({ entity_type: 'voucher', entity_id: 'v-1', steps: ['step1'] });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v54/compliance/workflow', { entity_type: 'voucher', entity_id: 'v-1', steps: ['step1'] });
    });

    it('advanceWorkflow should call PUT /finance-v54/compliance/workflow/{id}/advance', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockWf = { id: 'wf-1', entity_type: 'voucher', entity_id: 'v-1', status: 'in_progress', assigned_to: 'admin', steps: [], created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' };
      (apiClient.finance.put as vi.Mock).mockResolvedValue({ data: mockWf });

      await riskV54Api.advanceWorkflow('wf-1');
      expect(apiClient.finance.put).toHaveBeenCalledWith('/finance-v54/compliance/workflow/wf-1/advance');
    });

    it('getComplianceReport should call GET /finance-v54/compliance/report', async () => {
      const { riskV54Api } = await import('../finance/riskV54');
      const { apiClient } = await import('../client');
      const mockReport = {
        entity_type: 'all', entity_id: 'all', total_rules: 10, passed_rules: 8, failed_rules: 2,
        pass_rate: 80.0, critical_issues: [], high_issues: ['issue1'], medium_issues: [], low_issues: [],
        generated_at: '2026-08-01T00:00:00Z',
      };
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: mockReport });

      await riskV54Api.getComplianceReport({ entity_type: 'voucher' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v54/compliance/report', { params: { entity_type: 'voucher' } });
    });

    it('should be importable as default', async () => {
      const mod = await import('../finance/riskV54');
      expect(mod.riskV54Api).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.riskV54Api);
    });
  });
});

describe('Finance Risk V59 API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('riskV59Api', () => {
    it('analyzeTransaction should call POST /finance-v59/fraud/analyze', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockDecision = {
        id: 'dec-1', transaction_id: 'txn-1', risk_level: 'low', action: 'approve',
        reason: '交易正常', signals: null, decided_at: '2026-08-01T00:00:00Z',
      };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockDecision });

      await riskV59Api.analyzeTransaction({ transaction_id: 'txn-1', amount: 100 });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/fraud/analyze', { transaction_id: 'txn-1', amount: 100 });
    });

    it('getFraudDecision should call GET /finance-v59/fraud/decision/{id}', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getFraudDecision('dec-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/fraud/decision/dec-1');
    });

    it('getSignals should call GET /finance-v59/fraud/signals', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.getSignals({ signal_type: 'velocity' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/fraud/signals', { params: { signal_type: 'velocity' } });
    });

    it('createDevice should call POST /finance-v59/fraud/device', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockDevice = { id: 'dev-1', device_id: 'd-1', fingerprint: 'fp-1', trust_score: 1.0, last_seen: '2026-08-01T00:00:00Z', ip_history: null };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockDevice });

      await riskV59Api.createDevice({ device_id: 'd-1', fingerprint: 'fp-1' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/fraud/device', { device_id: 'd-1', fingerprint: 'fp-1' });
    });

    it('getDevice should call GET /finance-v59/fraud/device/{id}', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getDevice('dev-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/fraud/device/dev-1');
    });

    it('listBlockedDevices should call GET /finance-v59/fraud/blocked', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.listBlockedDevices();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/fraud/blocked');
    });

    it('addRule should call POST /finance-v59/fraud/rule', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockRule = { id: 'rule-1', name: 'test', signal_type: 'velocity', threshold: 0.5, enabled: true };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockRule });

      await riskV59Api.addRule({ name: 'test', signal_type: 'velocity' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/fraud/rule', { name: 'test', signal_type: 'velocity' });
    });

    it('getRules should call GET /finance-v59/fraud/rules', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.getRules();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/fraud/rules');
    });

    it('calculateScore should call POST /finance-v59/credit/score', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockProfile = { id: 'prof-1', entity_id: 'e-1', score: 750, grade: 'AAA', factors: null, updated_at: '2026-08-01T00:00:00Z' };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockProfile });

      await riskV59Api.calculateScore({ entity_id: 'e-1' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/credit/score', { entity_id: 'e-1' });
    });

    it('getCreditProfile should call GET /finance-v59/credit/profile/{id}', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getCreditProfile('e-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/credit/profile/e-1');
    });

    it('getScoringModels should call GET /finance-v59/credit/models', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.getScoringModels();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/credit/models');
    });

    it('createModel should call POST /finance-v59/credit/model', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockModel = { id: 'model-1', name: 'test-model', version: '1.0', features: null, weights: null, accuracy: 0.8, status: 'active' };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockModel });

      await riskV59Api.createModel({ name: 'test-model' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/credit/model', { name: 'test-model' });
    });

    it('updateModel should call PUT /finance-v59/credit/model/{id}', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.put as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.updateModel('model-1', { status: 'inactive' });
      expect(apiClient.finance.put).toHaveBeenCalledWith('/finance-v59/credit/model/model-1', { status: 'inactive' });
    });

    it('getScoreFactors should call GET /finance-v59/credit/factors', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.getScoreFactors({ entity_id: 'e-1' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/credit/factors', { params: { entity_id: 'e-1' } });
    });

    it('getModelComparison should call GET /finance-v59/credit/compare', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getModelComparison({ model_ids: ['model-1', 'model-2'] });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/credit/compare', { params: { model_ids: ['model-1', 'model-2'] } });
    });

    it('bulkScore should call POST /finance-v59/credit/bulk', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.bulkScore({ entity_ids: ['e-1', 'e-2'] });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/credit/bulk', { entity_ids: ['e-1', 'e-2'] });
    });

    it('createScenario should call POST /finance-v59/stress/scenario', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockScenario = { id: 'sc-1', name: '压力测试', scenario_type: 'market', severity: 'medium', assumptions: null, created_at: '2026-08-01T00:00:00Z' };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockScenario });

      await riskV59Api.createScenario({ name: '压力测试' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/stress/scenario', { name: '压力测试' });
    });

    it('runStressTest should call POST /finance-v59/stress/run', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      const mockResult = { id: 'res-1', scenario_id: 'sc-1', entity_id: 'e-1', impact_value: 500000, capital_adequacy: 0.15, liquidity_ratio: 0.2, pass_fail: true, details: null };
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: mockResult });

      await riskV59Api.runStressTest({ scenario_id: 'sc-1', entity_id: 'e-1' });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/stress/run', { scenario_id: 'sc-1', entity_id: 'e-1' });
    });

    it('getTestResult should call GET /finance-v59/stress/result/{id}', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getTestResult('res-1');
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/stress/result/res-1');
    });

    it('listScenarios should call GET /finance-v59/stress/scenarios', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.listScenarios();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/stress/scenarios');
    });

    it('compareScenarios should call POST /finance-v59/stress/compare', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.post as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.compareScenarios({ scenario_ids: ['sc-1', 'sc-2'] });
      expect(apiClient.finance.post).toHaveBeenCalledWith('/finance-v59/stress/compare', { scenario_ids: ['sc-1', 'sc-2'] });
    });

    it('getScenarioParameters should call GET /finance-v59/stress/params', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: [] });

      await riskV59Api.getScenarioParameters({ scenario_id: 'sc-1' });
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/stress/params', { params: { scenario_id: 'sc-1' } });
    });

    it('getTestSummary should call GET /finance-v59/stress/summary', async () => {
      const { riskV59Api } = await import('../finance/riskV59');
      const { apiClient } = await import('../client');
      (apiClient.finance.get as vi.Mock).mockResolvedValue({ data: {} });

      await riskV59Api.getTestSummary();
      expect(apiClient.finance.get).toHaveBeenCalledWith('/finance-v59/stress/summary');
    });

    it('should be importable as default', async () => {
      const mod = await import('../finance/riskV59');
      expect(mod.riskV59Api).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(mod.default).toBe(mod.riskV59Api);
    });
  });
});