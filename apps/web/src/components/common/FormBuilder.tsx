import React, { useCallback } from 'react';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  InputLabel,
  Box,
  Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export interface FormFieldConfig {
  name: string;
  label: string;
  type:
    'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | null;
  };
  colSpan?: number;
  render?: (props: {
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
    isRequired: boolean;
    isDisabled: boolean;
  }) => React.ReactNode;
}

export interface FormBuilderConfig {
  fields: FormFieldConfig[];
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  title?: string;
  initialValues?: Record<string, unknown>;
  colCount?: number;
}

export default function FormBuilder({
  fields,
  onSubmit,
  submitLabel = '提交',
  resetLabel = '重置',
  showReset = true,
  title,
  initialValues = {},
  colCount = 2,
}: FormBuilderConfig) {
  const [values, setValues] = React.useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      initial[field.name] = initialValues[field.name] ?? field.defaultValue ?? '';
    });
    return initial;
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const validateField = useCallback((field: FormFieldConfig, value: unknown): string => {
    if (field.required && !value) {
      return `${field.label}为必填项`;
    }
    if (field.validation) {
      const { minLength, maxLength, min, max, pattern, custom } = field.validation;
      const stringValue = String(value);
      if (minLength && stringValue.length < minLength) {
        return `${field.label}长度不能少于${minLength}个字符`;
      }
      if (maxLength && stringValue.length > maxLength) {
        return `${field.label}长度不能超过${maxLength}个字符`;
      }
      if (min !== undefined && Number(value) < min) {
        return `${field.label}不能小于${min}`;
      }
      if (max !== undefined && Number(value) > max) {
        return `${field.label}不能大于${max}`;
      }
      if (pattern && !pattern.test(stringValue)) {
        return `${field.label}格式不正确`;
      }
      if (custom) {
        return custom(value) || '';
      }
    }
    return '';
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: Record<string, string> = {};
      fields.forEach((field) => {
        const error = validateField(field, values[field.name]);
        if (error) newErrors[field.name] = error;
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      await onSubmit(values);
    },
    [fields, values, validateField, onSubmit]
  );

  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      initial[field.name] = initialValues[field.name] ?? field.defaultValue ?? '';
    });
    setValues(initial);
    setErrors({});
  }, [fields, initialValues]);

  const renderField = useCallback(
    (field: FormFieldConfig) => {
      const isRequired = field.required ?? false;
      const isDisabled = field.disabled ?? false;
      const value = values[field.name];
      const error = errors[field.name];

      switch (field.type) {
        case 'text':
        case 'email':
        case 'password':
        case 'number':
          return (
            <TextField
              key={field.name}
              name={field.name}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              required={isRequired}
              disabled={isDisabled}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              error={!!error}
              helperText={error}
              fullWidth
              size='small'
            />
          );
        case 'textarea':
          return (
            <TextField
              key={field.name}
              name={field.name}
              label={field.label}
              placeholder={field.placeholder}
              required={isRequired}
              disabled={isDisabled}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              error={!!error}
              helperText={error}
              fullWidth
              multiline
              rows={4}
              size='small'
            />
          );
        case 'select':
          return (
            <FormControl
              key={field.name}
              fullWidth
              size='small'
              required={isRequired}
              disabled={isDisabled}
              error={!!error}
            >
              <InputLabel>{field.label}</InputLabel>
              <Select
                name={field.name}
                value={value}
                label={field.label}
                onChange={(e) => handleChange(field.name, e.target.value)}
              >
                {(field.options || []).map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        case 'checkbox':
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Checkbox
                  checked={!!value}
                  disabled={isDisabled}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                />
              }
              label={field.label}
            />
          );
        case 'date':
          return (
            <LocalizationProvider
              key={field.name}
              dateAdapter={AdapterDayjs}
            >
              <DatePicker
                label={field.label}
                value={value ? dayjs(value as string) : null}
                onChange={(newValue: dayjs.Dayjs | null) =>
                  handleChange(field.name, newValue?.toISOString())
                }
                disabled={isDisabled}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    required: isRequired,
                    error: !!error,
                    helperText: error,
                  },
                }}
              />
            </LocalizationProvider>
          );
        case 'file':
          return (
            <Button
              key={field.name}
              variant='outlined'
              component='label'
              disabled={isDisabled}
            >
              {field.label}
              <input
                type='file'
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleChange(field.name, file);
                }}
              />
            </Button>
          );
        default:
          if (field.render) {
            return field.render({
              name: field.name,
              value,
              onChange: (v: unknown) => handleChange(field.name, v),
              isRequired,
              isDisabled,
            });
          }
          return null;
      }
    },
    [values, errors, handleChange]
  );

  const renderForm = () => {
    if (fields.length === 1 || colCount === 1) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {fields.map((field) => (
            <Box key={field.name}>{renderField(field)}</Box>
          ))}
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: `repeat(${colCount}, 1fr)`,
        }}
      >
        {fields.map((field) => (
          <Box
            key={field.name}
            sx={{ gridColumn: `span ${field.colSpan || 1}` }}
          >
            {renderField(field)}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Card>
      {title && <CardHeader title={title} />}
      <CardContent>
        <form
          onSubmit={handleSubmit}
          onReset={handleReset}
        >
          {renderForm()}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
            {showReset && (
              <Button
                type='reset'
                variant='outlined'
              >
                {resetLabel}
              </Button>
            )}
            <Button
              type='submit'
              variant='contained'
            >
              {submitLabel}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
