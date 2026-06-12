import React from "react";
import { AlertCircle, X } from "lucide-react";

interface FieldErrorProps {
  error: string | undefined;
  showIcon?: boolean;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  showIcon = true,
}) => {
  if (!error) return null;

  return (
    <div className="flex items-center space-x-1 text-red-600 text-sm mt-1">
      {showIcon && <AlertCircle className="w-4 h-4" />}
      <span>{error}</span>
    </div>
  );
};

interface FormErrorProps {
  errors: Record<string, string>;
  fields?: string[];
}

export const FormError: React.FC<FormErrorProps> = ({
  errors,
  fields = [],
}) => {
  const errorList =
    fields.length > 0
      ? fields.map((field) => errors[field]).filter(Boolean)
      : Object.values(errors).filter(Boolean);

  if (errorList.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-800 mb-1">
            请修正以下错误：
          </h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errorList.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="w-1 h-1 bg-red-600 rounded-full mt-2"></span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

interface ValidationHintProps {
  field: string;
  rules: string[];
}

export const ValidationHint: React.FC<ValidationHintProps> = ({
  field,
  rules,
}) => {
  return (
    <div className="text-xs text-slate-500 mt-1">
      <span className="font-medium">{field}要求：</span>
      <ul className="mt-1 space-y-0.5">
        {rules.map((rule, index) => (
          <li key={index} className="flex items-center space-x-1">
            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface InlineValidationProps {
  value: string;
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (_value: string) => boolean | string;
  };
  fieldName: string;
  onValidChange?: (_isValid: boolean) => void;
}

export const InlineValidation: React.FC<InlineValidationProps> = ({
  value,
  rules,
  fieldName,
  onValidChange,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!value && rules.required) {
      setError(`${fieldName}不能为空`);
      onValidChange?.(false);
      return;
    }

    if (value) {
      if (rules.minLength && value.length < rules.minLength) {
        setError(`${fieldName}至少需要${rules.minLength}个字符`);
        onValidChange?.(false);
        return;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        setError(`${fieldName}不能超过${rules.maxLength}个字符`);
        onValidChange?.(false);
        return;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        setError(`${fieldName}格式不正确`);
        onValidChange?.(false);
        return;
      }

      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          setError(
            typeof result === "string" ? result : `${fieldName}验证失败`,
          );
          onValidChange?.(false);
          return;
        }
      }
    }

    setError(null);
    onValidChange?.(true);
  }, [value, rules, fieldName, onValidChange]);

  if (!error) return null;

  return (
    <div className="flex items-center space-x-1 text-red-600 text-sm mt-1">
      <AlertCircle className="w-4 h-4" />
      <span>{error}</span>
    </div>
  );
};

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  onClose,
}) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span className="text-green-800 font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-green-600 hover:text-green-700"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
