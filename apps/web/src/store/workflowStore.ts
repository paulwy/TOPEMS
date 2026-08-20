import { create } from 'zustand';

interface WorkflowState {
  selectedWorkflowId: string | null;
  setSelectedWorkflowId: (id: string | null) => void;
}

const useWorkflowStore = create<WorkflowState>()((set) => ({
  selectedWorkflowId: null,
  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
}));

const useSelectedWorkflowId = () => useWorkflowStore((state) => state.selectedWorkflowId);
const useSetSelectedWorkflowId = () =>
  useWorkflowStore((state) => state.setSelectedWorkflowId);
