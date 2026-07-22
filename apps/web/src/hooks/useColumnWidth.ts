import { useState, useCallback, useEffect } from 'react';

export interface UseColumnWidthOptions {
  storageKey?: string;
  defaultWidths?: Record<string, number>;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  persist?: boolean;
  columns?: Array<{ id: string; width?: number | string; minWidth?: number; maxWidth?: number }>;
}

export interface UseColumnWidthResult {
  columnWidths: Record<string, number>;
  getColumnWidth: (columnId: string) => number;
  setColumnWidth: (columnId: string, width: number) => void;
  resetColumnWidth: (columnId: string) => void;
  resetAllColumnWidths: () => void;
  startResize: (columnId: string, startX: number) => void;
  isResizing: boolean;
  resizingColumnId: string | null;
}

const DEFAULT_MIN_WIDTH = 80;
const DEFAULT_MAX_WIDTH = 600;
const DEFAULT_WIDTH = 150;

const loadColumnWidths = (key: string): Record<string, number> => {
  try {
    const stored = localStorage.getItem(`listpage:colwidth:${key}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {};
};

const saveColumnWidths = (key: string, widths: Record<string, number>): void => {
  try {
    localStorage.setItem(`listpage:colwidth:${key}`, JSON.stringify(widths));
  } catch {
    // ignore
  }
};

export const useColumnWidth = ({
  storageKey,
  defaultWidths = {},
  defaultWidth = DEFAULT_WIDTH,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
  persist = true,
  columns = [],
}: UseColumnWidthOptions = {}): UseColumnWidthResult => {
  const getInitialWidths = (): Record<string, number> => {
    const widths: Record<string, number> = { ...defaultWidths };

    if (persist && storageKey) {
      const stored = loadColumnWidths(storageKey);
      Object.assign(widths, stored);
    }

    columns.forEach((col) => {
      if (widths[col.id] === undefined) {
        if (typeof col.width === 'number') {
          widths[col.id] = col.width;
        } else {
          widths[col.id] = defaultWidth;
        }
      }
    });

    return widths;
  };

  const [columnWidths, setColumnWidthsState] = useState<Record<string, number>>(getInitialWidths);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const resizeStartX = useState<number>(0);
  const resizeStartWidth = useState<number>(0);

  const getColumnWidth = useCallback(
    (columnId: string): number => {
      if (columnWidths[columnId] !== undefined) {
        return columnWidths[columnId];
      }
      const col = columns.find((c) => c.id === columnId);
      if (col && typeof col.width === 'number') {
        return col.width;
      }
      return defaultWidth;
    },
    [columnWidths, columns, defaultWidth]
  );

  const setColumnWidth = useCallback(
    (columnId: string, width: number) => {
      const col = columns.find((c) => c.id === columnId);
      const effectiveMin = col?.minWidth ?? minWidth;
      const effectiveMax = col?.maxWidth ?? maxWidth;
      const clampedWidth = Math.max(effectiveMin, Math.min(effectiveMax, width));

      setColumnWidthsState((prev) => {
        const next = { ...prev, [columnId]: clampedWidth };
        if (persist && storageKey) {
          saveColumnWidths(storageKey, next);
        }
        return next;
      });
    },
    [columns, minWidth, maxWidth, persist, storageKey]
  );

  const resetColumnWidth = useCallback(
    (columnId: string) => {
      setColumnWidthsState((prev) => {
        const next = { ...prev };
        const col = columns.find((c) => c.id === columnId);
        if (col && typeof col.width === 'number') {
          next[columnId] = col.width;
        } else if (defaultWidths[columnId] !== undefined) {
          next[columnId] = defaultWidths[columnId];
        } else {
          next[columnId] = defaultWidth;
        }
        if (persist && storageKey) {
          saveColumnWidths(storageKey, next);
        }
        return next;
      });
    },
    [columns, defaultWidths, defaultWidth, persist, storageKey]
  );

  const resetAllColumnWidths = useCallback(() => {
    const widths: Record<string, number> = { ...defaultWidths };
    columns.forEach((col) => {
      if (typeof col.width === 'number') {
        widths[col.id] = col.width;
      } else if (widths[col.id] === undefined) {
        widths[col.id] = defaultWidth;
      }
    });
    setColumnWidthsState(widths);
    if (persist && storageKey) {
      saveColumnWidths(storageKey, widths);
    }
  }, [columns, defaultWidths, defaultWidth, persist, storageKey]);

  const startResize = useCallback(
    (columnId: string, startX: number) => {
      setResizingColumnId(columnId);
      setIsResizing(true);
      resizeStartX[1](startX);
      resizeStartWidth[1](getColumnWidth(columnId));
    },
    [getColumnWidth, resizeStartX, resizeStartWidth]
  );

  useEffect(() => {
    if (!isResizing || !resizingColumnId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX[0];
      const newWidth = resizeStartWidth[0] + deltaX;
      setColumnWidth(resizingColumnId, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizingColumnId(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, resizingColumnId, resizeStartX, resizeStartWidth, setColumnWidth]);

  return {
    columnWidths,
    getColumnWidth,
    setColumnWidth,
    resetColumnWidth,
    resetAllColumnWidths,
    startResize,
    isResizing,
    resizingColumnId,
  };
};

export default useColumnWidth;
