import React from 'react';
import { useTheme } from '@mui/material';
import { AlertCircle, X } from 'lucide-react';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface FieldErrorProps {
  error: string | undefined;
  showIcon?: boolean;
}

const FieldError: React.FC<FieldErrorProps> = ({ error, showIcon = true }) => {
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

const FormError: React.FC<FormErrorProps> = ({ errors, fields = [] }) => {
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
        border: `1px solid ${designTokens.colors.error[200]}`,
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
            {i18n.t('components.validation_error.k0')}
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
                    width: designTokens.spacing.xs,
                    height: designTokens.spacing.xs,
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

const ValidationHint: React.FC<ValidationHintProps> = ({ field, rules }) => {
  return (
    <div style={{ fontSize: '12px', color: 'var(--mui-palette-text-secondary)', marginTop: 1 }}>
      <span style={{ fontWeight: 500 }}>{i18n.t('components.validation_error.field_0')}</span>
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
                width: designTokens.spacing.xs,
                height: designTokens.spacing.xs,
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

const InlineValidation: React.FC<InlineValidationProps> = ({
  value,
  rules,
  fieldName,
  onValidChange,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const theme = useTheme();
  React.useEffect(() => {
    if (!value && rules.required) {
      setError(`${fieldName}${i18n.t('components.validation_error.k0')}`);
      onValidChange?.(false);
      return;
    }

    if (value) {
      if (rules.minLength && value.length < rules.minLength) {
        setError(
          `${fieldName}${i18n.t('components.validation_error.k1')}${rules.minLength}${i18n.t('components.validation_error.k2')}`
        );
        onValidChange?.(false);
        return;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        setError(
          `${fieldName}${i18n.t('components.validation_error.k3')}${rules.maxLength}${i18n.t('components.validation_error.k4')}`
        );
        onValidChange?.(false);
        return;
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        setError(`${fieldName}${i18n.t('components.validation_error.k5')}`);
        onValidChange?.(false);
        return;
      }

      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          setError(
            typeof result === 'string'
              ? result
              : `${fieldName}${i18n.t('components.validation_error.k6')}`
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

const SuccessMessage: React.FC<SuccessMessageProps> = ({ message, onClose }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        backgroundColor: theme.palette.success.light,
        border: `1px solid ${designTokens.colors.success[200]}`,
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
            width: designTokens.spacing.xl,
            height: designTokens.spacing.xl,
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
