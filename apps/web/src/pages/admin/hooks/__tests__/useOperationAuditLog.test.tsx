import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOperationAuditLog } from '../useOperationAuditLog';
import type { OperationLog } from '@/api/admin/operationAudit';

vi.mock('@tanstack/react-query', () => ({
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
  useQuery: vi.fn(() => ({
    data: {
      items: [
        {
          id: 'log-1',
          created_at: '2024-01-15T10:30:00Z',
          user_name: 'admin',
          module: 'iam',
          operation: 'create',
          resource_type: 'user',
          resource_id: 'user-001',
          response_status: 201,
          trace_id: 'trace-abc123',
        },
        {
          id: 'log-2',
          created_at: '2024-01-15T11:00:00Z',
          user_name: 'user1',
          module: 'file',
          operation: 'update',
          resource_type: 'document',
          resource_id: 'doc-002',
          response_status: 500,
          trace_id: 'trace-def456',
        },
        {
          id: 'log-3',
          created_at: '2024-01-15T11:30:00Z',
          user_name: 'user2',
          module: 'workflow',
          operation: 'delete',
          resource_type: 'flow_instance',
          resource_id: 'flow-003',
          response_status: undefined,
          trace_id: 'trace-ghi789',
        },
      ],
      total: 100,
    },
    isLoading: false,
    isPending: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useNotificationStore: vi.fn((selector?: any) =>
    selector
      ? selector({
          addNotification: vi.fn(),
        })
      : {
          addNotification: vi.fn(),
        }
  ),
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/api/admin/operationAudit', () => ({
  operationAuditApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: vi.fn((err: unknown, defaultMsg: string) => defaultMsg),
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

vi.mock('lucide-react', () => ({
  CheckCircle: () => null,
  XCircle: () => null,
  Eye: () => null,
  Clock: () => null,
  User: () => null,
}));

vi.mock('@mui/material', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Chip: ({ label }: { label: React.ReactNode }) => <span>{label}</span>,
  IconButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('useOperationAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current).toBeDefined();
  });

  it('should return correct default state - filters initially empty', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current.userFilter).toBe('');
    expect(result.current.moduleFilter).toBe('');
    expect(result.current.operationFilter).toBe('');
    expect(result.current.resourceTypeFilter).toBe('');
    expect(result.current.traceIdFilter).toBe('');
    expect(result.current.successFilter).toBe('');
    expect(result.current.startDate).toBe('');
    expect(result.current.endDate).toBe('');
  });

  it('should return correct default pagination state', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current.page).toBe(0);
    expect(result.current.rowsPerPage).toBe(10);
  });

  it('should return correct default detail modal state', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current.showDetailModal).toBe(false);
    expect(result.current.currentLog).toBeNull();
  });

  it('should return logs data and total count', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current.logs).toHaveLength(3);
    expect(result.current.totalCount).toBe(100);
    expect(result.current.logs[0].id).toBe('log-1');
    expect(result.current.logs[0].user_name).toBe('admin');
  });

  it('should return loading state and refetch function', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.isPending).toBe('boolean');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should return stats summary data', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(result.current.stats).toBeDefined();
    expect(result.current.stats.total).toBe(100);
    expect(result.current.stats.showing).toBe(3);
    expect(result.current.stats.success).toBe(1);
    expect(result.current.stats.failed).toBe(1);
  });

  it('should return columns config', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(Array.isArray(result.current.columns)).toBe(true);
    expect(result.current.columns.length).toBeGreaterThan(0);
    expect(result.current.columns[0]).toHaveProperty('id');
    expect(result.current.columns[0]).toHaveProperty('label');
    expect(result.current.columns[0]).toHaveProperty('render');
  });

  it('should return rowActions config', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(Array.isArray(result.current.rowActions)).toBe(true);
    expect(result.current.rowActions.length).toBe(1);
    expect(result.current.rowActions[0].key).toBe('view-detail');
  });

  it('should contain getModuleLabel function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.getModuleLabel).toBe('function');
    expect(result.current.getModuleLabel('iam')).toBe(
      'admin.operation_audit_log.identity_permissions'
    );
    expect(result.current.getModuleLabel('unknown_module')).toBe('unknown_module');
    expect(result.current.getModuleLabel('')).toBe('-');
  });

  it('should contain getOperationLabel function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.getOperationLabel).toBe('function');
    expect(result.current.getOperationLabel('create')).toBe('admin.operation_audit_log.create');
    expect(result.current.getOperationLabel('unknown_op')).toBe('unknown_op');
    expect(result.current.getOperationLabel('')).toBe('-');
  });

  it('should contain getResponseStatusBadge function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.getResponseStatusBadge).toBe('function');
    expect(React.isValidElement(result.current.getResponseStatusBadge(200))).toBe(true);
    expect(React.isValidElement(result.current.getResponseStatusBadge(400))).toBe(true);
    expect(React.isValidElement(result.current.getResponseStatusBadge(500))).toBe(true);
    expect(React.isValidElement(result.current.getResponseStatusBadge(undefined))).toBe(true);
    expect(React.isValidElement(result.current.getResponseStatusBadge(300))).toBe(true);
  });

  it('should contain handleViewDetail function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.handleViewDetail).toBe('function');
    const mockLog: OperationLog = {
      id: 'test-log',
      created_at: '2024-01-01T00:00:00Z',
      user_name: 'test',
      module: 'test',
      operation: 'test',
    };
    act(() => {
      result.current.handleViewDetail(mockLog);
    });
    expect(result.current.showDetailModal).toBe(true);
    expect(result.current.currentLog).toEqual(mockLog);
  });

  it('should contain setShowDetailModal function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.setShowDetailModal).toBe('function');
    act(() => {
      result.current.setShowDetailModal(true);
    });
    expect(result.current.showDetailModal).toBe(true);
  });

  it('should contain clearFilters function and be callable', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.clearFilters).toBe('function');
    act(() => {
      result.current.setUserFilter('test-user');
      result.current.setModuleFilter('iam');
      result.current.setPage(5);
    });
    expect(result.current.userFilter).toBe('test-user');
    expect(result.current.moduleFilter).toBe('iam');
    expect(result.current.page).toBe(5);
    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.userFilter).toBe('');
    expect(result.current.moduleFilter).toBe('');
    expect(result.current.page).toBe(0);
  });

  it('should contain MODULE_OPTIONS and OPERATION_OPTIONS constants', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(Array.isArray(result.current.MODULE_OPTIONS)).toBe(true);
    expect(Array.isArray(result.current.OPERATION_OPTIONS)).toBe(true);
    expect(result.current.MODULE_OPTIONS.length).toBeGreaterThan(0);
    expect(result.current.OPERATION_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should contain filter setter functions', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    expect(typeof result.current.setUserFilter).toBe('function');
    expect(typeof result.current.setModuleFilter).toBe('function');
    expect(typeof result.current.setOperationFilter).toBe('function');
    expect(typeof result.current.setResourceTypeFilter).toBe('function');
    expect(typeof result.current.setTraceIdFilter).toBe('function');
    expect(typeof result.current.setSuccessFilter).toBe('function');
    expect(typeof result.current.setStartDate).toBe('function');
    expect(typeof result.current.setEndDate).toBe('function');
    expect(typeof result.current.setPage).toBe('function');
    expect(typeof result.current.setRowsPerPage).toBe('function');
  });

  it('filter setter functions should update state correctly', () => {
    const { result } = renderHook(() => useOperationAuditLog());
    act(() => {
      result.current.setUserFilter('user-xyz');
      result.current.setModuleFilter('file');
      result.current.setOperationFilter('create');
      result.current.setResourceTypeFilter('document');
      result.current.setTraceIdFilter('trace-123');
      result.current.setSuccessFilter('true');
      result.current.setStartDate('2024-01-01');
      result.current.setEndDate('2024-12-31');
      result.current.setPage(2);
      result.current.setRowsPerPage(20);
    });
    expect(result.current.userFilter).toBe('user-xyz');
    expect(result.current.moduleFilter).toBe('file');
    expect(result.current.operationFilter).toBe('create');
    expect(result.current.resourceTypeFilter).toBe('document');
    expect(result.current.traceIdFilter).toBe('trace-123');
    expect(result.current.successFilter).toBe('true');
    expect(result.current.startDate).toBe('2024-01-01');
    expect(result.current.endDate).toBe('2024-12-31');
    expect(result.current.page).toBe(2);
    expect(result.current.rowsPerPage).toBe(20);
  });
});
