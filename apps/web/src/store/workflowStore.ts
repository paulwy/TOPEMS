import { create } from 'zustand';

interface WorkflowState {
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  selectedWorkflowId: null,
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
}));

export const useSelectedWorkflowId = () => useWorkflowStore((state) => state.selectedWorkflowId);
export const useSetSelectedWorkflowId = () => useWorkflowStore((state) => state.setSelectedWorkflowId);
