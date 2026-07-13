import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkflowDashboardPage from '../workflow/WorkflowDashboardPage';
import WorkflowDefinitionsPage from '../workflow/WorkflowDefinitionsPage';
import WorkflowInstancesPage from '../workflow/WorkflowInstancesPage';
import WorkflowApprovalsPage from '../workflow/WorkflowApprovalsPage';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore, useAuthStore } from '@/store';

vi.mock('@/api/workflow', () => ({
  workflowApi: {
    definitions: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deploy: vi.fn(),
      export: vi.fn(),
      import: vi.fn(),
    },
    instances: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      start: vi.fn(),
      cancel: vi.fn(),
      suspend: vi.fn(),
      resume: vi.fn(),
    },
    approvals: {
      list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
      get: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      delegate: vi.fn(),
    },
    statistics: {
      getDashboardData: vi.fn().mockResolvedValue({ data: {} }),
    },
    designer: {
      validate: vi.fn(),
      export: vi.fn(),
    },
  },
  definitionApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  instanceApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    start: vi.fn(),
    cancel: vi.fn(),
  },
  approvalApi: {
    list: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    get: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
          notifications: [],
        })
      : {
          addNotification: vi.fn(),
          notifications: [],
        }
  ),
  useAuthStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          user: null,
        })
      : {
          user: null,
        }
  ),
}));

describe('WorkflowModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkflowDashboardPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <WorkflowDashboardPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have workflow API methods defined', () => {
      expect(workflowApi.statistics.getDashboardData).toBeDefined();
      expect(workflowApi.approvals.list).toBeDefined();
      expect(workflowApi.instances.list).toBeDefined();
    });
  });

  describe('WorkflowDefinitionsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <WorkflowDefinitionsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have definition API methods defined', () => {
      expect(workflowApi.definitions.list).toBeDefined();
      expect(workflowApi.definitions.get).toBeDefined();
      expect(workflowApi.definitions.create).toBeDefined();
      expect(workflowApi.definitions.update).toBeDefined();
      expect(workflowApi.definitions.delete).toBeDefined();
      expect(workflowApi.definitions.deploy).toBeDefined();
    });
  });

  describe('WorkflowInstancesPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <WorkflowInstancesPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have instance API methods defined', () => {
      expect(workflowApi.instances.list).toBeDefined();
      expect(workflowApi.instances.get).toBeDefined();
      expect(workflowApi.instances.start).toBeDefined();
      expect(workflowApi.instances.cancel).toBeDefined();
    });
  });

  describe('WorkflowApprovalsPage', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <BrowserRouter>
          <WorkflowApprovalsPage />
        </BrowserRouter>
      );
      expect(container).toBeDefined();
    });

    it('should have approval API methods defined', () => {
      expect(workflowApi.approvals.list).toBeDefined();
      expect(workflowApi.approvals.get).toBeDefined();
      expect(workflowApi.approvals.approve).toBeDefined();
      expect(workflowApi.approvals.reject).toBeDefined();
      expect(workflowApi.approvals.delegate).toBeDefined();
    });
  });
});
