import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => {
  const mockPdmClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: { pdm: mockPdmClient },
    default: { pdm: mockPdmClient },
  };
});

describe('PDM Module API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bomApi', () => {
    it('listVersions should call GET /bom-versions', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.listVersions();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-versions');
    });

    it('getVersion should call GET /bom-versions/:id', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.getVersion('bom-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-versions/bom-001');
    });

    it('createVersion should call POST /bom-versions with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      const data = { bom_no: 'BOM-001', name: 'BOM A', product_id: 'prod-001', version: '1.0' };
      await bomApi.createVersion(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-versions', data);
    });

    it('updateVersion should call PUT /bom-versions/:id with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      const data = { name: 'Updated BOM', status: 'active' };
      await bomApi.updateVersion('bom-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/bom-versions/bom-001', data);
    });

    it('deleteVersion should call DELETE /bom-versions/:id', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.deleteVersion('bom-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/bom-versions/bom-001');
    });

    it('activateVersion should call POST /bom-versions/:id/activate', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.activateVersion('bom-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-versions/bom-001/activate', {});
    });

    it('archiveVersion should call POST /bom-versions/:id/archive', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.archiveVersion('bom-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-versions/bom-001/archive', {});
    });

    it('listItems should call GET /bom-items with bom_version_id param', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.listItems('bom-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-items?bom_version_id=bom-001');
    });

    it('listItems should call GET /bom-items without params', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.listItems();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-items');
    });

    it('getItem should call GET /bom-items/:id', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.getItem('item-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-items/item-001');
    });

    it('createItem should call POST /bom-items with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      const data = {
        bom_version_id: 'bom-001',
        level: 1,
        item_no: '001',
        part_number: 'PART-001',
        part_name: 'Part A',
        quantity: 10,
        unit: 'pcs',
      };
      await bomApi.createItem(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-items', data);
    });

    it('updateItem should call PUT /bom-items/:id with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      const data = { part_name: 'Updated Part', quantity: 20 };
      await bomApi.updateItem('item-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/bom-items/item-001', data);
    });

    it('deleteItem should call DELETE /bom-items/:id', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.deleteItem('item-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/bom-items/item-001');
    });

    it('batchCreateItems should call POST /bom-versions/:bomVersionId/items/batch with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      const items = [
        {
          bom_version_id: 'bom-001',
          level: 1,
          item_no: '001',
          part_number: 'PART-001',
          part_name: 'Part A',
          quantity: 10,
          unit: 'pcs',
        },
      ];
      await bomApi.batchCreateItems('bom-001', items as unknown as Record<string, unknown>[]);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-versions/bom-001/items/batch', {
        items,
      });
    });

    it('compareVersions should call POST /bom-compare with data', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.compareVersions('bom-a', 'bom-b');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/bom-compare', {
        bom_version_a_id: 'bom-a',
        bom_version_b_id: 'bom-b',
      });
    });

    it('getComparison should call GET /bom-compare/:id', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.getComparison('comp-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-compare/comp-001');
    });

    it('listComparisons should call GET /bom-compare', async () => {
      const { bomApi } = await import('../pdm/bom');
      await bomApi.listComparisons();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/bom-compare');
    });
  });

  describe('projectApi', () => {
    it('list should call GET /projects', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.list();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/projects');
    });

    it('get should call GET /projects/:id', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.get('proj-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('create should call POST /projects with data', async () => {
      const { projectApi } = await import('../pdm/project');
      const data = { project_no: 'PROJ-001', name: 'Project A', status: 'planning' };
      await projectApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/projects', data);
    });

    it('update should call PUT /projects/:id with data', async () => {
      const { projectApi } = await import('../pdm/project');
      const data = { name: 'Updated Project', status: 'active' };
      await projectApi.update('proj-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/projects/proj-001', data);
    });

    it('delete should call DELETE /projects/:id', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.delete('proj-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/projects/proj-001');
    });

    it('updateStatus should call PUT /projects/:id/status with data', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.updateStatus('proj-001', 'completed');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/projects/proj-001/status', {
        status: 'completed',
      });
    });

    it('updatePhase should call PUT /projects/:id/phase with data', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.updatePhase('proj-001', 'execution');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/projects/proj-001/phase', {
        phase: 'execution',
      });
    });

    it('listMembers should call GET /projects/:projectId/members', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.listMembers('proj-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/projects/proj-001/members');
    });

    it('addMember should call POST /projects/:projectId/members with data', async () => {
      const { projectApi } = await import('../pdm/project');
      const data = { project_id: 'proj-001', user_id: 'user-001', role: 'developer' as const };
      await projectApi.addMember(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/projects/proj-001/members', {
        user_id: 'user-001',
        role: 'developer',
      });
    });

    it('removeMember should call DELETE /projects/:projectId/members/:userId', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.removeMember('proj-001', 'user-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/projects/proj-001/members/user-001');
    });

    it('updateMemberRole should call PUT /projects/:projectId/members/:userId with data', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.updateMemberRole('proj-001', 'user-001', 'manager');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/projects/proj-001/members/user-001', {
        role: 'manager',
      });
    });

    it('listPhases should call GET /projects/:projectId/phases', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.listPhases('proj-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/projects/proj-001/phases');
    });

    it('createPhase should call POST /projects/:projectId/phases with data', async () => {
      const { projectApi } = await import('../pdm/project');
      const data = { project_id: 'proj-001', phase: 'planning', name: 'Planning Phase' };
      await projectApi.createPhase(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/projects/proj-001/phases', data);
    });

    it('updatePhaseById should call PUT /projects/:projectId/phases/:phaseId with data', async () => {
      const { projectApi } = await import('../pdm/project');
      const data = { name: 'Updated Phase', status: 'in_progress' as const };
      await projectApi.updatePhaseById('proj-001', 'phase-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/projects/proj-001/phases/phase-001', data);
    });

    it('deletePhase should call DELETE /projects/:projectId/phases/:phaseId', async () => {
      const { projectApi } = await import('../pdm/project');
      await projectApi.deletePhase('proj-001', 'phase-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/projects/proj-001/phases/phase-001');
    });
  });

  describe('documentApi', () => {
    it('list should call GET /documents with params', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.list({ type: 'specification', status: 'approved' });
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/documents', {
        params: { type: 'specification', status: 'approved' },
      });
    });

    it('search should call POST /documents/search with data', async () => {
      const { documentApi } = await import('../pdm/document');
      const data = { keyword: 'test', type: 'specification' };
      await documentApi.search(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/documents/search', data);
    });

    it('get should call GET /documents/:id', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.get('doc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/documents/doc-001');
    });

    it('create should call POST /documents with data', async () => {
      const { documentApi } = await import('../pdm/document');
      const data = { document_no: 'DOC-001', name: 'Document A', type: 'specification' };
      await documentApi.create(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/documents', data);
    });

    it('update should call PUT /documents/:id with data', async () => {
      const { documentApi } = await import('../pdm/document');
      const data = { name: 'Updated Document', status: 'approved' };
      await documentApi.update('doc-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/documents/doc-001', data);
    });

    it('delete should call DELETE /documents/:id', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.delete('doc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/documents/doc-001');
    });

    it('updateStatus should call PUT /documents/:id/status with data', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.updateStatus('doc-001', 'published');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/documents/doc-001/status', {
        status: 'published',
      });
    });

    it('listVersions should call GET /documents/:documentId/versions', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.listVersions('doc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/documents/doc-001/versions');
    });

    it('getVersion should call GET /documents/:documentId/versions/:versionId', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.getVersion('doc-001', 'ver-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/documents/doc-001/versions/ver-001');
    });

    it('createVersion should call POST /documents/:documentId/versions with data', async () => {
      const { documentApi } = await import('../pdm/document');
      const data = {
        document_id: 'doc-001',
        version_number: '1.0',
        title: 'Version 1.0',
        changes: ['Initial version'],
      };
      await documentApi.createVersion(data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/documents/doc-001/versions', data);
    });

    it('updateVersion should call PUT /documents/:documentId/versions/:versionId with data', async () => {
      const { documentApi } = await import('../pdm/document');
      const data = { title: 'Updated Version', changes: ['Updated content'] };
      await documentApi.updateVersion('doc-001', 'ver-001', data);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/documents/doc-001/versions/ver-001', data);
    });

    it('deleteVersion should call DELETE /documents/:documentId/versions/:versionId', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.deleteVersion('doc-001', 'ver-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/documents/doc-001/versions/ver-001');
    });

    it('publishVersion should call POST /documents/:documentId/versions/:versionId/publish', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.publishVersion('doc-001', 'ver-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith(
        '/documents/doc-001/versions/ver-001/publish',
        {}
      );
    });

    it('downloadVersion should call GET /documents/:documentId/versions/:versionId/download', async () => {
      const { documentApi } = await import('../pdm/document');
      await documentApi.downloadVersion('doc-001', 'ver-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith(
        '/documents/doc-001/versions/ver-001/download'
      );
    });
  });

  describe('pdmApi (from index)', () => {
    it('listProcesses should call GET /production-processes', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listProcesses();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-processes');
    });

    it('getProcess should call GET /production-processes/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getProcess('proc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-processes/proc-001');
    });

    it('createProcess should call POST /production-processes with data', async () => {
      const { pdmApi } = await import('../pdm');
      const data = { process_no: 'PROC-001', name: 'Process A', version: '1.0', status: 'active' };
      await pdmApi.createProcess(data as unknown as Record<string, unknown>);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.post).toHaveBeenCalledWith('/production-processes', data);
    });

    it('updateProcess should call PUT /production-processes/:id with data', async () => {
      const { pdmApi } = await import('../pdm');
      const data = { name: 'Updated Process', status: 'active' };
      await pdmApi.updateProcess('proc-001', data as unknown as Record<string, unknown>);
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.put).toHaveBeenCalledWith('/production-processes/proc-001', data);
    });

    it('deleteProcess should call DELETE /production-processes/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.deleteProcess('proc-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.delete).toHaveBeenCalledWith('/production-processes/proc-001');
    });

    it('listFormulas should call GET /production-formulas', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listFormulas();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-formulas');
    });

    it('getFormula should call GET /production-formulas/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getFormula('formula-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-formulas/formula-001');
    });

    it('listBatches should call GET /production-batches', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listBatches();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-batches');
    });

    it('getBatch should call GET /production-batches/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getBatch('batch-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/production-batches/batch-001');
    });

    it('getStatistics should call GET /statistics', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getStatistics();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/statistics');
    });

    it('listProducts should call GET /products', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listProducts();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/products');
    });

    it('getProduct should call GET /products/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getProduct('prod-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/products/prod-001');
    });

    it('listMaterials should call GET /materials', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listMaterials();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/materials');
    });

    it('getMaterial should call GET /materials/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getMaterial('mat-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/materials/mat-001');
    });

    it('listChangeOrders should call GET /change-notices', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.listChangeOrders();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/change-notices');
    });

    it('getChangeOrder should call GET /change-notices/:id', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.getChangeOrder('co-001');
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/change-notices/co-001');
    });

    it('health should call GET /health', async () => {
      const { pdmApi } = await import('../pdm');
      await pdmApi.health();
      const { apiClient } = await import('../client');
      expect(apiClient.pdm.get).toHaveBeenCalledWith('/health');
    });
  });
});
