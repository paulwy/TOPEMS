import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import i18n from '@/i18n';

export interface Shortcut {
  id: string;
  title: string;
  icon: string;
  path: string;
}

export function getDefaultShortcuts(): Shortcut[] {
  return [
    { id: '1', title: i18n.t('store.shortcuts_store.k0'), icon: 'Activity', path: '/dashboard' },
    { id: '2', title: i18n.t('store.shortcuts_store.k1'), icon: 'FileText', path: '/documents' },
  ];
}

interface ShortcutsState {
  shortcuts: Shortcut[];
  setShortcuts: (shortcuts: Shortcut[]) => void;
  addShortcut: (shortcut: Shortcut) => void;
  removeShortcut: (id: string) => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      shortcuts: [], // lazy init: populated by ensureShortcutsLoaded()
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

/** Call after i18n is ready to populate default shortcuts */
export function ensureShortcutsLoaded(): void {
  const state = useShortcutsStore.getState();
  if (state.shortcuts.length === 0) {
    state.setShortcuts(getDefaultShortcuts());
  }
}

export const useShortcuts = () => useShortcutsStore((state) => state.shortcuts);
export const useSetShortcuts = () => useShortcutsStore((state) => state.setShortcuts);
export const useAddShortcut = () => useShortcutsStore((state) => state.addShortcut);
export const useRemoveShortcut = () => useShortcutsStore((state) => state.removeShortcut);
