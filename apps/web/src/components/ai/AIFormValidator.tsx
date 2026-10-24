import type { ValidateRequest, ValidationIssue, Suggestion } from '@/types/ai';

interface AIFormValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  validateRequest: ValidateRequest;
  onApplySuggestions?: (_suggestions: Suggestion[]) => void;
  onFixIssue?: (_issue: ValidationIssue) => void;
}
