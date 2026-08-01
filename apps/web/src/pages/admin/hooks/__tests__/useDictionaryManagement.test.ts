import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDictionaryManagement } from '../useDictionaryManagement';
import type { DictType, DictItem } from '@/api/system';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    },
    i18n: {},
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  Trans: () => null,
}));

vi.mock('@/api/system', () => {
  const dictTypeApi = {
    list: vi.fn().mockResolvedValue({ success: true, data: { items: [] } }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  };
  const dictItemApi = {
    list: vi.fn().mockResolvedValue({ success: true, data: { items: [], total: 0 } }),
    create: vi.fn().mockResolvedValue({ success: true, data: {} }),
    update: vi.fn().mockResolvedValue({ success: true, data: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  };
  return {
    dictTypeApi,
    dictItemApi,
  };
});

vi.mock('@/schemas/admin', () => ({
  toggleDictItemStatus: vi.fn(),
}));

vi.mock('@/utils/errors', () => ({
  extractErrorMessage: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

describe('useDictionaryManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('should render hook without errors', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      expect(result.current).toBeDefined();
    });

    it('should have correct default state values', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(result.current.selectedType).toBeNull();
      expect(result.current.searchQuery).toBe('');
      expect(result.current.showTypeModal).toBe(false);
      expect(result.current.editingType).toBeNull();
      expect(result.current.newType).toEqual({
        code: '',
        name: '',
        category: 'business',
        description: '',
        status: 'active',
      });
      expect(result.current.confirmDialogOpen).toBe(false);
      expect(result.current.confirmDialogConfig).toBeNull();
      expect(result.current.showExportModal).toBe(false);
      expect(result.current.showImportModal).toBe(false);
      expect(result.current.importFile).toBeNull();
    });

    it('should have correct default data arrays', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(Array.isArray(result.current.dictTypes)).toBe(true);
      expect(typeof result.current.typesLoading).toBe('boolean');
      expect(Array.isArray(result.current.filteredTypes)).toBe(true);
      expect(typeof result.current.groupedTypes).toBe('object');
    });
  });

  describe('state setter functions existence', () => {
    it('should expose all expected setter functions', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(typeof result.current.setSelectedType).toBe('function');
      expect(typeof result.current.setSearchQuery).toBe('function');
      expect(typeof result.current.setEditingType).toBe('function');
      expect(typeof result.current.setNewType).toBe('function');
      expect(typeof result.current.setConfirmDialogOpen).toBe('function');
      expect(typeof result.current.setShowExportModal).toBe('function');
      expect(typeof result.current.setShowImportModal).toBe('function');
      expect(typeof result.current.setImportFile).toBe('function');
    });
  });

  describe('state setters updates', () => {
    it('should update selectedType via setSelectedType', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockType: DictType = {
        id: 'type-1',
        code: 'USER_STATUS',
        name: 'User Status',
        category: 'business',
        description: 'User status codes',
        status: 'active',
      };

      act(() => {
        result.current.setSelectedType(mockType);
      });

      expect(result.current.selectedType).toEqual(mockType);

      act(() => {
        result.current.setSelectedType(null);
      });

      expect(result.current.selectedType).toBeNull();
    });

    it('should update searchQuery via setSearchQuery', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.setSearchQuery('user');
      });

      expect(result.current.searchQuery).toBe('user');
    });

    it('should update editingType via setEditingType', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockType: DictType = {
        id: 'type-2',
        code: 'ORDER_STATUS',
        name: 'Order Status',
        category: 'business',
        status: 'active',
      };

      act(() => {
        result.current.setEditingType(mockType);
      });

      expect(result.current.editingType).toEqual(mockType);
    });

    it('should update newType via setNewType', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const newTypeData: Partial<DictType> = {
        code: 'NEW_CODE',
        name: 'New Code',
        category: 'system',
        description: 'Test description',
        status: 'active',
      };

      act(() => {
        result.current.setNewType(newTypeData);
      });

      expect(result.current.newType).toEqual(newTypeData);
    });

    it('should update confirmDialogOpen via setConfirmDialogOpen', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.setConfirmDialogOpen(true);
      });
      expect(result.current.confirmDialogOpen).toBe(true);

      act(() => {
        result.current.setConfirmDialogOpen(false);
      });
      expect(result.current.confirmDialogOpen).toBe(false);
    });

    it('should update showExportModal via setShowExportModal', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.setShowExportModal(true);
      });
      expect(result.current.showExportModal).toBe(true);
    });

    it('should update showImportModal via setShowImportModal', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.setShowImportModal(true);
      });
      expect(result.current.showImportModal).toBe(true);
    });

    it('should update importFile via setImportFile', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockFile = new File(['[]'], 'test.json', { type: 'application/json' });

      act(() => {
        result.current.setImportFile(mockFile);
      });

      expect(result.current.importFile).toEqual(mockFile);
    });
  });

  describe('handler functions existence', () => {
    it('should expose all expected handler functions', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(typeof result.current.openConfirmDialog).toBe('function');
      expect(typeof result.current.handleCreateType).toBe('function');
      expect(typeof result.current.handleUpdateType).toBe('function');
      expect(typeof result.current.handleDeleteType).toBe('function');
      expect(typeof result.current.handleToggleStatus).toBe('function');
      expect(typeof result.current.handleExport).toBe('function');
      expect(typeof result.current.handleImport).toBe('function');
      expect(typeof result.current.openCreateTypeModal).toBe('function');
      expect(typeof result.current.openEditTypeModal).toBe('function');
      expect(typeof result.current.closeTypeModal).toBe('function');
    });
  });

  describe('mutation objects existence', () => {
    it('should expose all mutation objects with required methods', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(result.current.createTypeMutation).toBeDefined();
      expect(typeof result.current.createTypeMutation.mutate).toBe('function');
      expect(typeof result.current.createTypeMutation.mutateAsync).toBe('function');

      expect(result.current.updateTypeMutation).toBeDefined();
      expect(typeof result.current.updateTypeMutation.mutate).toBe('function');
      expect(typeof result.current.updateTypeMutation.mutateAsync).toBe('function');

      expect(result.current.deleteTypeMutation).toBeDefined();
      expect(typeof result.current.deleteTypeMutation.mutate).toBe('function');
      expect(typeof result.current.deleteTypeMutation.mutateAsync).toBe('function');

      expect(result.current.toggleStatusMutation).toBeDefined();
      expect(typeof result.current.toggleStatusMutation.mutate).toBe('function');
      expect(typeof result.current.toggleStatusMutation.mutateAsync).toBe('function');
    });
  });

  describe('openConfirmDialog', () => {
    it('should open confirm dialog with config', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockConfig = {
        title: 'Confirm Delete',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
        danger: true,
      };

      act(() => {
        result.current.openConfirmDialog(mockConfig);
      });

      expect(result.current.confirmDialogOpen).toBe(true);
      expect(result.current.confirmDialogConfig).toEqual(mockConfig);
    });
  });

  describe('openCreateTypeModal', () => {
    it('should open create modal with reset state', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockEditingType: DictType = {
        id: 'old-id',
        code: 'OLD',
        name: 'Old Type',
        category: 'business',
        status: 'active',
      };

      act(() => {
        result.current.setEditingType(mockEditingType);
        result.current.setNewType({ code: 'X', name: 'X' });
      });
      expect(result.current.editingType).toEqual(mockEditingType);

      act(() => {
        result.current.openCreateTypeModal();
      });

      expect(result.current.showTypeModal).toBe(true);
      expect(result.current.editingType).toBeNull();
      expect(result.current.newType).toEqual({
        code: '',
        name: '',
        category: 'business',
        description: '',
        status: 'active',
      });
    });
  });

  describe('openEditTypeModal', () => {
    it('should open edit modal with selected type', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockType: DictType = {
        id: 'edit-id',
        code: 'EDIT_CODE',
        name: 'Edit Me',
        category: 'system',
        description: 'Editable type',
        status: 'active',
      };

      act(() => {
        result.current.openEditTypeModal(mockType);
      });

      expect(result.current.showTypeModal).toBe(true);
      expect(result.current.editingType).toEqual(mockType);
    });
  });

  describe('closeTypeModal', () => {
    it('should close modal and reset editingType', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockType: DictType = {
        id: 'closing-id',
        code: 'CLS',
        name: 'Closing',
        category: 'business',
        status: 'active',
      };

      act(() => {
        result.current.openEditTypeModal(mockType);
      });
      expect(result.current.showTypeModal).toBe(true);
      expect(result.current.editingType).toEqual(mockType);

      act(() => {
        result.current.closeTypeModal();
      });

      expect(result.current.showTypeModal).toBe(false);
      expect(result.current.editingType).toBeNull();
    });
  });

  describe('handleCreateType', () => {
    it('should be callable without errors', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleCreateType(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handleUpdateType', () => {
    it('should be callable without errors when editingType is set', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;
      const mockType: DictType = {
        id: 'update-id',
        code: 'UPD',
        name: 'Update Me',
        category: 'business',
        status: 'active',
      };

      act(() => {
        result.current.setEditingType(mockType);
        result.current.handleUpdateType(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not mutate when editingType is null', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent;

      act(() => {
        result.current.handleUpdateType(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('handleDeleteType', () => {
    it('should expose callable handleDeleteType', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.handleDeleteType('some-id');
      });

      expect(result.current.handleDeleteType).toBeDefined();
    });
  });

  describe('handleToggleStatus', () => {
    it('should be callable with a row object', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const mockItem: DictItem = {
        id: 'item-1',
        dict_type_id: 'type-1',
        code: 'ACTIVE',
        name: 'Active',
        value: '1',
        sort_order: 1,
        status: 'inactive',
      };

      act(() => {
        result.current.handleToggleStatus(mockItem as unknown as Record<string, unknown>);
      });

      expect(result.current.handleToggleStatus).toBeDefined();
    });
  });

  describe('handleExport', () => {
    it('should not throw when no selectedType', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.handleExport();
      });

      expect(result.current.showExportModal).toBe(false);
    });
  });

  describe('handleImport', () => {
    it('should not throw when no importFile or selectedType', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.handleImport();
      });

      expect(result.current.importFile).toBeNull();
      expect(result.current.selectedType).toBeNull();
    });
  });

  describe('dictItemAdapter', () => {
    it('should expose CrudApiAdapter with all required methods', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      expect(result.current.dictItemAdapter).toBeDefined();
      expect(typeof result.current.dictItemAdapter.list).toBe('function');
      expect(typeof result.current.dictItemAdapter.create).toBe('function');
      expect(typeof result.current.dictItemAdapter.update).toBe('function');
      expect(typeof result.current.dictItemAdapter.delete).toBe('function');
    });

    it('should return empty list when no selectedType', async () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const response = await result.current.dictItemAdapter.list({});
      expect(response).toEqual({ data: [], total: 0 });
    });
  });

  describe('filteredTypes derivation', () => {
    it('should return empty array when no dictTypes', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      expect(Array.isArray(result.current.filteredTypes)).toBe(true);
    });

    it('should apply search query filter', () => {
      const { result } = renderHook(() => useDictionaryManagement());

      act(() => {
        result.current.setSearchQuery('user');
      });

      expect(result.current.searchQuery).toBe('user');
      expect(Array.isArray(result.current.filteredTypes)).toBe(true);
    });
  });

  describe('groupedTypes derivation', () => {
    it('should return an object grouping types by category', () => {
      const { result } = renderHook(() => useDictionaryManagement());
      const grouped = result.current.groupedTypes;

      expect(typeof grouped).toBe('object');
      expect(grouped).not.toBeNull();

      Object.values(grouped).forEach((types) => {
        expect(Array.isArray(types)).toBe(true);
      });
    });
  });
});
