import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTenantDetail } from '../useTenantDetail';

const shared = vi.hoisted(() => ({
  mutate: vi.fn(),
  openConfirm: vi.fn(),
  closeConfirm: vi.fn(),
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
    refetch: vi.fn(),
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
  useParams: vi.fn(() => ({ tenantId: 't-1' })),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (x: string) => x }),
}));

vi.mock('@/hooks', () => ({
  useConfirmDialog: () => ({
    confirmOpen: false,
    confirmConfig: null,
    openConfirm: shared.openConfirm,
    closeConfirm: shared.closeConfirm,
  }),
}));

vi.mock('@/api/tenant', () => ({
  tenantApi: {
    getTenant: vi.fn(),
    getTenantStats: vi.fn(),
    getTenantUsers: vi.fn(),
    getInvoices: vi.fn(),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
  apiLogger: { error: vi.fn(), debug: vi.fn() },
}));

describe('useTenantDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shared.mutate.mockClear();
    shared.openConfirm.mockClear();
    shared.closeConfirm.mockClear();
  });

  it('should render and return tenantId', () => {
    const { result } = renderHook(() => useTenantDetail());
    expect(result.current).toBeDefined();
    expect(result.current.tenantId).toBe('t-1');
  });

  it('should return default empty data and loading state', () => {
    const { result } = renderHook(() => useTenantDetail());
    expect(result.current.tenant).toBeNull();
    expect(result.current.stats).toBeNull();
    expect(result.current.users).toEqual([]);
    expect(result.current.invoices).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.usersLoading).toBe(false);
  });

  it('should return default invite dialog state', () => {
    const { result } = renderHook(() => useTenantDetail());
    expect(result.current.showInviteDialog).toBe(false);
    expect(result.current.inviteForm).toEqual({ email: '', role: 'member' });
  });

  it('should return confirm dialog state and close function', () => {
    const { result } = renderHook(() => useTenantDetail());
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.confirmConfig).toBeNull();
    expect(typeof result.current.setConfirmDialogClosed).toBe('function');
  });

  it('setShowInviteDialog should update dialog visibility', () => {
    const { result } = renderHook(() => useTenantDetail());
    act(() => {
      result.current.setShowInviteDialog(true);
    });
    expect(result.current.showInviteDialog).toBe(true);
  });

  it('setInviteForm should update invite form', () => {
    const { result } = renderHook(() => useTenantDetail());
    act(() => {
      result.current.setInviteForm({ email: 'a@b.com', role: 'admin' });
    });
    expect(result.current.inviteForm).toEqual({ email: 'a@b.com', role: 'admin' });
  });

  it('handleInviteMember should call mutate with tenantId and form', () => {
    const { result } = renderHook(() => useTenantDetail());
    act(() => {
      result.current.setInviteForm({ email: 'x@y.com', role: 'member' });
    });
    act(() => {
      result.current.handleInviteMember();
    });
    expect(shared.mutate).toHaveBeenCalledWith({
      tenantId: 't-1',
      data: { email: 'x@y.com', role: 'member' },
    });
  });

  it('handleRemoveMember should call openConfirmDialog', () => {
    const { result } = renderHook(() => useTenantDetail());
    const mockUser = { id: 'u-1', email: 'a@b.com', name: 'A', role: 'member' as const };
    act(() => {
      result.current.handleRemoveMember(mockUser as any);
    });
    expect(shared.openConfirm).toHaveBeenCalledTimes(1);
    const config = shared.openConfirm.mock.calls[0][0];
    expect(config.danger).toBe(true);
    expect(config.onConfirm).toBeInstanceOf(Function);
  });

  it('handleUpdateMemberRole should call mutate with tenantId, userId, role', () => {
    const { result } = renderHook(() => useTenantDetail());
    act(() => {
      result.current.handleUpdateMemberRole('u-1', 'admin');
    });
    expect(shared.mutate).toHaveBeenCalledWith({
      tenantId: 't-1',
      userId: 'u-1',
      role: 'admin',
    });
  });

  it('should return refetch functions', () => {
    const { result } = renderHook(() => useTenantDetail());
    expect(typeof result.current.refetchTenant).toBe('function');
    expect(typeof result.current.refetchStats).toBe('function');
  });
});
