import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatchSelection } from '../useBatchSelection';

const mockItems = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
  { id: '3', name: 'Item 3' },
];

describe('useBatchSelection', () => {
  it('should initialize with empty selection', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.allItemsSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it('should toggle selection of single item', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    act(() => {
      result.current.toggleSelect('1');
    });
    expect(result.current.selectedIds).toEqual(['1']);
    expect(result.current.isSelected('1')).toBe(true);
    expect(result.current.isSelected('2')).toBe(false);

    act(() => {
      result.current.toggleSelect('1');
    });
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.isSelected('1')).toBe(false);
  });

  it('should select all items', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    act(() => {
      result.current.selectAll();
    });

    expect(result.current.selectedIds).toEqual(['1', '2', '3']);
    expect(result.current.allItemsSelected).toBe(true);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it('should deselect all items', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    act(() => {
      result.current.selectAll();
    });
    expect(result.current.selectedIds).toHaveLength(3);

    act(() => {
      result.current.deselectAll();
    });
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.allItemsSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    act(() => {
      result.current.toggleSelect('1');
      result.current.toggleSelect('2');
    });
    expect(result.current.selectedIds).toHaveLength(2);

    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedIds).toEqual([]);
  });

  it('should correctly detect isIndeterminate state', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    act(() => {
      result.current.toggleSelect('1');
    });
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.allItemsSelected).toBe(false);

    act(() => {
      result.current.toggleSelect('2');
    });
    expect(result.current.isIndeterminate).toBe(true);
    expect(result.current.allItemsSelected).toBe(false);

    act(() => {
      result.current.toggleSelect('3');
    });
    expect(result.current.isIndeterminate).toBe(false);
    expect(result.current.allItemsSelected).toBe(true);
  });

  it('should handle custom id key', () => {
    const customItems = [
      { uid: 'a', name: 'Item A' },
      { uid: 'b', name: 'Item B' },
    ];

    const { result } = renderHook(() => useBatchSelection(customItems, 'uid'));

    act(() => {
      result.current.toggleSelect('a');
    });
    expect(result.current.selectedIds).toEqual(['a']);
    expect(result.current.isSelected('a')).toBe(true);
  });

  it('should handle empty items list', () => {
    const { result } = renderHook(() => useBatchSelection([]));

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.allItemsSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(false);

    act(() => {
      result.current.selectAll();
    });
    expect(result.current.selectedIds).toEqual([]);
  });

  it('should update when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useBatchSelection(items),
      { initialProps: { items: mockItems } }
    );

    act(() => {
      result.current.selectAll();
    });
    expect(result.current.selectedIds).toEqual(['1', '2', '3']);

    const newItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    rerender({ items: newItems });
    expect(result.current.allItemsSelected).toBe(false);
    expect(result.current.isIndeterminate).toBe(true);
  });

  it('should return isSelected function', () => {
    const { result } = renderHook(() => useBatchSelection(mockItems));

    expect(typeof result.current.isSelected).toBe('function');

    act(() => {
      result.current.toggleSelect('1');
    });

    expect(result.current.isSelected('1')).toBe(true);
    expect(result.current.isSelected('2')).toBe(false);
    expect(result.current.isSelected('nonexistent')).toBe(false);
  });
});