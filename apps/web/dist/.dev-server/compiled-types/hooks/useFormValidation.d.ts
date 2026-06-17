export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
}
export declare function useFormValidation<T extends Record<string, any>>(_initialData?: T): {
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    validateField: (field: keyof T, value: any, rules?: ValidationRule) => string | null;
    handleFieldChange: (field: keyof T, value: any, rules?: ValidationRule) => void;
    handleFieldBlur: (field: keyof T, value: any, rules?: ValidationRule) => void;
    validateForm: (data: T, rules: Record<string, ValidationRule>) => boolean;
    clearErrors: () => void;
    getFieldError: (field: string) => string | undefined;
    hasFieldError: (field: string) => boolean;
};
export declare function getInputClassName(hasError: boolean, baseClass?: string): string;
