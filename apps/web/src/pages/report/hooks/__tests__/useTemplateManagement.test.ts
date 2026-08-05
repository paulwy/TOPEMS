import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplateManagement } from '../useTemplateManagement';
import type { Template, CreateTemplateRequest } from '@/api/template';

const mockMutationFactory = () => ({
  mutateAsync: vi.fn().mockResolvedValue({ success: true }),
  mutate: vi.fn(),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  data: null,
  reset: vi.fn(),
});

vi.mock('@tanstack/react-query', () => ({
  QueryCache: vi.fn(),
  MutationCache: vi.fn(),
  QueryClient: vi.fn(),
  useQuery: vi.fn().mockImplementation(({ queryKey }) => {
    const keyStr = JSON.stringify(queryKey);
    if (keyStr.includes('template-categories')) {
      return {
        data: [
          { id: 'cat-1', name: 'Quality Report' },
          { id: 'cat-2', name: 'Production Report' },
          { id: 'cat-3', name: 'Financial Report' },
        ],
        isLoading: false,
        isError: false,
        error: null,
      };
    }
    return {
      data: [
        {
          id: 'tpl-1',
          name: 'Quarterly Quality Report Template',
          code: 'Q3-REPORT-001',
          description: 'For quarterly quality data summary and analysis',
          category: 'cat-1',
          status: 'active',
          created_at: '2024-01-10T08:00:00Z',
        },
        {
          id: 'tpl-2',
          name: 'Monthly Production Report Template',
          code: 'MONTHLY-PROD-001',
          description: 'Monthly production data statistics template',
          category: 'cat-2',
          status: 'inactive',
          created_at: '2024-01-15T09:30:00Z',
        },
        {
          id: 'tpl-3',
          name: 'Annual Financial Report Template',
          code: 'YEARLY-FIN-001',
          description: undefined,
          category: 'cat-3',
          status: 'active',
          created_at: '2024-02-01T10:00:00Z',
        },
      ] as Template[],
      isLoading: false,
      isError: false,
      error: null,
    };
  }),
  useMutation: vi.fn().mockImplementation((options: any) => {
    const result = {
      ...mockMutationFactory(),
      ...(options?.onSuccess ? { onSuccess: options.onSuccess } : {}),
      ...(options?.onError ? { onError: options.onError } : {}),
    };
    return result;
  }),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
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

vi.mock('@/api/template', () => ({
  templateApi: {
    list: vi.fn(),
    listCategories: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
    toggleStatus: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  useCrudMutations: vi.fn(() => ({
    createMutation: mockMutationFactory(),
    updateMutation: mockMutationFactory(),
    deleteMutation: mockMutationFactory(),
  })),
}));

describe('useTemplateManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current).toBeDefined();
  });

  it('should return correct default state - viewMode', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.viewMode).toBe('grid');
  });

  it('should return correct default state - searchQuery', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.searchQuery).toBe('');
  });

  it('should return correct default state - selectedCategory', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.selectedCategory).toBe('');
  });

  it('should return correct default modal state', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.showCreateModal).toBe(false);
    expect(result.current.showEditModal).toBe(false);
    expect(result.current.showPreviewModal).toBe(false);
    expect(result.current.selectedTemplate).toBeNull();
  });

  it('should return templates and categories data', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.templates).toHaveLength(3);
    expect(result.current.categories).toHaveLength(3);
    expect(result.current.templates[0].id).toBe('tpl-1');
    expect(result.current.categories[0].id).toBe('cat-1');
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should return query objects', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.templatesQuery).toBeDefined();
    expect(result.current.categoriesQuery).toBeDefined();
  });

  it('should return mutation objects', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.createMutation).toBeDefined();
    expect(result.current.updateMutation).toBeDefined();
    expect(result.current.deleteMutation).toBeDefined();
    expect(result.current.duplicateMutation).toBeDefined();
    expect(result.current.toggleStatusMutation).toBeDefined();
  });

  it('should contain state setter functions', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.setViewMode).toBe('function');
    expect(typeof result.current.setSearchQuery).toBe('function');
    expect(typeof result.current.setSelectedCategory).toBe('function');
    expect(typeof result.current.setShowCreateModal).toBe('function');
    expect(typeof result.current.setShowEditModal).toBe('function');
    expect(typeof result.current.setShowPreviewModal).toBe('function');
    expect(typeof result.current.setSelectedTemplate).toBe('function');
  });

  it('state setter functions should update state correctly', () => {
    const { result } = renderHook(() => useTemplateManagement());
    act(() => {
      result.current.setViewMode('list');
      result.current.setSearchQuery('quality');
      result.current.setSelectedCategory('cat-1');
      result.current.setShowCreateModal(true);
      result.current.setShowEditModal(true);
      result.current.setShowPreviewModal(true);
      result.current.setSelectedTemplate({ id: 'tpl-test' } as Template);
    });
    expect(result.current.viewMode).toBe('list');
    expect(result.current.searchQuery).toBe('quality');
    expect(result.current.selectedCategory).toBe('cat-1');
    expect(result.current.showCreateModal).toBe(true);
    expect(result.current.showEditModal).toBe(true);
    expect(result.current.showPreviewModal).toBe(true);
    expect(result.current.selectedTemplate).toEqual({ id: 'tpl-test' });
  });

  it('should contain handleCreateTemplate function and be callable', async () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.handleCreateTemplate).toBe('function');
    const mockData: CreateTemplateRequest = {
      name: 'New Template',
      code: 'NEW-001',
      category: 'cat-1',
    };
    await expect(result.current.handleCreateTemplate(mockData)).resolves.not.toThrow();
    expect(result.current.createMutation.mutateAsync).toHaveBeenCalledWith(mockData);
  });

  it('should contain handleUpdateTemplate function and be callable', async () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.handleUpdateTemplate).toBe('function');
    const mockData: Partial<CreateTemplateRequest> = {
      name: 'Updated Template',
    };
    await expect(result.current.handleUpdateTemplate('tpl-1', mockData)).resolves.not.toThrow();
    expect(result.current.updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: 'tpl-1',
      data: mockData,
    });
  });

  it('should contain handleDuplicateTemplate function and be callable', async () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.handleDuplicateTemplate).toBe('function');
    await expect(result.current.handleDuplicateTemplate('tpl-1')).resolves.not.toThrow();
    expect(result.current.duplicateMutation.mutateAsync).toHaveBeenCalledWith('tpl-1');
  });

  it('should contain handleToggleStatus function and be callable', async () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(typeof result.current.handleToggleStatus).toBe('function');
    await expect(result.current.handleToggleStatus('tpl-1')).resolves.not.toThrow();
    expect(result.current.toggleStatusMutation.mutateAsync).toHaveBeenCalledWith('tpl-1');
  });

  it('filteredTemplates should filter templates based on search query', () => {
    const { result } = renderHook(() => useTemplateManagement());
    expect(result.current.filteredTemplates).toHaveLength(3);

    act(() => {
      result.current.setSearchQuery('quality');
    });
    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].code).toBe('Q3-REPORT-001');

    act(() => {
      result.current.setSearchQuery('MONTHLY-PROD');
    });
    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].name).toBe('Monthly Production Report Template');

    act(() => {
      result.current.setSearchQuery('NOT-EXIST');
    });
    expect(result.current.filteredTemplates).toHaveLength(0);
  });

  it('filteredTemplates should support searching description (if any)', () => {
    const { result } = renderHook(() => useTemplateManagement());
    act(() => {
      result.current.setSearchQuery('data summary');
    });
    expect(result.current.filteredTemplates).toHaveLength(1);
    expect(result.current.filteredTemplates[0].code).toBe('Q3-REPORT-001');
  });
});
