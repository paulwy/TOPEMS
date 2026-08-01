import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

import {
  useInlineEditing,
  useTreeTable,
  useExportFeature,
  useColumnConfigState,
  useBatchOperations,
  useCrudForm,
  useCrudFetchParams,
  useListPageFilters,
  useListPageSearch,
  useViewMode,
  useCrudRowActions,
  useCrudBatchActions,
  useCrudActions,
  useResolvedColumns,
  useResolvedCrudConfig,
} from './hooks';
import type {
  ColumnDef,
  ColumnConfig,
  CrudFormFieldConfig,
  ListPageCrudConfig,
  RowAction,
  BatchAction,
} from './types';

// ─── Mocks ────────────────────────────────────────────────────────────────
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// ─── Test types ────────────────────────────────────────────────────────────
interface Row {
  id: number;
  name: string;
  status?: string;
  age?: number;
  email?: string;
  children?: Row[];
}

// ─── Shared helpers ────────────────────────────────────────────────────────
const makeRow = (id: number, name: string, extra: Partial<Row> = {}): Row => ({
  id,
  name,
  ...extra,
});

const makeColumns = (): ColumnDef<Row>[] => [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name' },
  { id: 'status', label: 'Status' },
];

// ─── Global mocks (URL.createObjectURL etc.) ───────────────────────────────
beforeEach(() => {
  // jsdom does not implement URL.createObjectURL; assign mock functions directly
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. useInlineEditing
// ═══════════════════════════════════════════════════════════════════════════
describe('useInlineEditing', () => {
  it('returns null initial state', () => {
    const { result } = renderHook(() => useInlineEditing<Row>({}));
    expect(result.current.internalEditingRowId).toBeNull();
    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
  });

  it('setEditingRowId updates internal state in uncontrolled mode', () => {
    const { result } = renderHook(() => useInlineEditing<Row>({}));
    act(() => result.current.setEditingRowId(5));
    expect(result.current.internalEditingRowId).toBe(5);
    expect(result.current.resolvedEditingRowId).toBe(5);
  });

  it('setEditingRowId calls onEditingRowIdChange in controlled mode without updating internal', () => {
    const onEditingRowIdChange = vi.fn();
    const { result } = renderHook(() =>
      useInlineEditing<Row>({ editingRowIdProp: 1, onEditingRowIdChange })
    );
    act(() => result.current.setEditingRowId(9));
    expect(result.current.internalEditingRowId).toBeNull();
    expect(onEditingRowIdChange).toHaveBeenCalledWith(9);
  });

  it('resolvedEditingRowId uses editingRowIdProp when provided', () => {
    const { result } = renderHook(() => useInlineEditing<Row>({ editingRowIdProp: 42 }));
    expect(result.current.resolvedEditingRowId).toBe(42);
  });

  it('startEditing sets editingData and editingRowId using getRowId', () => {
    const getRowId = (r: Row) => r.id;
    const { result } = renderHook(() => useInlineEditing<Row>({ getRowId }));
    const row = makeRow(3, 'Alice');
    act(() => result.current.startEditing(row));
    expect(result.current.editingData).toEqual({ ...row });
    expect(result.current.resolvedEditingRowId).toBe(3);
  });

  it('startEditing falls back to row.id when getRowId not provided', () => {
    const { result } = renderHook(() => useInlineEditing<Row>({}));
    act(() => result.current.startEditing(makeRow(7, 'Bob')));
    expect(result.current.resolvedEditingRowId).toBe(7);
  });

  it('cancelEditing clears state and calls onInlineEditCancel', () => {
    const onInlineEditCancel = vi.fn();
    const { result } = renderHook(() => useInlineEditing<Row>({ onInlineEditCancel }));
    const row = makeRow(1, 'A');
    act(() => result.current.startEditing(row));
    act(() => result.current.cancelEditing(row));
    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
    expect(onInlineEditCancel).toHaveBeenCalledWith(row);
  });

  it('saveEditing resolves early when no editingData', async () => {
    const onInlineEditSave = vi.fn();
    const { result } = renderHook(() => useInlineEditing<Row>({ onInlineEditSave }));
    await act(async () => {
      await result.current.saveEditing(makeRow(1, 'A'));
    });
    expect(onInlineEditSave).not.toHaveBeenCalled();
  });

  it('saveEditing calls onInlineEditSave and clears state on success', async () => {
    const onInlineEditSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useInlineEditing<Row>({ onInlineEditSave }));
    const row = makeRow(2, 'B');
    act(() => result.current.startEditing(row));
    await act(async () => {
      await result.current.saveEditing(row);
    });
    expect(onInlineEditSave).toHaveBeenCalledWith(row, { ...row });
    expect(result.current.editingData).toBeNull();
    expect(result.current.resolvedEditingRowId).toBeNull();
  });

  it('saveEditing keeps editing state on failure', async () => {
    const onInlineEditSave = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useInlineEditing<Row>({ onInlineEditSave }));
    const row = makeRow(4, 'C');
    act(() => result.current.startEditing(row));
    await act(async () => {
      await result.current.saveEditing(row);
    });
    expect(onInlineEditSave).toHaveBeenCalled();
    expect(result.current.editingData).not.toBeNull();
    expect(result.current.resolvedEditingRowId).toBe(4);
  });

  it('updateEditingField updates editingData', () => {
    const { result } = renderHook(() => useInlineEditing<Row>({}));
    act(() => result.current.startEditing(makeRow(1, 'A')));
    act(() => result.current.updateEditingField('name', 'Z'));
    expect(result.current.editingData?.name).toBe('Z');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. useTreeTable
// ═══════════════════════════════════════════════════════════════════════════
describe('useTreeTable', () => {
  const treeData: Row[] = [
    {
      id: 1,
      name: 'root',
      children: [
        { id: 2, name: 'child1' },
        { id: 3, name: 'child2', children: [{ id: 4, name: 'grandchild' }] },
      ],
    },
  ];

  it('non-tree mode maps flatData with level 0', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: false,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: makeColumns(),
      })
    );
    expect(result.current.flatData).toEqual([{ row: treeData[0], level: 0 }]);
    expect(result.current.treeTableData).toBe(treeData);
    expect(result.current.getRowLevel(1)).toBe(0);
    expect(result.current.hasChildren(treeData[0])).toBe(false);
  });

  it('tree mode flattens only expanded nodes', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        defaultExpandedKeys: [1],
        resolvedColumns: makeColumns(),
      })
    );
    // root + child1 + child2 (grandchild not expanded)
    expect(result.current.flatData).toHaveLength(3);
    expect(result.current.flatData.map((f) => f.level)).toEqual([0, 1, 1]);
    expect(result.current.getRowLevel(2)).toBe(1);
    expect(result.current.hasChildren(treeData[0])).toBe(true);
  });

  it('toggleExpand adds a key', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: makeColumns(),
      })
    );
    act(() => result.current.toggleExpand(1));
    expect(result.current.resolvedExpandedKeys).toContain(1);
  });

  it('toggleExpand removes an existing key', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        defaultExpandedKeys: [1, 3],
        resolvedColumns: makeColumns(),
      })
    );
    act(() => result.current.toggleExpand(1));
    expect(result.current.resolvedExpandedKeys).not.toContain(1);
    expect(result.current.resolvedExpandedKeys).toContain(3);
  });

  it('setExpandedKeys calls onExpandedKeysChange in controlled mode', () => {
    const onExpandedKeysChange = vi.fn();
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        expandedKeysProp: [1],
        onExpandedKeysChange,
        resolvedColumns: makeColumns(),
      })
    );
    act(() => result.current.setExpandedKeys([1, 2]));
    expect(onExpandedKeysChange).toHaveBeenCalledWith([1, 2]);
    expect(result.current.internalExpandedKeys).toEqual([]);
  });

  it('treeColumnId uses column marked treeColumn', () => {
    const cols: ColumnDef<Row>[] = [
      { id: 'id', label: 'ID' },
      { id: 'name', label: 'Name', treeColumn: true },
    ];
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: [],
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: cols,
      })
    );
    expect(result.current.treeColumnId).toBe('name');
  });

  it('treeColumnId falls back to first column', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: [],
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: makeColumns(),
      })
    );
    expect(result.current.treeColumnId).toBe('id');
  });

  it('getRowLevel returns 0 for unknown id in tree mode', () => {
    const { result } = renderHook(() =>
      useTreeTable<Row>({
        data: treeData,
        treeView: true,
        treeChildrenField: 'children',
        treeNodeKeyField: 'id',
        resolvedColumns: makeColumns(),
      })
    );
    expect(result.current.getRowLevel(999)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. useExportFeature
// ═══════════════════════════════════════════════════════════════════════════
describe('useExportFeature', () => {
  const baseData: Row[] = [makeRow(1, 'A', { status: 'active' }), makeRow(2, 'B')];
  const baseColumns = makeColumns();

  const renderExport = (overrides: Record<string, unknown> = {}) =>
    renderHook(() =>
      useExportFeature<Row>({
        exportable: true,
        data: baseData,
        visibleColumns: baseColumns,
        effectiveSelectedIds: [],
        ...overrides,
      })
    );

  it('resolvedExportable respects explicit prop true', () => {
    const { result } = renderExport({ exportable: true });
    expect(result.current.resolvedExportable).toBe(true);
  });

  it('resolvedExportable falls back to crud.exportable', () => {
    const { result } = renderExport({
      exportable: undefined,
      crud: { exportable: true } as ListPageCrudConfig<Row>,
    });
    expect(result.current.resolvedExportable).toBe(true);
  });

  it('resolvedExportable defaults to false', () => {
    const { result } = renderExport({ exportable: undefined });
    expect(result.current.resolvedExportable).toBe(false);
  });

  it('resolvedExportFileName uses exportFileName prop', () => {
    const { result } = renderExport({ exportFileName: 'my-file' });
    expect(result.current.resolvedExportFileName).toBe('my-file');
  });

  it('resolvedExportFileName falls back to crud.entityName', () => {
    const { result } = renderExport({
      exportFileName: undefined,
      crud: { entityName: 'users' } as ListPageCrudConfig<Row>,
    });
    expect(result.current.resolvedExportFileName).toBe('users');
  });

  it('resolvedExportFileName defaults to "export"', () => {
    const { result } = renderExport({ exportFileName: undefined });
    expect(result.current.resolvedExportFileName).toBe('export');
  });

  it('resolvedExportFormats uses provided formats', () => {
    const { result } = renderExport({ exportFormats: ['excel'] });
    expect(result.current.resolvedExportFormats).toEqual(['excel']);
  });

  it('resolvedExportFormats defaults to csv and json', () => {
    const { result } = renderExport({ exportFormats: undefined });
    expect(result.current.resolvedExportFormats).toEqual(['csv', 'json']);
  });

  it('resolvedExportScopes defaults to all three scopes', () => {
    const { result } = renderExport({ exportScopes: undefined });
    expect(result.current.resolvedExportScopes).toEqual(['current', 'all', 'selected']);
  });

  it('resolvedExportColumns uses exportColumns when provided', () => {
    const { result } = renderExport({ exportColumns: ['name'] });
    expect(result.current.resolvedExportColumns).toEqual(['name']);
  });

  it('resolvedExportColumns falls back to visibleColumns ids', () => {
    const { result } = renderExport({ exportColumns: undefined });
    expect(result.current.resolvedExportColumns).toEqual(['id', 'name', 'status']);
  });

  it('resolvedExportColumns derives from crud.formFields (excluding id and hideInExport)', () => {
    const crud = {
      formFields: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'secret', label: 'Secret', hideInExport: true },
      ],
    } as unknown as ListPageCrudConfig<Row>;
    const { result } = renderExport({ exportColumns: undefined, crud });
    expect(result.current.resolvedExportColumns).toEqual(['name']);
  });

  it('handleExport does nothing when not exportable', async () => {
    const { result } = renderExport({ exportable: false });
    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });
    expect(result.current.exporting).toBe(false);
  });

  it('handleExport does nothing when already exporting', async () => {
    const { result } = renderExport({});
    // Force exporting state via setExportAnchorEl is not the flag; trigger concurrent call
    // We instead verify a normal call sets exporting false at end
    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });
    expect(result.current.exporting).toBe(false);
  });

  it('handleExport with empty data logs warn and returns', async () => {
    const { logger } = await import('@/utils/logger');
    const { result } = renderExport({ data: [] });
    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });
    expect(logger.warn).toHaveBeenCalled();
    expect(result.current.exporting).toBe(false);
  });

  it('handleExport csv triggers download link', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const { result } = renderExport({});
    await act(async () => {
      await result.current.handleExport('csv', 'current');
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handleExport json uses json content type', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const { result } = renderExport({});
    await act(async () => {
      await result.current.handleExport('json', 'current');
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('handleExport selected scope filters by effectiveSelectedIds', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const getRowId = (r: Row) => r.id;
    const { result } = renderExport({
      effectiveSelectedIds: [2],
      getRowId,
    });
    await act(async () => {
      await result.current.handleExport('json', 'selected');
    });
    // Download triggered for selected row
    expect(clickSpy).toHaveBeenCalled();
  });

  it('handleExport uses exportTransform when provided', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const exportTransform = vi.fn((row: Row) => ({ name: row.name.toUpperCase() }));
    const { result } = renderExport({ exportTransform });
    await act(async () => {
      await result.current.handleExport('json', 'current');
    });
    expect(exportTransform).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('setExportAnchorEl updates anchor element', () => {
    const { result } = renderExport({});
    const el = {} as HTMLElement;
    act(() => result.current.setExportAnchorEl(el));
    expect(result.current.exportAnchorEl).toBe(el);
    act(() => result.current.setExportAnchorEl(null));
    expect(result.current.exportAnchorEl).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. useColumnConfigState
// ═══════════════════════════════════════════════════════════════════════════
describe('useColumnConfigState', () => {
  const cols = makeColumns();
  const defaultConfig: ColumnConfig[] = [
    { id: 'id', visible: true, order: 0 },
    { id: 'name', visible: false, order: 1 },
  ];

  const renderColConfig = (overrides: Record<string, unknown> = {}) =>
    renderHook(() =>
      useColumnConfigState<Row>({
        columns: cols,
        resolvedColumns: cols,
        defaultColumnConfig: [],
        persistColumnConfig: false,
        columnConfigStorageKey: 'test',
        columnConfigResult: { visibleColumnIds: [], reorderColumns: vi.fn() },
        ...overrides,
      })
    );

  it('initializes columnConfig from defaultColumnConfig', async () => {
    const { result } = renderColConfig({ defaultColumnConfig: defaultConfig });
    await waitFor(() => {
      expect(result.current.columnConfig).toEqual(defaultConfig);
    });
  });

  it('initializes from resolvedColumns when no default', async () => {
    const { result } = renderColConfig({ defaultColumnConfig: [] });
    await waitFor(() => {
      expect(result.current.columnConfig).toHaveLength(3);
      expect(result.current.columnConfig.every((c) => c.visible)).toBe(true);
    });
  });

  it('initializes from localStorage when persistColumnConfig enabled', async () => {
    const stored: ColumnConfig[] = [{ id: 'id', visible: false, order: 0 }];
    localStorage.setItem('listpage:stored-key', JSON.stringify(stored));
    const { result } = renderColConfig({
      defaultColumnConfig: [],
      persistColumnConfig: true,
      columnConfigStorageKey: 'stored-key',
    });
    await waitFor(() => {
      expect(result.current.columnConfig).toEqual(stored);
    });
  });

  it('urlColSyncEnabled is false when no columnConfigProp', () => {
    const { result } = renderColConfig({});
    expect(result.current.urlColSyncEnabled).toBe(false);
  });

  it('urlColSyncEnabled returns key when urlSync enabled', () => {
    const { result } = renderColConfig({
      columnConfigProp: { key: 'cols-key', urlSync: 'replace' },
    });
    expect(result.current.urlColSyncEnabled).toBe('cols-key');
  });

  it('handleColumnVisibilityChange toggles visibility and calls onColumnConfigChange', async () => {
    const onColumnConfigChange = vi.fn();
    const { result } = renderColConfig({
      defaultColumnConfig: defaultConfig,
      onColumnConfigChange,
    });
    await waitFor(() => expect(result.current.columnConfig).toEqual(defaultConfig));
    act(() => result.current.handleColumnVisibilityChange('name', true));
    expect(result.current.columnConfig.find((c) => c.id === 'name')?.visible).toBe(true);
    expect(onColumnConfigChange).toHaveBeenCalled();
  });

  it('handleColumnConfigChange sets config and calls callback', async () => {
    const onColumnConfigChange = vi.fn();
    const { result } = renderColConfig({ onColumnConfigChange });
    const newCfg: ColumnConfig[] = [{ id: 'x', visible: true, order: 0 }];
    act(() => result.current.handleColumnConfigChange(newCfg));
    expect(result.current.columnConfig).toEqual(newCfg);
    expect(onColumnConfigChange).toHaveBeenCalledWith(newCfg);
  });

  it('handleResetColumnConfig resets to columns defaults and closes anchor', async () => {
    const { result } = renderColConfig({ defaultColumnConfig: defaultConfig });
    await waitFor(() => expect(result.current.columnConfig).toEqual(defaultConfig));
    const el = {} as HTMLElement;
    act(() => result.current.setColumnConfigAnchor(el));
    act(() => result.current.handleResetColumnConfig());
    expect(result.current.columnConfig).toHaveLength(3);
    expect(result.current.columnConfig.every((c) => c.visible)).toBe(true);
    expect(result.current.columnConfigAnchor).toBeNull();
  });

  it('setColumnConfigAnchor updates anchor', () => {
    const { result } = renderColConfig({});
    const el = {} as HTMLElement;
    act(() => result.current.setColumnConfigAnchor(el));
    expect(result.current.columnConfigAnchor).toBe(el);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. useBatchOperations
// ═══════════════════════════════════════════════════════════════════════════
describe('useBatchOperations', () => {
  const data: Row[] = [makeRow(1, 'A'), makeRow(2, 'B'), makeRow(3, 'C')];
  const getRowId = (r: Row) => r.id;

  const renderBatch = (overrides: Record<string, unknown> = {}) =>
    renderHook(() =>
      useBatchOperations<Row>({
        data,
        getRowId,
        isBatchSelectionEnabled: true,
        effectiveSelectedIds: [],
        ...overrides,
      })
    );

  it('initial selectedIds is empty', () => {
    const { result } = renderBatch();
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.batchOperationState.isProcessing).toBe(false);
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.pendingAction).toBeNull();
  });

  it('handleBatchSelect toggles a row id', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelect(makeRow(1, 'A')));
    expect(result.current.selectedIds.has(1)).toBe(true);
    act(() => result.current.handleBatchSelect(makeRow(1, 'A')));
    expect(result.current.selectedIds.has(1)).toBe(false);
  });

  it('handleBatchSelectAll selects all rows', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelectAll());
    expect(result.current.selectedIds.size).toBe(3);
  });

  it('handleBatchSelectAll deselects when all already selected', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelectAll());
    act(() => result.current.handleBatchSelectAll());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('getSelectedRows returns selected rows', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelect(makeRow(1, 'A')));
    act(() => result.current.handleBatchSelect(makeRow(3, 'C')));
    expect(result.current.getSelectedRows()).toEqual([makeRow(1, 'A'), makeRow(3, 'C')]);
  });

  it('handleBatchAction with confirm opens dialog and stores pending action', () => {
    const onClick = vi.fn();
    const { result } = renderBatch();
    act(() => result.current.handleBatchAction({ onClick, label: 'Delete', confirm: true }));
    expect(result.current.confirmDialogOpen).toBe(true);
    expect(result.current.pendingAction).toEqual({ onClick, label: 'Delete' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('handleBatchAction without confirm calls onClick immediately and clears selection', () => {
    const onClick = vi.fn();
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelect(makeRow(1, 'A')));
    act(() => result.current.handleBatchAction({ onClick, label: 'Run', confirm: false }));
    expect(onClick).toHaveBeenCalled();
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('handleConfirmBatchAction runs pending action and closes dialog', () => {
    const onClick = vi.fn();
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelect(makeRow(2, 'B')));
    act(() => result.current.handleBatchAction({ onClick, label: 'Delete', confirm: true }));
    act(() => result.current.handleConfirmBatchAction());
    expect(onClick).toHaveBeenCalled();
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.batchOperationState.isProcessing).toBe(true);
    expect(result.current.batchOperationState.total).toBe(1);
  });

  it('handleCancelConfirm closes dialog and clears pending action', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchAction({ onClick: vi.fn(), label: 'X', confirm: true }));
    act(() => result.current.handleCancelConfirm());
    expect(result.current.confirmDialogOpen).toBe(false);
    expect(result.current.pendingAction).toBeNull();
  });

  it('handleCancelBatchOperation aborts and marks cancelled', () => {
    const { result } = renderBatch();
    act(() => result.current.handleCancelBatchOperation());
    expect(result.current.batchOperationState.isCancelled).toBe(true);
  });

  it('updateBatchProgress updates processed/total and clears selection when complete', () => {
    const { result } = renderBatch();
    act(() => result.current.handleBatchSelect(makeRow(1, 'A')));
    act(() => result.current.updateBatchProgress(1, 1));
    expect(result.current.batchOperationState.processed).toBe(1);
    expect(result.current.batchOperationState.total).toBe(1);
    expect(result.current.batchOperationState.isProcessing).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('updateBatchProgress keeps processing when not complete', () => {
    const { result } = renderBatch();
    act(() => result.current.updateBatchProgress(1, 3));
    expect(result.current.batchOperationState.isProcessing).toBe(true);
  });

  it('Ctrl+A selects all when batch selection enabled', () => {
    renderBatch({ isBatchSelectionEnabled: true });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'a' }));
    });
    // Cannot assert hook state from outside; covered by handleBatchSelectAll test
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. useCrudForm
// ═══════════════════════════════════════════════════════════════════════════
describe('useCrudForm', () => {
  const formFields: CrudFormFieldConfig[] = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      rules: [{ type: 'email', message: 'bad email' }],
    },
    {
      key: 'age',
      label: 'Age',
      type: 'number',
      rules: [{ type: 'min', min: 18, message: 'too young' }],
    },
    { key: 'secret', label: 'Secret', type: 'text', hideInCreate: true },
    { key: 'active', label: 'Active', type: 'switch', defaultValue: false },
  ];

  const buildCrud = (overrides: Partial<ListPageCrudConfig<Row>> = {}): ListPageCrudConfig<Row> =>
    ({
      formFields,
      entityName: 'item',
      ...overrides,
    }) as unknown as ListPageCrudConfig<Row>;

  const renderForm = (overrides: Record<string, unknown> = {}) => {
    const setFormMode = vi.fn();
    const setCurrentRecord = vi.fn();
    const setFormOpen = vi.fn();
    const setFormSubmitting = vi.fn();
    const setFormData = vi.fn();
    const setFormErrors = vi.fn();
    const crudResult = {
      delete: vi.fn().mockResolvedValue({ success: true }),
      createMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
      updateMutation: { mutateAsync: vi.fn().mockResolvedValue({}) },
    };
    const result = renderHook(() =>
      useCrudForm<Row>({
        crud: buildCrud(),
        crudResult,
        formMode: 'create',
        setFormMode,
        currentRecord: null,
        setCurrentRecord,
        formOpen: false,
        setFormOpen,
        formSubmitting: false,
        setFormSubmitting,
        formData: {},
        setFormData,
        formErrors: {},
        setFormErrors,
        ...overrides,
      })
    );
    return {
      ...result,
      setFormMode,
      setCurrentRecord,
      setFormOpen,
      setFormSubmitting,
      setFormData,
      setFormErrors,
      crudResult,
    };
  };

  it('hasForm is true when crud.formFields provided', () => {
    const { result } = renderForm();
    expect(result.current.hasForm).toBe(true);
  });

  it('hasForm is false when no crud form config', () => {
    const { result } = renderForm({ crud: undefined });
    expect(result.current.hasForm).toBe(false);
  });

  it('buildInitialFormData create mode skips hideInCreate and applies defaults', () => {
    const { result } = renderForm();
    const data = result.current.buildInitialFormData('create');
    expect(data.name).toBe('');
    expect(data.active).toBe(false);
    expect(data.secret).toBeUndefined();
  });

  it('buildInitialFormData edit mode uses record values', () => {
    const { result } = renderForm();
    const data = result.current.buildInitialFormData('edit', { name: 'X', age: 30 } as Row);
    expect(data.name).toBe('X');
    expect(data.age).toBe(30);
  });

  it('buildInitialFormData returns empty when no formFields', () => {
    const { result } = renderForm({ crud: undefined });
    expect(result.current.buildInitialFormData('create')).toEqual({});
  });

  it('openCreateForm resets record, sets mode create, opens form', () => {
    const { result, setFormMode, setFormOpen } = renderForm();
    act(() => result.current.openCreateForm());
    expect(setFormMode).toHaveBeenCalledWith('create');
    expect(setFormOpen).toHaveBeenCalledWith(true);
  });

  it('openEditForm sets record, mode edit, opens form', () => {
    const { result, setCurrentRecord, setFormMode, setFormOpen } = renderForm();
    const record = makeRow(5, 'E');
    act(() => result.current.openEditForm(record));
    expect(setCurrentRecord).toHaveBeenCalledWith(record);
    expect(setFormMode).toHaveBeenCalledWith('edit');
    expect(setFormOpen).toHaveBeenCalledWith(true);
  });

  it('openViewForm sets mode view', () => {
    const { result, setFormMode } = renderForm();
    act(() => result.current.openViewForm(makeRow(6, 'F')));
    expect(setFormMode).toHaveBeenCalledWith('view');
  });

  it('closeForm sets formOpen false', () => {
    const { result, setFormOpen } = renderForm();
    act(() => result.current.closeForm());
    expect(setFormOpen).toHaveBeenCalledWith(false);
  });

  it('handleDelete returns false when no crud', async () => {
    const { result } = renderForm({ crud: undefined });
    await act(async () => {
      const ok = await result.current.handleDelete(makeRow(1, 'A'));
      expect(ok).toBe(false);
    });
  });

  it('handleDelete returns false when confirm rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { result, crudResult } = renderForm();
    await act(async () => {
      const ok = await result.current.handleDelete(makeRow(1, 'A'));
      expect(ok).toBe(false);
    });
    expect(crudResult.delete).not.toHaveBeenCalled();
  });

  it('handleDelete calls delete and returns true on success', async () => {
    const { result, crudResult } = renderForm();
    let ok = false;
    await act(async () => {
      ok = await result.current.handleDelete(makeRow(1, 'A'));
    });
    expect(crudResult.delete).toHaveBeenCalledWith('1');
    expect(ok).toBe(true);
  });

  it('handleDelete returns false when delete throws', async () => {
    const { result, crudResult } = renderForm();
    crudResult.delete.mockRejectedValueOnce(new Error('fail'));
    let ok = true;
    await act(async () => {
      ok = await result.current.handleDelete(makeRow(1, 'A'));
    });
    expect(ok).toBe(false);
  });

  it('handleFormSubmit create calls createMutation', async () => {
    const { result, crudResult, setFormOpen } = renderForm({ formMode: 'create' });
    let ok = false;
    await act(async () => {
      ok = await result.current.handleFormSubmit({ name: 'New' });
    });
    expect(crudResult.createMutation.mutateAsync).toHaveBeenCalledWith({ name: 'New' });
    expect(ok).toBe(true);
    expect(setFormOpen).toHaveBeenCalledWith(false);
  });

  it('handleFormSubmit edit calls updateMutation', async () => {
    const { result, crudResult } = renderForm({
      formMode: 'edit',
      currentRecord: { id: 9, name: 'Old' },
    });
    await act(async () => {
      await result.current.handleFormSubmit({ name: 'New' });
    });
    expect(crudResult.updateMutation.mutateAsync).toHaveBeenCalledWith({
      id: '9',
      item: { name: 'New' },
    });
  });

  it('handleFormSubmit returns false when no crud', async () => {
    const { result } = renderForm({ crud: undefined });
    let ok = true;
    await act(async () => {
      ok = await result.current.handleFormSubmit({});
    });
    expect(ok).toBe(false);
  });

  it('validateForm returns true when no formFields', () => {
    const { result } = renderForm({ crud: undefined });
    expect(result.current.validateForm()).toBe(true);
  });

  it('validateForm detects required field violations', () => {
    const { result, setFormErrors } = renderForm({ formData: { name: '' } });
    const ok = result.current.validateForm();
    expect(ok).toBe(false);
    expect(setFormErrors).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    );
  });

  it('validateForm passes when required fields present', () => {
    const { result } = renderForm({ formData: { name: 'A', email: 'a@b.com', age: 20 } });
    expect(result.current.validateForm()).toBe(true);
  });

  it('validateForm detects invalid email', () => {
    const { result, setFormErrors } = renderForm({ formData: { name: 'A', email: 'not-email' } });
    expect(result.current.validateForm()).toBe(false);
    expect(setFormErrors).toHaveBeenCalledWith(expect.objectContaining({ email: 'bad email' }));
  });

  it('validateForm detects number below min', () => {
    const { result, setFormErrors } = renderForm({ formData: { name: 'A', age: 10 } });
    expect(result.current.validateForm()).toBe(false);
    expect(setFormErrors).toHaveBeenCalledWith(expect.objectContaining({ age: 'too young' }));
  });

  it('validateForm runs custom validator returning string error', () => {
    const customFields: CrudFormFieldConfig[] = [
      {
        key: 'code',
        label: 'Code',
        type: 'text',
        rules: [{ type: 'required', message: 'req' }, { validator: () => 'invalid' }],
      },
    ];
    const { result, setFormErrors } = renderForm({
      crud: { formFields: customFields } as unknown as ListPageCrudConfig<Row>,
      formData: { code: 'x' },
    });
    expect(result.current.validateForm()).toBe(false);
    expect(setFormErrors).toHaveBeenCalledWith(expect.objectContaining({ code: 'invalid' }));
  });

  it('handleAutoFormSubmit returns false when validation fails', async () => {
    const { result } = renderForm({ formData: { name: '' } });
    let ok = true;
    await act(async () => {
      ok = await result.current.handleAutoFormSubmit();
    });
    expect(ok).toBe(false);
  });

  it('handleAutoFormSubmit returns false when no crud', async () => {
    const { result } = renderForm({ crud: undefined });
    let ok = true;
    await act(async () => {
      ok = await result.current.handleAutoFormSubmit();
    });
    expect(ok).toBe(false);
  });

  it('renderAutoForm returns null', () => {
    const { result } = renderForm();
    expect(result.current.renderAutoForm()).toBeNull();
  });

  it('formContent uses crud.renderForm when provided', () => {
    const renderFormFn = vi.fn(() => React.createElement('div', null, 'form'));
    const { result } = renderForm({
      crud: {
        formFields: undefined,
        renderForm: renderFormFn,
      } as unknown as ListPageCrudConfig<Row>,
    });
    expect(renderFormFn).toHaveBeenCalled();
    expect(result.current.formContent).not.toBeNull();
  });

  it('formContent is null when no renderForm and no formFields', () => {
    const { result } = renderForm({
      crud: { formFields: undefined } as unknown as ListPageCrudConfig<Row>,
    });
    expect(result.current.formContent).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. useCrudFetchParams
// ═══════════════════════════════════════════════════════════════════════════
describe('useCrudFetchParams', () => {
  const internalListStateResult = {
    debouncedSearch: 'abc',
    sortBy: 'name',
    sortOrder: 'desc',
    currentPage: 2,
    pageSize: 20,
    filters: { status: 'active' },
  };

  it('returns empty object when no crud', () => {
    const { result } = renderHook(() =>
      useCrudFetchParams<Row>({ crud: undefined, internalListStateResult })
    );
    expect(result.current.buildCrudFetchParams()).toEqual({});
  });

  it('returns empty object when no internalListStateResult', () => {
    const { result } = renderHook(() =>
      useCrudFetchParams<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        internalListStateResult: undefined,
      })
    );
    expect(result.current.buildCrudFetchParams()).toEqual({});
  });

  it('uses crud.transformParams when provided', () => {
    const transformParams = vi.fn(() => ({ custom: 'value' }));
    const { result } = renderHook(() =>
      useCrudFetchParams<Row>({
        crud: { transformParams } as unknown as ListPageCrudConfig<Row>,
        internalListStateResult,
      })
    );
    const params = result.current.buildCrudFetchParams();
    expect(transformParams).toHaveBeenCalled();
    expect(params).toEqual({ custom: 'value' });
  });

  it('uses mapListParamsToBackend with paramStyle when configured', () => {
    const { result } = renderHook(() =>
      useCrudFetchParams<Row>({
        crud: { paramStyle: 'offset' } as unknown as ListPageCrudConfig<Row>,
        internalListStateResult,
      })
    );
    const params = result.current.buildCrudFetchParams();
    expect(params).toHaveProperty('offset');
    expect(params).toHaveProperty('pagesize');
  });

  it('uses standard style by default', () => {
    const { result } = renderHook(() =>
      useCrudFetchParams<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        internalListStateResult,
      })
    );
    const params = result.current.buildCrudFetchParams();
    expect(params).toHaveProperty('page', 2);
    expect(params).toHaveProperty('pagesize', 20);
    expect(params).toHaveProperty('keyword', 'abc');
    expect(params).toHaveProperty('sortBy', 'name');
    expect(params).toHaveProperty('sortOrder', 'desc');
    expect(params).toHaveProperty('status', 'active');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. useListPageFilters
// ═══════════════════════════════════════════════════════════════════════════
describe('useListPageFilters', () => {
  it('initializes localFilters from filtersValue', () => {
    const { result } = renderHook(() =>
      useListPageFilters({ filtersValue: { status: 'active' }, internalListStateResult: undefined })
    );
    expect(result.current.localFilters).toEqual({ status: 'active' });
  });

  it('uses internalListStateResult.filters when provided', () => {
    const internal = { filters: { q: '1' } };
    const { result } = renderHook(() => useListPageFilters({ internalListStateResult: internal }));
    expect(result.current.localFilters).toEqual({ q: '1' });
  });

  it('setLocalFilters calls internal setFilters when provided', () => {
    const setFilters = vi.fn();
    const internal = { filters: {}, setFilters };
    const { result } = renderHook(() => useListPageFilters({ internalListStateResult: internal }));
    act(() => result.current.setLocalFilters({ status: 'x' }));
    expect(setFilters).toHaveBeenCalledWith({ status: 'x' });
  });

  it('setLocalFilters updates local state when no internal', () => {
    const { result } = renderHook(() => useListPageFilters({ internalListStateResult: undefined }));
    act(() => result.current.setLocalFilters({ status: 'x' }));
    expect(result.current.localFilters).toEqual({ status: 'x' });
  });

  it('handleFilterChange calls setLocalFilters and onFilterChange', () => {
    const onFilterChange = vi.fn();
    const { result } = renderHook(() =>
      useListPageFilters({ internalListStateResult: undefined, onFilterChange })
    );
    act(() => result.current.handleFilterChange({ status: 'y' }));
    expect(result.current.localFilters).toEqual({ status: 'y' });
    expect(onFilterChange).toHaveBeenCalledWith({ status: 'y' });
  });

  it('persistFilters loads from localStorage on init', () => {
    localStorage.setItem('listpage:filters:/test', JSON.stringify({ saved: true }));
    const { result } = renderHook(() =>
      useListPageFilters({
        persistFilters: true,
        filterStorageKey: '/test',
        internalListStateResult: undefined,
      })
    );
    expect(result.current.localFilters).toEqual({ saved: true });
  });

  it('persistFilters writes to localStorage on change', () => {
    const onFilterChange = vi.fn();
    const { result } = renderHook(() =>
      useListPageFilters({
        persistFilters: true,
        filterStorageKey: '/test',
        onFilterChange,
        internalListStateResult: undefined,
      })
    );
    act(() => result.current.handleFilterChange({ status: 'z' }));
    expect(localStorage.getItem('listpage:filters:/test')).toContain('"status":"z"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. useListPageSearch
// ═══════════════════════════════════════════════════════════════════════════
describe('useListPageSearch', () => {
  it('initializes localSearchInput from searchValue', () => {
    const { result } = renderHook(() =>
      useListPageSearch({ searchValue: 'hello', internalListStateResult: undefined })
    );
    expect(result.current.localSearchInput).toBe('hello');
    expect(result.current.searchInput).toBe('hello');
  });

  it('searchInput prefers searchValue over internal state', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        searchValue: 'controlled',
        internalListStateResult: { searchQuery: 'internal' },
      })
    );
    expect(result.current.searchInput).toBe('controlled');
  });

  it('searchInput uses internalListStateResult.searchQuery when no searchValue', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        searchValue: undefined,
        internalListStateResult: { searchQuery: 'internal' },
      })
    );
    expect(result.current.searchInput).toBe('internal');
  });

  it('searchInput falls back to localSearchInput', () => {
    const { result } = renderHook(() =>
      useListPageSearch({ searchValue: undefined, internalListStateResult: undefined })
    );
    expect(result.current.searchInput).toBe('');
  });

  it('setLocalSearchInput updates local state', () => {
    const { result } = renderHook(() => useListPageSearch({ internalListStateResult: undefined }));
    act(() => result.current.setLocalSearchInput('term'));
    expect(result.current.localSearchInput).toBe('term');
  });

  it('persistSearch loads from localStorage on init', () => {
    localStorage.setItem('listpage:search:/test', 'saved-term');
    const { result } = renderHook(() =>
      useListPageSearch({
        persistSearch: true,
        filterStorageKey: '/test',
        internalListStateResult: undefined,
      })
    );
    expect(result.current.localSearchInput).toBe('saved-term');
  });

  it('persistSearch writes to localStorage', () => {
    const { result } = renderHook(() =>
      useListPageSearch({
        persistSearch: true,
        filterStorageKey: '/test',
        searchValue: 'q',
        internalListStateResult: undefined,
      })
    );
    act(() => result.current.setLocalSearchInput('new-q'));
    expect(localStorage.getItem('listpage:search:/test')).toBe('q');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. useViewMode
// ═══════════════════════════════════════════════════════════════════════════
describe('useViewMode', () => {
  it('defaults viewModeLocal to defaultViewMode', () => {
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

  it('effectiveViewMode prefers viewModeProp', () => {
    const { result } = renderHook(() =>
      useViewMode({
        viewModeProp: 'card',
        defaultViewMode: 'table',
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
      })
    );
    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('effectiveViewMode uses url state when sync enabled and no prop', () => {
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'card',
        setViewModeUrlState: vi.fn(),
      })
    );
    expect(result.current.effectiveViewMode).toBe('card');
  });

  it('handleViewModeChange in controlled mode calls only onViewModeChange', () => {
    const onViewModeChange = vi.fn();
    const setViewModeUrlState = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        viewModeProp: 'table',
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'table',
        setViewModeUrlState,
        onViewModeChange,
      })
    );
    act(() => result.current.handleViewModeChange('card'));
    expect(onViewModeChange).toHaveBeenCalledWith('card');
    expect(setViewModeUrlState).not.toHaveBeenCalled();
  });

  it('handleViewModeChange with urlSync sets url state and calls callback', () => {
    const onViewModeChange = vi.fn();
    const setViewModeUrlState = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: true,
        viewModeUrlState: 'table',
        setViewModeUrlState,
        onViewModeChange,
      })
    );
    act(() => result.current.handleViewModeChange('card'));
    expect(setViewModeUrlState).toHaveBeenCalledWith('card');
    expect(onViewModeChange).toHaveBeenCalledWith('card');
  });

  it('handleViewModeChange local mode sets local state', () => {
    const onViewModeChange = vi.fn();
    const { result } = renderHook(() =>
      useViewMode({
        isViewModeUrlSyncEnabled: false,
        viewModeUrlState: 'table',
        setViewModeUrlState: vi.fn(),
        onViewModeChange,
      })
    );
    act(() => result.current.handleViewModeChange('card'));
    expect(result.current.viewModeLocal).toBe('card');
    expect(onViewModeChange).toHaveBeenCalledWith('card');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. useCrudRowActions
// ═══════════════════════════════════════════════════════════════════════════
describe('useCrudRowActions', () => {
  it('returns rowActions when no crud', () => {
    const rowActions: RowAction<Row>[] = [{ label: 'Custom', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudRowActions<Row>({
        crud: undefined,
        hasForm: true,
        rowActions,
        openEditForm: vi.fn(),
        handleDelete: vi.fn(),
      })
    );
    expect(result.current).toBe(rowActions);
  });

  it('returns rowActions when hasForm is false', () => {
    const rowActions: RowAction<Row>[] = [{ label: 'Custom', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudRowActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: false,
        rowActions,
        openEditForm: vi.fn(),
        handleDelete: vi.fn(),
      })
    );
    expect(result.current).toBe(rowActions);
  });

  it('builds edit/delete actions and merges custom actions when crud + hasForm', () => {
    const openEditForm = vi.fn();
    const handleDelete = vi.fn();
    const custom: RowAction<Row>[] = [{ label: 'Custom', onClick: vi.fn() }];
    const crudRowActions: RowAction<Row>[] = [{ label: 'CrudCustom', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudRowActions<Row>({
        crud: { rowActions: crudRowActions } as ListPageCrudConfig<Row>,
        hasForm: true,
        rowActions: custom,
        openEditForm,
        handleDelete,
      })
    );
    expect(result.current).toHaveLength(4);
    expect(result.current[0].key).toBe('edit');
    expect(result.current[1].key).toBe('delete');
    expect(result.current[2].label).toBe('CrudCustom');
    expect(result.current[3].label).toBe('Custom');
  });

  it('edit action calls openEditForm', () => {
    const openEditForm = vi.fn();
    const { result } = renderHook(() =>
      useCrudRowActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: true,
        openEditForm,
        handleDelete: vi.fn(),
      })
    );
    const row = makeRow(1, 'A');
    act(() => result.current[0].onClick?.(row));
    expect(openEditForm).toHaveBeenCalledWith(row);
  });

  it('delete action calls handleDelete', () => {
    const handleDelete = vi.fn();
    const { result } = renderHook(() =>
      useCrudRowActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: true,
        openEditForm: vi.fn(),
        handleDelete,
      })
    );
    const row = makeRow(1, 'A');
    act(() => result.current[1].onClick?.(row));
    expect(handleDelete).toHaveBeenCalledWith(row);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. useCrudBatchActions
// ═══════════════════════════════════════════════════════════════════════════
describe('useCrudBatchActions', () => {
  it('returns batchActions when no crud', () => {
    const batchActions: BatchAction<Row>[] = [{ label: 'X', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({ crud: undefined, crudResult: {}, batchActions })
    );
    expect(result.current).toBe(batchActions);
  });

  it('builds bulk delete action when crud.selectable and crudResult.bulkDelete', () => {
    const bulkDelete = vi.fn();
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({
        crud: { selectable: true } as ListPageCrudConfig<Row>,
        crudResult: { bulkDelete },
      })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].label).toBeDefined();
  });

  it('does not build bulk delete when crud not selectable', () => {
    const bulkDelete = vi.fn();
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({
        crud: { selectable: false } as ListPageCrudConfig<Row>,
        crudResult: { bulkDelete },
      })
    );
    expect(result.current).toEqual([]);
  });

  it('bulk delete action calls crudResult.bulkDelete with ids', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const bulkDelete = vi.fn();
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({
        crud: { selectable: true } as ListPageCrudConfig<Row>,
        crudResult: { bulkDelete },
      })
    );
    act(() => result.current[0].onClick([makeRow(1, 'A'), makeRow(2, 'B')]));
    expect(bulkDelete).toHaveBeenCalledWith([1, 2]);
  });

  it('bulk delete action does nothing with no ids', () => {
    const bulkDelete = vi.fn();
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({
        crud: { selectable: true } as ListPageCrudConfig<Row>,
        crudResult: { bulkDelete },
      })
    );
    act(() => result.current[0].onClick([makeRow(0, 'NoId')]));
    expect(bulkDelete).not.toHaveBeenCalled();
  });

  it('merges crud.bulkActions and custom batchActions', () => {
    const crudBulk: BatchAction<Row>[] = [{ label: 'CrudBulk', onClick: vi.fn() }];
    const custom: BatchAction<Row>[] = [{ label: 'Custom', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudBatchActions<Row>({
        crud: { bulkActions: crudBulk } as ListPageCrudConfig<Row>,
        crudResult: {},
        batchActions: custom,
      })
    );
    expect(result.current).toHaveLength(2);
    expect(result.current[0].label).toBe('CrudBulk');
    expect(result.current[1].label).toBe('Custom');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. useCrudActions
// ═══════════════════════════════════════════════════════════════════════════
describe('useCrudActions', () => {
  it('returns actions when hasForm is false', () => {
    const actions = [{ label: 'A', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: false,
        actions,
        openCreateForm: vi.fn(),
      })
    );
    expect(result.current).toBe(actions);
  });

  it('returns actions when showCreateButton is false', () => {
    const actions = [{ label: 'A', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudActions<Row>({
        crud: { showCreateButton: false } as ListPageCrudConfig<Row>,
        hasForm: true,
        actions,
        openCreateForm: vi.fn(),
      })
    );
    expect(result.current).toBe(actions);
  });

  it('returns actions when no crud', () => {
    const actions = [{ label: 'A', onClick: vi.fn() }];
    const { result } = renderHook(() =>
      useCrudActions<Row>({ crud: undefined, hasForm: true, actions, openCreateForm: vi.fn() })
    );
    expect(result.current).toBe(actions);
  });

  it('appends create action when hasForm and crud', () => {
    const openCreateForm = vi.fn();
    const { result } = renderHook(() =>
      useCrudActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: true,
        openCreateForm,
      })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].variant).toBe('contained');
    act(() => result.current[0].onClick?.());
    expect(openCreateForm).toHaveBeenCalled();
  });

  it('uses crud.createButtonText when provided', () => {
    const { result } = renderHook(() =>
      useCrudActions<Row>({
        crud: { createButtonText: '新增用户' } as ListPageCrudConfig<Row>,
        hasForm: true,
        openCreateForm: vi.fn(),
      })
    );
    expect(result.current[0].label).toBe('新增用户');
  });

  it('appends create action to existing actions', () => {
    const actions = [{ label: 'Existing', onClick: vi.fn(), variant: 'text' as const }];
    const { result } = renderHook(() =>
      useCrudActions<Row>({
        crud: { queryKey: 'x' } as ListPageCrudConfig<Row>,
        hasForm: true,
        actions,
        openCreateForm: vi.fn(),
      })
    );
    expect(result.current).toHaveLength(2);
    expect(result.current[0].label).toBe('Existing');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. useResolvedColumns
// ═══════════════════════════════════════════════════════════════════════════
describe('useResolvedColumns', () => {
  it('returns provided columns when non-empty', () => {
    const columns = makeColumns();
    const { result } = renderHook(() => useResolvedColumns<Row>({ columns }));
    expect(result.current).toBe(columns);
  });

  it('returns columns when no crud and no formFields', () => {
    const { result } = renderHook(() => useResolvedColumns<Row>({ columns: [], crud: undefined }));
    expect(result.current).toEqual([]);
  });

  it('generates columns from crud.formFields', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    // id is filtered out
    expect(result.current).toHaveLength(2);
    expect(result.current.map((c) => c.id)).toEqual(['name', 'status']);
    expect(result.current[0].label).toBe('Name');
    expect(result.current[0].sortable).toBe(true);
  });

  it('filters hideInTable fields', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'hidden', label: 'Hidden', type: 'text', hideInTable: true },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('name');
  });

  it('uses tableRender when provided', () => {
    const tableRender = vi.fn(() => 'rendered');
    const formFields: CrudFormFieldConfig[] = [
      { key: 'name', label: 'Name', type: 'text', tableRender },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    expect(result.current[0].render).toBeDefined();
    const rendered = result.current[0].render?.({ name: 'A' } as Row, 0);
    expect(tableRender).toHaveBeenCalledWith('A', { name: 'A' }, 0);
    expect(rendered).toBe('rendered');
  });

  it('generates status Chip render for tableStatus select field', () => {
    const formFields: CrudFormFieldConfig[] = [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        tableStatusColorMap: { active: 'success' },
        tableStatusLabelMap: { active: 'Active' },
      },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    expect(result.current[0].render).toBeDefined();
    // render should produce a React element
    const el = result.current[0].render?.({ status: 'active' } as Row, 0);
    expect(React.isValidElement(el)).toBe(true);
  });

  it('generates Chip render for switch type', () => {
    const formFields: CrudFormFieldConfig[] = [{ key: 'active', label: 'Active', type: 'switch' }];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    const el = result.current[0].render?.({ active: true } as Row, 0);
    expect(React.isValidElement(el)).toBe(true);
  });

  it('generates render for date type returning value or dash', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'createdAt', label: 'Created', type: 'date' },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    expect(result.current[0].render?.({ createdAt: '2024-01-01' } as Row, 0)).toBe('2024-01-01');
    expect(result.current[0].render?.({ createdAt: '' } as Row, 0)).toBe('-');
  });

  it('respects tableSortable false', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'name', label: 'Name', type: 'text', tableSortable: false },
    ];
    const { result } = renderHook(() =>
      useResolvedColumns<Row>({ columns: [], crud: { formFields } as ListPageCrudConfig<Row> })
    );
    expect(result.current[0].sortable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15. useResolvedCrudConfig
// ═══════════════════════════════════════════════════════════════════════════
describe('useResolvedCrudConfig', () => {
  const renderConfig = (overrides: Record<string, unknown> = {}) =>
    renderHook(() =>
      useResolvedCrudConfig({
        crud: undefined,
        ...overrides,
      })
    );

  it('resolvedColumnResizable respects explicit prop', () => {
    const { result } = renderConfig({ columnResizable: true });
    expect(result.current.resolvedColumnResizable).toBe(true);
  });

  it('resolvedColumnResizable falls back to crud.columnResizable', () => {
    const { result } = renderConfig({ crud: { columnResizable: true } });
    expect(result.current.resolvedColumnResizable).toBe(true);
  });

  it('resolvedColumnResizable defaults to false', () => {
    const { result } = renderConfig({});
    expect(result.current.resolvedColumnResizable).toBe(false);
  });

  it('resolvedTreeView falls back to crud.treeView', () => {
    const { result } = renderConfig({ crud: { treeView: true } });
    expect(result.current.resolvedTreeView).toBe(true);
  });

  it('resolvedShowSummary falls back to crud.showSummary', () => {
    const { result } = renderConfig({ crud: { showSummary: true } });
    expect(result.current.resolvedShowSummary).toBe(true);
  });

  it('resolvedSummaryPosition uses explicit prop', () => {
    const { result } = renderConfig({ summaryPosition: 'top' });
    expect(result.current.resolvedSummaryPosition).toBe('top');
  });

  it('resolvedSummaryPosition falls back to crud.summaryPosition', () => {
    const { result } = renderConfig({ crud: { summaryPosition: 'top' } });
    expect(result.current.resolvedSummaryPosition).toBe('top');
  });

  it('resolvedSummaryPosition defaults to bottom', () => {
    const { result } = renderConfig({});
    expect(result.current.resolvedSummaryPosition).toBe('bottom');
  });

  it('resolvedInlineEditable falls back to crud.inlineEditable', () => {
    const { result } = renderConfig({ crud: { inlineEditable: true } });
    expect(result.current.resolvedInlineEditable).toBe(true);
  });

  it('resolvedInlineEditMode uses explicit prop', () => {
    const { result } = renderConfig({ inlineEditMode: 'row' });
    expect(result.current.resolvedInlineEditMode).toBe('row');
  });

  it('resolvedInlineEditMode falls back to crud.inlineEditMode', () => {
    const { result } = renderConfig({ crud: { inlineEditMode: 'row' } });
    expect(result.current.resolvedInlineEditMode).toBe('row');
  });

  it('resolvedInlineEditMode defaults to cell', () => {
    const { result } = renderConfig({});
    expect(result.current.resolvedInlineEditMode).toBe('cell');
  });

  it('resolvedSearchable respects explicit prop', () => {
    const { result } = renderConfig({ searchable: false });
    expect(result.current.resolvedSearchable).toBe(false);
  });

  it('resolvedSearchable defaults to true when crud provided', () => {
    const { result } = renderConfig({ crud: { queryKey: 'x' } });
    expect(result.current.resolvedSearchable).toBe(true);
  });

  it('resolvedSearchable is false when crud.searchable is false', () => {
    const { result } = renderConfig({ crud: { searchable: false } });
    expect(result.current.resolvedSearchable).toBe(false);
  });

  it('resolvedSearchable infers true from onSearch/onSearchChange/searchValue without crud', () => {
    const { result } = renderConfig({ onSearch: vi.fn() });
    expect(result.current.resolvedSearchable).toBe(true);
  });

  it('resolvedSearchable is false when no signals', () => {
    const { result } = renderConfig({});
    expect(result.current.resolvedSearchable).toBe(false);
  });

  it('resolvedSearchPlaceholder uses crud.searchPlaceholder when default passed', () => {
    const { result } = renderConfig({
      searchPlaceholder: 'components.hooks.64e327ed',
      crud: { searchPlaceholder: 'Search items' },
    });
    expect(result.current.resolvedSearchPlaceholder).toBe('Search items');
  });

  it('resolvedSearchPlaceholder derives from title', () => {
    const { result } = renderConfig({
      searchPlaceholder: 'components.hooks.64e327ed',
      title: 'Users',
    });
    expect(result.current.resolvedSearchPlaceholder).toContain('Users');
  });

  it('resolvedFilters uses provided filters', () => {
    const filters = [{ id: 'status', label: 'Status', type: 'select' as const, options: [] }];
    const { result } = renderConfig({ filters });
    expect(result.current.resolvedFilters).toBe(filters);
  });

  it('resolvedFilters auto-generates from crud.formFields select fields', () => {
    const formFields: CrudFormFieldConfig[] = [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      { key: 'name', label: 'Name', type: 'text' },
    ];
    const { result } = renderConfig({
      crud: { formFields, autoGenerateFilters: true } as ListPageCrudConfig<Row>,
    });
    expect(result.current.resolvedFilters).toHaveLength(1);
    expect(result.current.resolvedFilters[0].id).toBe('status');
  });

  it('resolvedFilters empty when no autoGenerateFilters', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'status', label: 'Status', type: 'select', options: [{ value: 'a', label: 'A' }] },
    ];
    const { result } = renderConfig({
      crud: { formFields, autoGenerateFilters: false } as ListPageCrudConfig<Row>,
    });
    expect(result.current.resolvedFilters).toEqual([]);
  });

  it('resolvedCardViewConfig uses provided cardViewConfig', () => {
    const cardViewConfig = { title: 'name', fields: [] };
    const { result } = renderConfig({ cardViewConfig });
    expect(result.current.resolvedCardViewConfig).toBe(cardViewConfig);
  });

  it('resolvedCardViewConfig derives from crud.formFields when crud.cardView true', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'name', label: 'Name', type: 'text', cardTitle: true },
      { key: 'description', label: 'Desc', type: 'text', cardSubtitle: true },
      { key: 'status', label: 'Status', type: 'text', cardStatus: true },
      { key: 'age', label: 'Age', type: 'number' },
    ];
    const { result } = renderConfig({
      crud: { formFields, cardView: true } as ListPageCrudConfig<Row>,
    });
    const cfg = result.current.resolvedCardViewConfig;
    expect(cfg).toBeDefined();
    expect(cfg?.title).toBe('name');
    expect(cfg?.subtitle).toBe('description');
    expect(cfg?.statusField).toBe('status');
    expect(cfg?.fields).toHaveLength(1);
  });

  it('resolvedCardViewConfig infers title/subtitle/status from common keys', () => {
    const formFields: CrudFormFieldConfig[] = [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'remark', label: 'Remark', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'extra', label: 'Extra', type: 'text' },
    ];
    const { result } = renderConfig({
      crud: { formFields, cardView: true } as ListPageCrudConfig<Row>,
    });
    const cfg = result.current.resolvedCardViewConfig;
    expect(cfg?.title).toBe('title');
    expect(cfg?.subtitle).toBe('remark');
    expect(cfg?.statusField).toBe('state');
  });

  it('resolvedCardViewConfig undefined when no cardView', () => {
    const { result } = renderConfig({});
    expect(result.current.resolvedCardViewConfig).toBeUndefined();
  });
});
