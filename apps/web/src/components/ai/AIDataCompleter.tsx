import type { CompleteRequest, CompletionItem } from '@/types/ai';

interface AIDataCompleterProps {
  isOpen: boolean;
  onClose: () => void;
  completeRequest: CompleteRequest;
  onApplyCompletion: (_completions: Record<string, CompletionItem>) => void;
}
