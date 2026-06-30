import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Shortcut {
  id: string;
  title: string;
  icon: string;
  path: string;
}

const defaultShortcuts: Shortcut[] = [
  { id: '1', title: '仪表盘', icon: 'Activity', path: '/dashboard' },
  { id: '2', title: '文档中心', icon: 'FileText', path: '/documents' },
];

interface ShortcutsState {
  shortcuts: Shortcut[];
  setShortcuts: (shortcuts: Shortcut[]) => void;
  addShortcut: (shortcut: Shortcut) => void;
  removeShortcut: (id: string) => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      shortcuts: defaultShortcuts,
      setShortcuts: (shortcuts) => set({ shortcuts }),
      addShortcut: (shortcut) =>
        set((state) => ({
          shortcuts: [...state.shortcuts, shortcut],
        })),
      removeShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        })),
    }),
    {
      name: 'topems-shortcuts-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
