import type { ValidateRequest, ValidationIssue, Suggestion } from "@/types/ai";
export interface AIFormValidatorProps {
    isOpen: boolean;
    onClose: () => void;
    validateRequest: ValidateRequest;
    onApplySuggestions?: (_suggestions: Suggestion[]) => void;
    onFixIssue?: (_issue: ValidationIssue) => void;
}
export declare function AIFormValidator({ isOpen, onClose, validateRequest, onApplySuggestions, onFixIssue, }: AIFormValidatorProps): import("react").JSX.Element;
