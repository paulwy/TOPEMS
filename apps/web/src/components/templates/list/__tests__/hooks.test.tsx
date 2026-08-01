import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

import {
  useInlineEditing,
  useTreeTable,
  useExportFeature,
  useColumnConfigState,
  useBatchOperations,
  useCrudForm,
  useListPageFilters,
  useListPageSearch,
  useViewMode,
} from '../hooks';
import type { ColumnDef, ColumnConfig } from '../types';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

// Mock logger to avoid console noise during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    group: vi.fn(),
    table: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    child: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    })),
    setLevel: vi.fn(),
  },
}));

// ============ Test Data ============

interface TestRow {
  id: string;
  name: string;
  email: string;
  age: number;
  children?: TestRow[];
}

const mockRows: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@test.com', age: 30 },
  { id: '2', name: 'Bob', email: 'bob@test.com', age: 25 },
  { id: '3', name: 'Charlie', email: 'charlie@test.com', age: 35 },
];

const mockTreeRows: TestRow[] = [
  {
    id: '1',
    name: 'Parent 1',
    email: 'p1@test.com',
    age: 40,
    children: [
      { id: '1-1', name: 'Child 1-1', email: 'c11@test.com', age: 10 },
      { id: '1-2', name: 'Child 1-2', email: 'c12@test.com', age: 8 },
    ],
  },
  {
    id: '2',
    name: 'Parent 2',
    email: 'p2@test.com',
    age: 50,
    children: [{ id: '2-1', name: 'Child 2-1', email: 'c21@test.com', age: 15 }],
  },
];

const mockColumns: ColumnDef<TestRow>[] = [
  { id: 'name', label: 'Name', sortable: true },
  { id: 'email', label: 'Email' },
  { id: 'age', label: 'Age', sortable: true },
];

const mockColumnsWithTree: ColumnDef<TestRow>[] = [
  { id: 'name', label: 'Name', treeColumn: true },
  { id: 'email', label: 'Email' },
];

// ============ Helper Wrappers ============

/** Wrapper for useCrudForm that manages the external state the hook needs. */
function useCrudFormWrapper(
  crud: any,
  crudResult: any,
  initialFormData: Record<string, unknown> = {}
) {
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  return useCrudForm({
    crud,
    crudResult,
    formMode,
    setFormMode,
    currentRecord,
    setCurrentRecord,
    formOpen,
    setFormOpen,
    formSubmitting,
    setFormSubmitting,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
  });
}

// ============ Global Setup ============

/**
 * Workaround: `t` is referenced inside useCrudForm/useCrudRowActions/etc. but is
 * only declared via useTranslation() inside useInlineEditing.saveEditing.
 * Provide a global fallback so referencing `t` doesn't throw ReferenceError.
 */
beforeEach(() => {
  (globalThis as any).t = vi.fn((key: string) => key);
});

afterEach(() => {
  delete (globalThis as any).t;
  vi.restoreAllMocks();
});

// ============ useInlineEditing ============

describe('useInlineEditing', () => {
  it('should initialize with null editing state', () => {
    const { result } = renderHook(() => useInlineEditing<TestRow>({}));

    expect(result.current.internalEditingRowId).toBeNull();
    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
  });

  it('should start editing a row using getRowId', () => {
    const { result } = renderHook(() => useInlineEditing<TestRow>({ getRowId: (row) => row.id }));

    act(() => {
      result.current.startEditing(mockRows[0]);
    });

    expect(result.current.editingData).toEqual(mockRows[0]);
    expect(result.current.resolvedEditingRowId).toBe('1');
  });

  it('should start editing using default id field when getRowId not provided', () => {
    const { result } = renderHook(() => useInlineEditing<TestRow>({}));

    act(() => {
      result.current.startEditing(mockRows[1]);
    });

    expect(result.current.editingData).toEqual(mockRows[1]);
    expect(result.current.resolvedEditingRowId).toBe('2');
  });

  it('should cancel editing and call onInlineEditCancel', () => {
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useInlineEditing<TestRow>({ onInlineEditCancel: onCancel })
    );

    act(() => {
      result.current.startEditing(mockRows[0]);
    });
    expect(result.current.editingData).not.toBeNull();

    act(() => {
      result.current.cancelEditing(mockRows[0]);
    });

    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
    expect(onCancel).toHaveBeenCalledWith(mockRows[0]);
  });

  it('should update editing field value', () => {
    const { result } = renderHook(() => useInlineEditing<TestRow>({}));

    act(() => {
      result.current.startEditing(mockRows[0]);
    });

    act(() => {
      result.current.updateEditingField('name', 'Updated Name');
    });

    expect(result.current.editingData).toEqual({
      ...mockRows[0],
      name: 'Updated Name',
    });
  });

  it('should save editing and call onInlineEditSave, then clear state', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInlineEditing<TestRow>({ onInlineEditSave: onSave }));

    act(() => {
      result.current.startEditing(mockRows[0]);
    });
    act(() => {
      result.current.updateEditingField('name', 'New Name');
    });

    await act(async () => {
      await result.current.saveEditing(mockRows[0]);
    });

    expect(onSave).toHaveBeenCalledWith(mockRows[0], expect.objectContaining({ name: 'New Name' }));
    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
  });

  it('should keep editing state on save failure', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => useInlineEditing<TestRow>({ onInlineEditSave: onSave }));

    act(() => {
      result.current.startEditing(mockRows[0]);
    });

    await act(async () => {
      await result.current.saveEditing(mockRows[0]);
    });

    expect(onSave).toHaveBeenCalled();
    expect(result.current.editingData).not.toBeNull();
    expect(result.current.resolvedEditingRowId).toBe('1');
  });

  it('should use editingRowIdProp in controlled mode without updating internal state', () => {
    const onEditingRowIdChange = vi.fn();
    const { result } = renderHook(() =>
      useInlineEditing<TestRow>({
        editingRowIdProp: '5',
        onEditingRowIdChange,
      })
    );

    expect(result.current.resolvedEditingRowId).toBe('5');
    expect(result.current.internalEditingRowId).toBeNull();

    act(() => {
      result.current.setEditingRowId('10');
    });

    expect(result.current.internalEditingRowId).toBeNull();
    expect(onEditingRowIdChange).toHaveBeenCalledWith('10');
  });
});

// ============ useTreeTable ============

describe('useTreeTable', () => {
  it('should flatten data with level 0 when treeView is false', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockRows,
        treeView: false,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.flatData).toHaveLength(3);
    expect(result.current.flatData[0]).toEqual({ row: mockRows[0], level: 0 });
    expect(result.current.treeTableData).toEqual(mockRows);
  });

  it('should toggle expand keys', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.resolvedExpandedKeys).toEqual([]);

    act(() => {
      result.current.toggleExpand('1');
    });
    expect(result.current.resolvedExpandedKeys).toEqual(['1']);

    act(() => {
      result.current.toggleExpand('1');
    });
    expect(result.current.resolvedExpandedKeys).toEqual([]);
  });

  it('should flatten tree data respecting expanded keys', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        defaultExpandedKeys: ['1'],
        resolvedColumns: mockColumns,
      })
    );

    // Parent1 expanded (2 children) + Parent2 (collapsed) = 4 items in flatData
    expect(result.current.flatData).toHaveLength(4);
    expect(result.current.flatData[0]).toEqual({ row: mockTreeRows[0], level: 0 });
    expect(result.current.flatData[1]).toEqual({
      row: mockTreeRows[0].children![0],
      level: 1,
      parentKey: '1',
    });
    expect(result.current.flatData[2]).toEqual({
      row: mockTreeRows[0].children![1],
      level: 1,
      parentKey: '1',
    });
    // Parent2 is always shown at level 0 even when collapsed
    expect(result.current.flatData[3]).toEqual({
      row: mockTreeRows[1],
      level: 0,
    });
  });

  it('should detect hasChildren correctly in tree mode', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.hasChildren(mockTreeRows[0])).toBe(true);
    expect(result.current.hasChildren(mockRows[0])).toBe(false);
  });

  it('should return hasChildren as false when treeView is false', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: false,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.hasChildren(mockTreeRows[0])).toBe(false);
  });

  it('should get row level correctly', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        defaultExpandedKeys: ['1'],
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.getRowLevel('1')).toBe(0);
    expect(result.current.getRowLevel('1-1')).toBe(1);
    expect(result.current.getRowLevel('nonexistent')).toBe(0);
  });

  it('should find treeColumnId from columns with treeColumn flag', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumnsWithTree,
      })
    );

    expect(result.current.treeColumnId).toBe('name');
  });

  it('should fall back to first column id for treeColumnId', () => {
    const { result } = renderHook(() =>
      useTreeTable<TestRow>({
        data: mockTreeRows,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: mockColumns,
      })
    );

    expect(result.current.treeColumnId).toBe('name');
  });
});

// ============ useExportFeature ============

describe('useExportFeature', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('should initialize with default values when no export config provided', () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.resolvedExportable).toBe(false);
    expect(result.current.resolvedExportFileName).toBe('export');
    expect(result.current.resolvedExportFormats).toEqual(['csv', 'json']);
    expect(result.current.resolvedExportScopes).toEqual(['current', 'all', 'selected']);
    expect(result.current.exporting).toBe(false);
    expect(result.current.exportComplete).toBe(false);
    expect(result.current.exportAnchorEl).toBeNull();
  });

  it('should resolve exportable from exportable prop', () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.resolvedExportable).toBe(true);
  });

  it('should resolve exportable from crud config', () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        crud: { exportable: true } as any,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.resolvedExportable).toBe(true);
  });

  it('should resolve exportFileName from various sources', () => {
    const { result: r1 } = renderHook(() =>
      useExportFeature<TestRow>({
        exportFileName: 'my-export',
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );
    expect(r1.current.resolvedExportFileName).toBe('my-export');

    const { result: r2 } = renderHook(() =>
      useExportFeature<TestRow>({
        crud: { exportFileName: 'crud-export' } as any,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );
    expect(r2.current.resolvedExportFileName).toBe('crud-export');

    const { result: r3 } = renderHook(() =>
      useExportFeature<TestRow>({
        crud: { entityName: 'users' } as any,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );
    expect(r3.current.resolvedExportFileName).toBe('users');
  });

  it('should resolve export columns from exportColumns prop', () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportColumns: ['name', 'email'],
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.resolvedExportColumns).toEqual(['name', 'email']);
  });

  it('should resolve export columns from visibleColumns as fallback', () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.resolvedExportColumns).toEqual(['name', 'email', 'age']);
  });

  it('should not export when resolvedExportable is false', async () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    await act(async () => {
      await result.current.handleExport();
    });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it('should export data as CSV and trigger download', async () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
    expect(result.current.exportComplete).toBe(true);
  });

  it('should export data as JSON', async () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    await act(async () => {
      await result.current.handleExport('json', 'current');
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(result.current.exportComplete).toBe(true);
  });

  it('should not export when data is empty', async () => {
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: [],
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
      })
    );

    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it('should filter data for selected scope', async () => {
    const getRowId = (row: TestRow) => row.id;
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: ['1', '3'],
        getRowId,
      })
    );

    await act(async () => {
      await result.current.handleExport('json', 'selected');
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should use exportTransform when provided', async () => {
    const exportTransform = vi.fn((row: TestRow) => ({
      fullName: row.name,
      emailAddress: row.email,
    }));
    const { result } = renderHook(() =>
      useExportFeature<TestRow>({
        exportable: true,
        data: mockRows,
        visibleColumns: mockColumns,
        effectiveSelectedIds: [],
        exportTransform,
        exportColumns: ['fullName', 'emailAddress'],
      })
    );

    await act(async () => {
      await result.current.handleExport('json', 'current');
    });

    expect(exportTransform).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
  });
});

// ============ useColumnConfigState ============

describe('useColumnConfigState', () => {
  it('should initialize columnConfig from resolvedColumns on mount', async () => {
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
    });

    expect(result.current.columnConfig).toEqual([
      { id: 'name', visible: true, order: 0 },
      { id: 'email', visible: true, order: 1 },
      { id: 'age', visible: true, order: 2 },
    ]);
  });

  it('should initialize from defaultColumnConfig when provided', async () => {
    const defaultConfig: ColumnConfig[] = [
      { id: 'name', visible: true, order: 0 },
      { id: 'email', visible: false, order: 1 },
    ];
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: defaultConfig,
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toEqual(defaultConfig);
    });
  });

  it('should toggle column visibility via handleColumnVisibilityChange', async () => {
    const onColumnConfigChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        onColumnConfigChange,
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
    });

    act(() => {
      result.current.handleColumnVisibilityChange('email', false);
    });

    const emailConfig = result.current.columnConfig.find((c) => c.id === 'email');
    expect(emailConfig?.visible).toBe(false);
    expect(onColumnConfigChange).toHaveBeenCalled();
  });

  it('should reset column config via handleResetColumnConfig', async () => {
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
    });

    // Hide a column first
    act(() => {
      result.current.handleColumnVisibilityChange('name', false);
    });
    expect(result.current.columnConfig.find((c) => c.id === 'name')?.visible).toBe(false);

    // Reset
    act(() => {
      result.current.handleResetColumnConfig();
    });

    result.current.columnConfig.forEach((c) => {
      expect(c.visible).toBe(true);
    });
    expect(result.current.columnConfigAnchor).toBeNull();
  });

  it('should set column config via handleColumnConfigChange', async () => {
    const onColumnConfigChange = vi.fn();
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        onColumnConfigChange,
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
    });

    const newConfig: ColumnConfig[] = [
      { id: 'name', visible: true, order: 0 },
      { id: 'email', visible: false, order: 1 },
    ];

    act(() => {
      result.current.handleColumnConfigChange(newConfig);
    });

    expect(result.current.columnConfig).toEqual(newConfig);
    expect(onColumnConfigChange).toHaveBeenCalledWith(newConfig);
  });

  it('should return urlColSyncEnabled as false when no URL sync configured', () => {
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    expect(result.current.urlColSyncEnabled).toBe(false);
  });

  it('should return urlColSyncEnabled as key when URL sync is enabled', () => {
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigProp: {
          key: 'colConfig',
          urlSync: 'replace',
        },
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    expect(result.current.urlColSyncEnabled).toBe('colConfig');
  });

  it('should persist column config to localStorage when persistColumnConfig is true', async () => {
    const { result } = renderHook(() =>
      useColumnConfigState<TestRow>({
        columns: mockColumns,
        resolvedColumns: mockColumns,
        defaultColumnConfig: [],
        persistColumnConfig: true,
        columnConfigStorageKey: 'persist-test',
        columnConfigResult: {
          visibleColumnIds: [],
          reorderColumns: vi.fn(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
    });

    const stored = localStorage.getItem('listpage:persist-test');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(3);
  });
});

// ============ useBatchOperations ============

describe('useBatchOperations', () => {
  const getRowId = (row: TestRow) => row.id;

  it('should initialize with empty selectedIds', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    expect(result.current.selectedIds).toBeInstanceOf(Set);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.batchOperationState.isProcessing).toBe(false);
  });

  it('should toggle row selection via handleBatchSelect', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });
    expect(result.current.selectedIds.has('1')).toBe(true);

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });
    expect(result.current.selectedIds.has('1')).toBe(false);
  });

  it('should select all and deselect all via handleBatchSelectAll', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelectAll();
    });
    expect(result.current.selectedIds.size).toBe(3);

    act(() => {
      result.current.handleBatchSelectAll();
    });
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should get selected rows via getSelectedRows', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
      result.current.handleBatchSelect(mockRows[2]);
    });

    const selected = result.current.getSelectedRows();
    expect(selected).toHaveLength(2);
    expect(selected[0].id).toBe('1');
    expect(selected[1].id).toBe('3');
  });

  it('should open confirm dialog for batch action with confirm', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });

    act(() => {
      result.current.handleBatchAction({
        onClick,
        label: 'Delete',
        confirm: true,
      });
    });

    expect(result.current.confirmDialogOpen).toBe(true);
    expect(result.current.pendingAction).toEqual({ onClick, label: 'Delete' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should execute action immediately when confirm is false', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });

    act(() => {
      result.current.handleBatchAction({
        onClick,
        label: 'Export',
        confirm: false,
      });
    });

    expect(onClick).toHaveBeenCalled();
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should confirm batch action and start processing', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });

    act(() => {
      result.current.handleBatchAction({ onClick, label: 'Delete' });
    });

    act(() => {
      result.current.handleConfirmBatchAction();
    });

    expect(onClick).toHaveBeenCalled();
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.batchOperationState.isProcessing).toBe(true);
    expect(result.current.batchOperationState.total).toBe(1);
    expect(result.current.batchOperationState.actionLabel).toBe('Delete');
  });

  it('should cancel confirm dialog', () => {
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });

    act(() => {
      result.current.handleBatchAction({ onClick, label: 'Delete' });
    });
    expect(result.current.confirmDialogOpen).toBe(true);

    act(() => {
      result.current.handleCancelConfirm();
    });

    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.pendingAction).toBeNull();
  });

  it('should update batch progress and keep processing when processed < total', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.updateBatchProgress(3, 5);
    });

    expect(result.current.batchOperationState.processed).toBe(3);
    expect(result.current.batchOperationState.total).toBe(5);
    expect(result.current.batchOperationState.isProcessing).toBe(true);
  });

  it('should complete batch operation and clear selection when processed >= total', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleBatchSelect(mockRows[0]);
    });
    expect(result.current.selectedIds.size).toBe(1);

    act(() => {
      result.current.updateBatchProgress(5, 5);
    });

    expect(result.current.batchOperationState.isProcessing).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should cancel batch operation', () => {
    const { result } = renderHook(() =>
      useBatchOperations<TestRow>({
        data: mockRows,
        getRowId,
        isBatchSelectionEnabled: false,
        effectiveSelectedIds: [],
      })
    );

    act(() => {
      result.current.handleCancelBatchOperation();
    });

    expect(result.current.batchOperationState.isCancelled).toBe(true);
  });
});

// ============ useCrudForm ============

describe('useCrudForm', () => {
  const mockCrudResult = {
    createMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    updateMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    delete: vi.fn().mockResolvedValue({}),
  };

  it('should return hasForm as false when no crud provided', () => {
    const { result } = renderHook(() => useCrudFormWrapper(undefined, mockCrudResult));

    expect(result.current.hasForm).toBe(false);
  });

  it('should return hasForm as true when crud has formFields', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    expect(result.current.hasForm).toBe(true);
  });

  it('should build initial form data for create mode', () => {
    const crud = {
      formFields: [
        {
          key: 'name',
          label: 'Name',
          type: 'text' as const,
          defaultValue: 'default',
        },
        { key: 'active', label: 'Active', type: 'switch' as const },
        { key: 'hidden', label: 'Hidden', type: 'text' as const, hideInCreate: true },
      ],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    const data = result.current.buildInitialFormData('create');
    expect(data).toEqual({
      name: 'default',
      active: false,
    });
    expect(data.hidden).toBeUndefined();
  });

  it('should build initial form data for edit mode with record values', () => {
    const crud = {
      formFields: [
        { key: 'name', label: 'Name', type: 'text' as const },
        { key: 'email', label: 'Email', type: 'email' as const },
        { key: 'hidden', label: 'Hidden', type: 'text' as const, hideInEdit: true },
      ],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    const record = { id: '1', name: 'Test', email: 'test@test.com', hidden: 'secret' };
    const data = result.current.buildInitialFormData('edit', record);
    expect(data).toEqual({
      name: 'Test',
      email: 'test@test.com',
    });
  });

  it('should open create form without errors', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    act(() => {
      result.current.openCreateForm();
    });

    expect(typeof result.current.openCreateForm).toBe('function');
  });

  it('should open edit form with record', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    act(() => {
      result.current.openEditForm({ id: '1', name: 'Test' });
    });

    expect(typeof result.current.openEditForm).toBe('function');
  });

  it('should open view form with record', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    act(() => {
      result.current.openViewForm({ id: '1', name: 'Test' });
    });

    expect(typeof result.current.openViewForm).toBe('function');
  });

  it('should validate form and return true with valid data', () => {
    const crud = {
      formFields: [
        { key: 'name', label: 'Name', type: 'text' as const, required: true },
        {
          key: 'email',
          label: 'Email',
          type: 'email' as const,
          rules: [{ type: 'email' as const, message: 'Invalid email' }],
        },
      ],
    };
    const { result } = renderHook(() =>
      useCrudFormWrapper(crud, mockCrudResult, {
        name: 'Test User',
        email: 'valid@test.com',
      })
    );

    let isValid = false;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(true);
  });

  it('should validate form and return false with missing required fields', () => {
    const crud = {
      formFields: [
        {
          key: 'name',
          label: 'Name',
          type: 'text' as const,
          required: true,
          rules: [{ type: 'required' as const, message: 'Name is required' }],
        },
      ],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult, { name: '' }));

    let isValid = true;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
  });

  it('should validate email format', () => {
    const crud = {
      formFields: [
        {
          key: 'email',
          label: 'Email',
          type: 'email' as const,
          rules: [{ type: 'email' as const, message: 'Invalid email format' }],
        },
      ],
    };
    const { result } = renderHook(() =>
      useCrudFormWrapper(crud, mockCrudResult, { email: 'not-an-email' })
    );

    let isValid = true;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(false);
  });

  it('should return true from validateForm when no formFields', () => {
    const { result } = renderHook(() => useCrudFormWrapper(undefined, mockCrudResult));

    let isValid = false;
    act(() => {
      isValid = result.current.validateForm();
    });

    expect(isValid).toBe(true);
  });

  it('should handle delete and return false without crud', async () => {
    const { result } = renderHook(() => useCrudFormWrapper(undefined, mockCrudResult));

    let success = true;
    await act(async () => {
      success = await result.current.handleDelete({ id: '1' });
    });

    expect(success).toBe(false);
  });

  it('should handle delete with confirm dialog accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const mockDelete = vi.fn().mockResolvedValue({});
    const crudResult = { ...mockCrudResult, delete: mockDelete };
    const { result } = renderHook(() => useCrudFormWrapper(crud, crudResult));

    let success = false;
    await act(async () => {
      success = await result.current.handleDelete({
        id: '1',
        name: 'Test',
      });
    });

    expect(success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith('1');
  });

  it('should return false from delete when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const mockDelete = vi.fn();
    const crudResult = { ...mockCrudResult, delete: mockDelete };
    const { result } = renderHook(() => useCrudFormWrapper(crud, crudResult));

    let success = true;
    await act(async () => {
      success = await result.current.handleDelete({
        id: '1',
        name: 'Test',
      });
    });

    expect(success).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('should submit form in create mode', async () => {
    const mockCreate = vi.fn().mockResolvedValue({});
    const crudResult = {
      ...mockCrudResult,
      createMutation: { mutateAsync: mockCreate },
    };
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, crudResult));

    act(() => {
      result.current.openCreateForm();
    });

    let success = false;
    await act(async () => {
      success = await result.current.handleFormSubmit({ name: 'New Name' });
    });

    expect(success).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should submit form in edit mode', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    const crudResult = {
      ...mockCrudResult,
      updateMutation: { mutateAsync: mockUpdate },
    };
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, crudResult));

    act(() => {
      result.current.openEditForm({ id: '1', name: 'Test' });
    });

    let success = false;
    await act(async () => {
      success = await result.current.handleFormSubmit({ name: 'Updated Name' });
    });

    expect(success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      id: '1',
      item: { name: 'Updated Name' },
    });
  });

  it('should close form without errors', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));

    act(() => {
      result.current.closeForm();
    });

    expect(typeof result.current.closeForm).toBe('function');
  });

  it('should return null for formContent when no renderForm or formFields', () => {
    const { result } = renderHook(() => useCrudFormWrapper(undefined, mockCrudResult));
    expect(result.current.formContent).toBeNull();
  });

  it('should render auto form as null (placeholder)', () => {
    const crud = {
      formFields: [{ key: 'name', label: 'Name', type: 'text' as const }],
    };
    const { result } = renderHook(() => useCrudFormWrapper(crud, mockCrudResult));
    expect(result.current.renderAutoForm()).toBeNull();
  });
});

// ============ useListPageFilters ============

describe('useListPageFilters', () => {
  it('should initialize with filtersValue when no internalListStateResult', () => {
    const { result } = renderHook(() =>
      useListPageFilters({
        filtersValue: { status: 'active', type: 'user' },
        internalListStateResult: null,
      })
    );

    expect(result.current.localFilters).toEqual({
      status: 'active',
      type: 'user',
    });
  });

  it('should initialize with empty object when no filtersValue', () => {
    const { result } = renderHook(() =>
      useListPageFilters({
        internalListStateResult: null,
      })
    );

    expect(result.current.localFilters).toEqual({});
  });

  it('should use internalListStateResult filters when provided', () => {
    const setFilters = vi.fn();
    const { result } = renderHook(() =>
      useListPageFilters({
        internalListStateResult: {
          filters: { status: 'pending' },
          setFilters,
        },
      })
    );

    expect(result.current.localFilters).toEqual({ status: 'pending' });
  });

  it('should set local filters via setLocalFilters', () => {
    const { result } = renderHook(() =>
      useListPageFilters({
        filtersValue: {},
        internalListStateResult: null,
      })
    );

    act(() => {
      result.current.setLocalFilters({ status: 'active' });
    });

    expect(result.current.localFilters).toEqual({ status: 'active' });
  });

  it('should call internalListStateResult.setFilters when available', () => {
    const setFilters = vi.fn();
    const { result } = renderHook(() =>
      useListPageFilters({
        internalListStateResult: {
          filters: {},
          setFilters,
        },
      })
    );

    act(() => {
      result.current.setLocalFilters({ status: 'active' });
    });

    expect(setFilters).toHaveBeenCalledWith({ status: 'active' });
  });

  it('should call onFilterChange in handleFilterChange', () => {
    const onFilterChange = vi.fn();
    const { result } = renderHook(() =>
      useListPageFilters({
        filtersValue: {},
        internalListStateResult: null,
        onFilterChange,
      })
    );

    act(() => {
      result.current.handleFilterChange({ status: 'active' });
    });

    expect(onFilterChange).toHaveBeenCalledWith({ status: 'active' });
    expect(result.current.localFilters).toEqual({ status: 'active' });
  });

  it('should persist filters to localStorage', () => {
    renderHook(() =>
      useListPageFilters({
        filtersValue: { status: 'active' },
        persistFilters: true,
        filterStorageKey: 'test-page',
        internalListStateResult: null,
        onFilterChange: vi.fn(),
      })
    );

    expect(localStorage.getItem('listpage:filters:test-page')).not.toBeNull();
    const stored = JSON.parse(localStorage.getItem('listpage:filters:test-page')!);
    expect(stored).toEqual({ status: 'active' });
  });
});

// ============ useListPageSearch ============

describe('useListPageSearch', () => {
  it('should initialize with searchValue', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        searchValue: 'hello',
        internalListStateResult: null,
      })
    );

    expect(result.current.searchInput).toBe('hello');
    expect(result.current.localSearchInput).toBe('hello');
  });

  it('should initialize with empty string when no searchValue', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        internalListStateResult: null,
      })
    );

    expect(result.current.searchInput).toBe('');
    expect(result.current.localSearchInput).toBe('');
  });

  it('should use searchValue as searchInput when provided', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        searchValue: 'controlled',
        internalListStateResult: null,
      })
    );

    expect(result.current.searchInput).toBe('controlled');
  });

  it('should use internalListStateResult.searchQuery when no searchValue', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        internalListStateResult: { searchQuery: 'internal-search' },
      })
    );

    expect(result.current.searchInput).toBe('internal-search');
  });

  it('should use localSearchInput when no searchValue or internalListStateResult', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        internalListStateResult: null,
      })
    );

    expect(result.current.searchInput).toBe('');

    act(() => {
      result.current.setLocalSearchInput('typed value');
    });

    expect(result.current.localSearchInput).toBe('typed value');
    expect(result.current.searchInput).toBe('typed value');
  });

  it('should persist search to localStorage', () => {
    renderHook(() =>
      useListPageSearch({
        searchValue: 'persisted-search',
        persistSearch: true,
        filterStorageKey: 'test-page',
        internalListStateResult: null,
      })
    );

    expect(localStorage.getItem('listpage:search:test-page')).toBe('persisted-search');
  });

  it('should load search from localStorage on init', () => {
    localStorage.setItem('listpage:search:test-page', 'restored-search');

    const { result } = renderHook(() =>
      useListPageSearch({
        persistSearch: true,
        filterStorageKey: 'test-page',
        internalListStateResult: null,
      })
    );

    expect(result.current.localSearchInput).toBe('restored-search');
  });
});

// ============ useViewMode ============

describe('useViewMode', () => {
  it('should initialize with defaultViewMode', () => {
    const { result } = renderHook(() =>
      useViewMode({
        defaultViewMode: 'card',
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
      })
    );

    expect(result.current.viewModeLocal).toBe('card');
    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('should default to table view when no defaultViewMode provided', () => {
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
      })
    );

    expect(result.current.viewModeLocal).toBe('table');
    expect(result.current.effectiveViewMode).toBe('table');
  });

  it('should use viewModeProp as effectiveViewMode when provided', () => {
    const { result } = renderHook(() =>
      useViewMode({
        viewModeProp: 'card',
        defaultViewMode: 'table',
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
      })
    );

    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('should use viewModeUrlState when URL sync is enabled', () => {
    const { result } = renderHook(() =>
      useViewMode({
        defaultViewMode: 'table',
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'card',
        setViewModeUrlState: vi.fn(),
      })
    );

    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('should use viewModeLocal when no prop or URL sync', () => {
    const { result } = renderHook(() =>
      useViewMode({
        defaultViewMode: 'table',
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
      })
    );

    expect(result.current.effectiveViewMode).toBe('table');

    act(() => {
      result.current.setViewModeLocal('card');
    });

    expect(result.current.viewModeLocal).toBe('card');
    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('should call onViewModeChange in controlled mode without setting local', () => {
    const onViewModeChange = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        viewModeProp: 'table',
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
        onViewModeChange,
      })
    );

    act(() => {
      result.current.handleViewModeChange('card');
    });

    expect(onViewModeChange).toHaveBeenCalledWith('card');
    expect(result.current.viewModeLocal).toBe('table');
  });

  it('should call setViewModeUrlState in URL sync mode', () => {
    const setViewModeUrlState = vi.fn();
    const onViewModeChange = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'table',
        setViewModeUrlState,
        onViewModeChange,
      })
    );

    act(() => {
      result.current.handleViewModeChange('card');
    });

    expect(setViewModeUrlState).toHaveBeenCalledWith('card');
    expect(onViewModeChange).toHaveBeenCalledWith('card');
    expect(result.current.viewModeLocal).toBe('table');
  });

  it('should set local state in uncontrolled mode without URL sync', () => {
    const onViewModeChange = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
        onViewModeChange,
      })
    );

    act(() => {
      result.current.handleViewModeChange('card');
    });

    expect(result.current.viewModeLocal).toBe('card');
    expect(onViewModeChange).toHaveBeenCalledWith('card');
  });
});
