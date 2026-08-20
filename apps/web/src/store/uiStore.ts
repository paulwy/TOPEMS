import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'topems-ui-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const useSidebarOpen = () => useUIStore((state) => state.sidebarOpen);
const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useToggleSidebar = () => useUIStore((state) => state.toggleSidebar);
const useSetSidebarOpen = () => useUIStore((state) => state.setSidebarOpen);
const useToggleSidebarCollapsed = () => useUIStore((state) => state.toggleSidebarCollapsed);
const useSetSidebarCollapsed = () => useUIStore((state) => state.setSidebarCollapsed);
