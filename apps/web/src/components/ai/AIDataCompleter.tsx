import type { CompleteRequest, CompletionItem } from '@/types/ai';

export interface AIDataCompleterProps {
  isOpen: boolean;
  onClose: () => void;
  completeRequest: CompleteRequest;
  onApplyCompletion: (_completions: Record<string, CompletionItem>) => void;
}
