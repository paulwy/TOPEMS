import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMobileApproval,
  getTypeIcon,
  getTypeColor,
  getPriorityColor,
  getPriorityLabel,
} from '../UseMobileApproval';

const shared = vi.hoisted(() => ({
  mutate: vi.fn(),
  navigate: vi.fn(),
  addNotification: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(() => Promise.resolve({ data: [] })),
    isFetching: false,
    isSuccess: false,
    isPending: false,
    status: 'idle',
  })),
  useMutation: vi.fn(() => ({
    mutate: shared.mutate,
    mutateAsync: vi.fn(),
    isPending: false,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: false,
    data: undefined,
    reset: vi.fn(),
    status: 'idle',
    variables: undefined,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    removeQueries: vi.fn(),
  })),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => shared.navigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/store', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'u-1', name: 'tester' } })),
  useNotificationStore: vi.fn(() => ({ addNotification: shared.addNotification })),
}));

vi.mock('@/api/workflow/approval', () => ({
  approvalTaskApi: {
    listApprovalTasks: vi.fn(),
    approveTask: vi.fn(),
    rejectTask: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  apiLogger: { error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/modules/mobile/config', () => ({
  MOBILE_PATHS: {
    home: '/mobile/home',
    tasks: '/mobile/tasks',
    scanPage: '/mobile/scan',
    settings: '/mobile/settings',
  },
}));

vi.mock('lucide-react', () => ({
  Package: (props: any) => null,
  Users: (props: any) => null,
  DollarSign: (props: any) => null,
  FileText: (props: any) => null,
}));

vi.mock('@/lib/reactQuery', () => ({
  QUERY_KEYS: {
    AD_HOC: {
      MOBILE_APPROVALS_BASE: ['mobile-approvals'],
    },
  },
}));

describe('UseMobileApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.mutate.mockClear();
    shared.navigate.mockClear();
    shared.addNotification.mockClear();
  });

  describe('helper functions', () => {
    it('getTypeIcon should return valid React elements', () => {
      expect(React.isValidElement(getTypeIcon('purchase'))).toBe(true);
      expect(React.isValidElement(getTypeIcon('leave'))).toBe(true);
      expect(React.isValidElement(getTypeIcon('expense'))).toBe(true);
      expect(React.isValidElement(getTypeIcon('contract'))).toBe(true);
      expect(React.isValidElement(getTypeIcon('other'))).toBe(true);
    });

    it('getTypeColor should return correct colors', () => {
      expect(getTypeColor('purchase')).toBe('primary');
      expect(getTypeColor('leave')).toBe('success');
      expect(getTypeColor('expense')).toBe('warning');
      expect(getTypeColor('contract')).toBe('info');
      expect(getTypeColor('other')).toBe('default');
    });

    it('getPriorityColor should return correct colors', () => {
      expect(getPriorityColor('high')).toBe('error');
      expect(getPriorityColor('medium')).toBe('warning');
      expect(getPriorityColor('low')).toBe('success');
    });

    it('getPriorityLabel should return correct labels', () => {
      const t = (x: string) => x;
      expect(getPriorityLabel('high', t)).toBe('紧急');
      expect(getPriorityLabel('medium', t)).toBe('普通');
      expect(getPriorityLabel('low', t)).toBe('低');
    });
  });

  describe('useMobileApproval hook', () => {
    it('should render and return initial state', () => {
      const { result } = renderHook(() => useMobileApproval());
      expect(result.current).toBeDefined();
      expect(result.current.activeTab).toBe(0);
      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedApproval).toBeNull();
      expect(result.current.approvalComment).toBe('');
      expect(result.current.approvals).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.processing).toBe(false);
    });

    it('should return 3 tabs', () => {
      const { result } = renderHook(() => useMobileApproval());
      expect(Array.isArray(result.current.tabs)).toBe(true);
      expect(result.current.tabs).toHaveLength(3);
    });

    it('setActiveTab / setSearchQuery / setSelectedApproval / setApprovalComment should update state', () => {
      const { result } = renderHook(() => useMobileApproval());
      act(() => {
        result.current.setActiveTab(2);
        result.current.setSearchQuery('keyword');
        result.current.setApprovalComment('ok');
      });
      expect(result.current.activeTab).toBe(2);
      expect(result.current.searchQuery).toBe('keyword');
      expect(result.current.approvalComment).toBe('ok');
    });

    it('handleTabChange should update activeTab', () => {
      const { result } = renderHook(() => useMobileApproval());
      act(() => {
        result.current.handleTabChange({} as any, 1);
      });
      expect(result.current.activeTab).toBe(1);
    });

    it('handleBottomTabChange home should navigate to home', () => {
      const { result } = renderHook(() => useMobileApproval());
      act(() => {
        result.current.handleBottomTabChange('home');
      });
      expect(shared.navigate).toHaveBeenCalledWith('/mobile/home');
    });

    it('handleBottomTabChange tasks should navigate to tasks page', () => {
      const { result } = renderHook(() => useMobileApproval());
      act(() => {
        result.current.handleBottomTabChange('tasks');
      });
      expect(shared.navigate).toHaveBeenCalledWith('/mobile/tasks');
    });

    it('handleBottomTabChange approval should not navigate', () => {
      const { result } = renderHook(() => useMobileApproval());
      act(() => {
        result.current.handleBottomTabChange('approval');
      });
      expect(shared.navigate).not.toHaveBeenCalled();
    });

    it('handleApprove should call mutate with approval item', () => {
      const { result } = renderHook(() => useMobileApproval());
      const approval = {
        id: 'a-1',
        title: 'T',
        type: 'purchase' as const,
        applicant: 'me',
        department: 'd',
        submitTime: '',
        priority: 'high' as const,
        status: 'pending' as const,
        description: '',
        steps: [],
      };
      act(() => {
        result.current.handleApprove(approval);
      });
      expect(shared.mutate).toHaveBeenCalledWith(approval);
    });

    it('handleReject should call mutate with approval item', () => {
      const { result } = renderHook(() => useMobileApproval());
      const approval = {
        id: 'a-2',
        title: 'T2',
        type: 'leave' as const,
        applicant: 'me',
        department: 'd',
        submitTime: '',
        priority: 'low' as const,
        status: 'pending' as const,
        description: '',
        steps: [],
      };
      act(() => {
        result.current.handleReject(approval);
      });
      expect(shared.mutate).toHaveBeenCalledWith(approval);
    });

    it('filteredApprovals should be an array', () => {
      const { result } = renderHook(() => useMobileApproval());
      expect(Array.isArray(result.current.filteredApprovals)).toBe(true);
    });

    it('should return handleRefresh function', () => {
      const { result } = renderHook(() => useMobileApproval());
      expect(typeof result.current.handleRefresh).toBe('function');
    });
  });
});
