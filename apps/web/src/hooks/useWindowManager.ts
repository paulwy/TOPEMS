import { useState, useCallback, useRef, useEffect } from 'react';

interface WindowConfig {
  id: string;
  title: string;
  component: React.ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  isResizable?: boolean;
  isDraggable?: boolean;
  isMinimizable?: boolean;
  isMaximizable?: boolean;
  isClosable?: boolean;
}

export interface WindowState extends WindowConfig {
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface WindowManagerState {
  windows: WindowState[];
  activeWindowId: string | null;
}

export function useWindowManager(initialWindows: WindowConfig[] = []) {
  const [state, setState] = useState<WindowManagerState>({
    windows: initialWindows.map((config, index) => ({
      ...config,
      width: config.width || 600,
      height: config.height || 400,
      x: config.x || 50 + index * 30,
      y: config.y || 50 + index * 30,
      isResizable: config.isResizable !== false,
      isDraggable: config.isDraggable !== false,
      isMinimizable: config.isMinimizable !== false,
      isMaximizable: config.isMaximizable !== false,
      isClosable: config.isClosable !== false,
      isMinimized: false,
      isMaximized: false,
      zIndex: 100 + index,
    })),
    activeWindowId: null,
  });

  const zIndexRef = useRef(200);

  const addWindow = useCallback((config: Omit<WindowConfig, 'id'>) => {
    const newId = `window-${Date.now()}`;
    setState((prev) => ({
      ...prev,
      windows: [
        ...prev.windows,
        {
          ...config,
          id: newId,
          width: config.width || 600,
          height: config.height || 400,
          x: 50 + prev.windows.length * 30,
          y: 50 + prev.windows.length * 30,
          isResizable: config.isResizable !== false,
          isDraggable: config.isDraggable !== false,
          isMinimizable: config.isMinimizable !== false,
          isMaximizable: config.isMaximizable !== false,
          isClosable: config.isClosable !== false,
          isMinimized: false,
          isMaximized: false,
          zIndex: zIndexRef.current++,
        },
      ],
      activeWindowId: newId,
    }));
    return newId;
  }, []);

  const removeWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.filter((w) => w.id !== id),
      activeWindowId: prev.activeWindowId === id ? null : prev.activeWindowId,
    }));
  }, []);

  const activateWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map((w) => (w.id === id ? { ...w, zIndex: zIndexRef.current++ } : w)),
      activeWindowId: id,
    }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true, isMaximized: false } : w
      ),
    }));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setState((prev) => {
      const window = prev.windows.some((w) => w.id === id);
      if (!window) return prev;

      return {
        ...prev,
        windows: prev.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                isMaximized: !w.isMaximized,
                isMinimized: false,
              }
            : w
        ),
      };
    });
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, isMaximized: false } : w
      ),
      activeWindowId: id,
    }));
  }, []);

  const updateWindowPosition = useCallback((id: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }));
  }, []);

  const updateWindowSize = useCallback((id: string, width: number, height: number) => {
    setState((prev) => ({
      ...prev,
      windows: prev.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    }));
  }, []);

  const getWindow = useCallback(
    (id: string) => {
      return state.windows.find((w) => w.id === id);
    },
    [state.windows]
  );

  const getAllWindows = useCallback(() => {
    return state.windows;
  }, [state.windows]);

  const getMinimizedWindows = useCallback(() => {
    return state.windows.filter((w) => w.isMinimized);
  }, [state.windows]);

  const getVisibleWindows = useCallback(() => {
    return state.windows.filter((w) => !w.isMinimized);
  }, [state.windows]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (state.activeWindowId) {
          removeWindow(state.activeWindowId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        if (state.activeWindowId) {
          minimizeWindow(state.activeWindowId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'm') {
        e.preventDefault();
        if (state.activeWindowId) {
          maximizeWindow(state.activeWindowId);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();
        const visibleWindows = state.windows.filter((w) => !w.isMinimized);
        if (visibleWindows.length > 0) {
          const currentIndex = visibleWindows.findIndex((w) => w.id === state.activeWindowId);
          const nextIndex = e.shiftKey
            ? (currentIndex - 1 + visibleWindows.length) % visibleWindows.length
            : (currentIndex + 1) % visibleWindows.length;
          activateWindow(visibleWindows[nextIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.activeWindowId,
    state.windows,
    removeWindow,
    minimizeWindow,
    maximizeWindow,
    activateWindow,
  ]);

  return {
    windows: state.windows,
    activeWindowId: state.activeWindowId,
    addWindow,
    removeWindow,
    activateWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    updateWindowPosition,
    updateWindowSize,
    getWindow,
    getAllWindows,
    getMinimizedWindows,
    getVisibleWindows,
  };
}
