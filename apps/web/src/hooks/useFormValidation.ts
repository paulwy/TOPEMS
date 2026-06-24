import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export function useFormValidation<T extends Record<string, any>>(_initialData?: T) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(
    (field: keyof T, value: any, rules?: ValidationRule): string | null => {
      if (!rules) return null;

      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        return `${String(field)}不能为空`;
      }

      if (value && typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          return `${String(field)}至少需要${rules.minLength}个字符`;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          return `${String(field)}不能超过${rules.maxLength}个字符`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          return `${String(field)}格式不正确`;
        }
      }

      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          return typeof result === 'string' ? result : `${String(field)}验证失败`;
        }
      }

      return null;
    },
    []
  );

  const handleFieldChange = useCallback(
    (field: keyof T, value: any, rules?: ValidationRule) => {
      if (touched[field as string]) {
        const error = validateField(field, value, rules);
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[field as string] = error;
          } else {
            delete newErrors[field as string];
          }
          return newErrors;
        });
      }
    },
    [touched, validateField]
  );

  const handleFieldBlur = useCallback(
    (field: keyof T, value: any, rules?: ValidationRule) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validateField(field, value, rules);
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[field as string] = error;
        } else {
          delete newErrors[field as string];
        }
        return newErrors;
      });
    },
    [validateField]
  );

  const validateForm = useCallback(
    (data: T, rules: Record<string, ValidationRule>): boolean => {
      const formErrors: Record<string, string> = {};
      let isValid = true;

      for (const [field, rule] of Object.entries(rules)) {
        const value = data[field as keyof T];
        const error = validateField(field as keyof T, value, rule);

        if (error) {
          formErrors[field] = error;
          isValid = false;
        }
      }

      setErrors(formErrors);
      setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      return isValid;
    },
    [validateField]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback(
    (field: string): string | undefined => {
      return touched[field] ? errors[field] : undefined;
    },
    [errors, touched]
  );

  const hasFieldError = useCallback(
    (field: string): boolean => {
      return Boolean(touched[field] && errors[field]);
    },
    [errors, touched]
  );

  return {
    errors,
    touched,
    validateField,
    handleFieldChange,
    handleFieldBlur,
    validateForm,
    clearErrors,
    getFieldError,
    hasFieldError,
  };
}

export function getInputClassName(
  hasError: boolean,
  baseClass: string = 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
): string {
  return hasError ? `${baseClass} border-red-500` : `${baseClass} border-slate-200`;
}
