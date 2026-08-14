import React from 'react';
import { useTheme } from '@mui/material';
import { AlertCircle, X } from 'lucide-react';

interface FieldErrorProps {
  error: string | undefined;
  showIcon?: boolean;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, showIcon = true }) => {
  const theme = useTheme();
  if (!error) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: theme.palette.error.dark,
        fontSize: '14px',
        marginTop: 1,
      }}
    >
      {showIcon && <AlertCircle sx={{ width: 16, height: 16 }} />}
      <span>{error}</span>
    </div>
  );
};

interface FormErrorProps {
  errors: Record<string, string>;
  fields?: string[];
}

export const FormError: React.FC<FormErrorProps> = ({ errors, fields = [] }) => {
  const theme = useTheme();
  const errorList =
    fields.length > 0
      ? fields.map((field) => errors[field]).filter(Boolean)
      : Object.values(errors).filter(Boolean);

  if (errorList.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: theme.palette.error.light,
        border: '1px solid #fecaca',
        borderRadius: 'md',
        padding: 4,
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <AlertCircle sx={{ width: 20, height: 20, color: 'error.dark', marginTop: 0.5 }} />
        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'error.800',
              marginBottom: 1,
            }}
          >
            请修正以下错误：
          </h4>
          <ul
            style={{
              fontSize: '14px',
              color: 'error.darker',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {errorList.map((error, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: theme.palette.error.dark,
                    borderRadius: 'full',
                    marginTop: 2,
                    flexShrink: 0,
                  }}
                ></span>
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

export const ValidationHint: React.FC<ValidationHintProps> = ({ field, rules }) => {
  return (
    <div style={{ fontSize: '12px', color: 'var(--mui-palette-text-secondary)', marginTop: 1 }}>
      <span style={{ fontWeight: 500 }}>{field}要求：</span>
      <ul
        style={{
          marginTop: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {rules.map((rule, index) => (
          <li
            key={index}
            style={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <span
              style={{
                width: '4px',
                height: '4px',
                backgroundColor: 'grey.400',
                borderRadius: 'full',
              }}
            ></span>
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

  const theme = useTheme();
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
          setError(typeof result === 'string' ? result : `${fieldName}验证失败`);
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: theme.palette.error.dark,
        fontSize: '14px',
        marginTop: 1,
      }}
    >
      <AlertCircle sx={{ width: 16, height: 16 }} />
      <span>{error}</span>
    </div>
  );
};

interface SuccessMessageProps {
  message: string;
  onClose?: () => void;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ message, onClose }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        backgroundColor: theme.palette.success.light,
        border: '1px solid #bbf7d0',
        borderRadius: 'md',
        padding: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'success.lighter',
            borderRadius: 'full',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            style={{ width: 20, height: 20, color: theme.palette.success.dark }}
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M5 13l4 4L19 7'
            />
          </svg>
        </div>
        <span style={{ color: 'success.800', fontWeight: 500 }}>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.palette.success.dark,
            padding: 1,
          }}
        >
          <X sx={{ width: 20, height: 20 }} />
        </button>
      )}
    </div>
  );
};
