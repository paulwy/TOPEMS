/**
 * useDialogForm hook — 对话框表单状态管理测试
 *
 * 测试一个通用的对话框表单 hook，它管理 open/close、create/edit/view 模式切换。
 * 这里我们测试项目中普遍使用的 Dialog Form 模式。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState, useCallback } from 'react';

/**
 * Inline implementation of the common useDialogForm pattern found in the project:
 * - openCreate() -> mode='create', data=undefined
 * - openEdit(row) -> mode='edit', data=row
 * - openView(row) -> mode='view', data=row
 * - close() -> mode=null, data=undefined
 * - isEdit, isView derived flags
 */
function useDialogForm<T = Record<string, any>>() {
  const [mode, setMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [data, setData] = useState<T | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  const openCreate = useCallback(() => {
    setMode('create');
    setData(undefined);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((rowData: T) => {
    setMode('edit');
    setData(rowData);
    setIsOpen(true);
  }, []);

  const openView = useCallback((rowData: T) => {
    setMode('view');
    setData(rowData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setMode(null);
    setData(undefined);
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    mode,
    data,
    openCreate,
    openEdit,
    openView,
    close,
    isEdit: mode === 'edit',
    isView: mode === 'view',
    isCreate: mode === 'create',
  };
}

describe('useDialogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state should be closed', () => {
    const { result } = renderHook(() => useDialogForm());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBeNull();
    expect(result.current.data).toBeUndefined();
  });

  it('openCreate sets mode to create with no data', () => {
    const { result } = renderHook(() => useDialogForm());

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('create');
    expect(result.current.data).toBeUndefined();
    expect(result.current.isCreate).toBe(true);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.isView).toBe(false);
  });

  it('openEdit sets mode to edit with data', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string; name: string }>());

    act(() => {
      result.current.openEdit({ id: '1', name: 'Test' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('edit');
    expect(result.current.data).toEqual({ id: '1', name: 'Test' });
    expect(result.current.isEdit).toBe(true);
    expect(result.current.isCreate).toBe(false);
  });

  it('openView sets mode to view with data', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => {
      result.current.openView({ id: '42' });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.mode).toBe('view');
    expect(result.current.data).toEqual({ id: '42' });
    expect(result.current.isView).toBe(true);
    expect(result.current.isEdit).toBe(false);
  });

  it('close resets all state', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => {
      result.current.openEdit({ id: '1' });
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.mode).toBeNull();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isEdit).toBe(false);
  });

  it('transitioning between modes works correctly', () => {
    const { result } = renderHook(() => useDialogForm<{ id: string }>());

    act(() => {
      result.current.openCreate();
    });
    expect(result.current.isCreate).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.openView({ id: '5' });
    });
    expect(result.current.isView).toBe(true);
    expect(result.current.data).toEqual({ id: '5' });
  });
});
