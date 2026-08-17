import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiGovernanceApiV59, metadataApiV60 } from '../master';
import apiClient from '../client';

vi.mock('../client', () => ({
  default: {
    master: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('V145 masterData API bindings', () => {
  const mockClient = apiClient.master as {
    get: vi.Mock;
    post: vi.Mock;
    put: vi.Mock;
    delete: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== AI Governance V59 =====
  describe('aiGovernanceApiV59', () => {
    it('should analyze governance', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await aiGovernanceApiV59.analyze({ entity_type: 'customer', entity_id: 'c-1' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/governance/analyze', {
        entity_type: 'customer',
        entity_id: 'c-1',
      });
    });

    it('should get suggestions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await aiGovernanceApiV59.getSuggestions({ entity_type: 'customer' });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v59/governance/suggestions?entity_type=customer'
      );
    });

    it('should get entity suggestions', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await aiGovernanceApiV59.getEntitySuggestions('c-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v59/governance/entity/c-1');
    });

    it('should apply suggestion', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 's-1', status: 'applied' } });
      await aiGovernanceApiV59.applySuggestion('s-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/governance/apply/s-1', {});
    });

    it('should dismiss suggestion', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { dismissed: true } });
      await aiGovernanceApiV59.dismissSuggestion('s-1', 'Not relevant');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/governance/dismiss/s-1', {
        reason: 'Not relevant',
      });
    });

    it('should get models', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await aiGovernanceApiV59.getModels();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v59/governance/models');
    });

    it('should train model', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'm-1' } });
      await aiGovernanceApiV59.trainModel('m-1', { entity_type: 'customer', model_type: 'ml' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/governance/train/m-1', {
        entity_type: 'customer',
        model_type: 'ml',
      });
    });

    it('should create match rule', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'r-1' } });
      await aiGovernanceApiV59.createMatchRule({
        name: 'Customer match',
        source_type: 'customer',
        target_type: 'supplier',
        match_fields: [{ source: 'name', target: 'company_name', weight: 1 }],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/matching/rule', expect.any(Object));
    });

    it('should match entities', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: [] });
      await aiGovernanceApiV59.matchEntities({ source_type: 'customer', min_score: 0.8 });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/matching/entities', {
        source_type: 'customer',
        min_score: 0.8,
      });
    });

    it('should confirm match', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'mr-1' } });
      await aiGovernanceApiV59.confirmMatch('mr-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/matching/confirm/mr-1', {});
    });

    it('should reject match', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'mr-1' } });
      await aiGovernanceApiV59.rejectMatch('mr-1', 'Not a valid match');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/matching/reject/mr-1', {
        reason: 'Not a valid match',
      });
    });

    it('should get match stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_pairs: 100 } });
      await aiGovernanceApiV59.getMatchStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v59/matching/stats');
    });

    it('should create classifier', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'cl-1' } });
      await aiGovernanceApiV59.createClassifier({
        name: 'Product classifier',
        classifier_type: 'rule_based',
        entity_types: ['product'],
        categories: ['electronics', 'furniture'],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/classifier', expect.any(Object));
    });

    it('should classify entity', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { category: 'electronics' } });
      await aiGovernanceApiV59.classifyEntity('product', 'p-1');
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v59/classify/product/p-1', {});
    });

    it('should get classification stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_classified: 1000 } });
      await aiGovernanceApiV59.getClassificationStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v59/classification/stats');
    });
  });

  // ===== Metadata V60 =====
  describe('metadataApiV60', () => {
    it('should create metadata', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'm-1' } });
      await metadataApiV60.createMetadata({ name: 'orders', type: 'table' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/metadata', {
        name: 'orders',
        type: 'table',
      });
    });

    it('should get metadata', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { id: 'm-1' } });
      await metadataApiV60.getMetadata('m-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/metadata/m-1');
    });

    it('should list metadata', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await metadataApiV60.listMetadata({ type: 'table', page: 1, pageSize: 20 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v60/metadata?type=table&page=1&pagesize=20'
      );
    });

    it('should search metadata', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { items: [], total: 0 } });
      await metadataApiV60.searchMetadata({ query: 'order', page: 1, pageSize: 10 });
      expect(mockClient.get).toHaveBeenCalledWith(
        '/mdm-v60/metadata/search?q=order&page=1&pagesize=10'
      );
    });

    it('should update metadata', async () => {
      mockClient.put.mockResolvedValue({ success: true, data: { id: 'm-1' } });
      await metadataApiV60.updateMetadata('m-1', { description: 'Updated description' });
      expect(mockClient.put).toHaveBeenCalledWith('/mdm-v60/metadata/m-1', {
        description: 'Updated description',
      });
    });

    it('should delete metadata', async () => {
      mockClient.delete.mockResolvedValue({ success: true, data: { deleted: true } });
      await metadataApiV60.deleteMetadata('m-1');
      expect(mockClient.delete).toHaveBeenCalledWith('/mdm-v60/metadata/m-1');
    });

    it('should add attribute', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: {} });
      await metadataApiV60.addAttribute('m-1', { key: 'schema', value: 'public', type: 'string' });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/metadata/m-1/attribute', {
        key: 'schema',
        value: 'public',
        type: 'string',
      });
    });

    it('should get metadata stats', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total: 100 } });
      await metadataApiV60.getMetadataStats();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/metadata/stats');
    });

    it('should build lineage graph', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'g-1' } });
      await metadataApiV60.buildLineageGraph({ depth: 3 });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/lineage/graph', { depth: 3 });
    });

    it('should get upstream lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await metadataApiV60.getUpstream('m-1', { depth: 2 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lineage/m-1/upstream?depth=2');
    });

    it('should get downstream lineage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: [] });
      await metadataApiV60.getDownstream('m-1', { depth: 2 });
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lineage/m-1/downstream?depth=2');
    });

    it('should get lineage impact', async () => {
      mockClient.get.mockResolvedValue({
        success: true,
        data: { entity_id: 'm-1', risk_score: 0.8 },
      });
      await metadataApiV60.getLineageImpact('m-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lineage/m-1/impact');
    });

    it('should get lineage dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { total_entities: 100 } });
      await metadataApiV60.getLineageDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lineage/dashboard');
    });

    it('should get current lifecycle stage', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { stage: 'production' } });
      await metadataApiV60.getCurrentStage('m-1');
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lifecycle/m-1/stage');
    });

    it('should transition lifecycle stage', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { stage: 'testing' } });
      await metadataApiV60.transitionStage('m-1', {
        to_stage: 'testing',
        reason: 'Ready for testing',
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/lifecycle/m-1/transition', {
        to_stage: 'testing',
        reason: 'Ready for testing',
      });
    });

    it('should create lifecycle policy', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { id: 'p-1' } });
      await metadataApiV60.createPolicy({
        name: 'Table lifecycle',
        entity_type: 'table',
        stages: [
          { stage: 'design', order: 1 },
          { stage: 'production', order: 2 },
        ],
      });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/lifecycle/policy', expect.any(Object));
    });

    it('should auto transition lifecycle', async () => {
      mockClient.post.mockResolvedValue({ success: true, data: { transitions: 5, failures: 0 } });
      await metadataApiV60.autoTransition({ entity_type: 'table', dry_run: false });
      expect(mockClient.post).toHaveBeenCalledWith('/mdm-v60/lifecycle/auto-transition', {
        entity_type: 'table',
        dry_run: false,
      });
    });

    it('should get lifecycle dashboard', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { policies_count: 3 } });
      await metadataApiV60.getLifecycleDashboard();
      expect(mockClient.get).toHaveBeenCalledWith('/mdm-v60/lifecycle/dashboard');
    });
  });
});
