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
  Autocomplete,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

export type ValidationRule<T extends Record<string, unknown> = Record<string, unknown>> =
  | {
      type: 'required';
      message?: string;
    }
  | {
      type: 'minLength';
      value: number;
      message?: string;
    }
  | {
      type: 'maxLength';
      value: number;
      message?: string;
    }
  | {
      type: 'min';
      value: number;
      message?: string;
    }
  | {
      type: 'max';
      value: number;
      message?: string;
    }
  | {
      type: 'pattern';
      value: RegExp;
      message?: string;
    }
  | {
      type: 'email';
      message?: string;
    }
  | {
      type: 'url';
      message?: string;
    }
  | {
      type: 'phone';
      message?: string;
    }
  | {
      type: 'custom';
      validate: (value: unknown, formValues: T) => string | null;
      message?: string;
    };

export type FieldVisibility<T extends Record<string, unknown> = Record<string, unknown>> =
  boolean | ((values: T) => boolean);

export type FieldDisabled<T extends Record<string, unknown> = Record<string, unknown>> =
  boolean | ((values: T) => boolean);

export interface FormFieldConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'textarea'
    | 'select'
    | 'autocomplete'
    | 'checkbox'
    | 'checkbox-group'
    | 'radio'
    | 'date'
    | 'datetime'
    | 'file'
    | 'switch';
  placeholder?: string;
  required?: boolean | ((values: T) => boolean);
  disabled?: FieldDisabled<T>;
  visible?: FieldVisibility<T>;
  defaultValue?: unknown;
  options?: { value: string | number; label: string }[];
  optionsAsync?: (search: string) => Promise<{ value: string | number; label: string }[]>;
  validation?: ValidationRule<T>[];
  colSpan?: number;
  dependsOn?: string[];
  onChange?: (name: string, value: unknown, values: T) => void;
  render?: (props: {
    name: string;
    value: unknown;
    onChange: (value: unknown) => void;
    isRequired: boolean;
    isDisabled: boolean;
    errors: Record<string, string>;
    formValues: T;
  }) => React.ReactNode;
}

export type FormBuilderMode = 'create' | 'edit' | 'view';

/** 表单分组配置 */
export interface FormSectionConfig {
  title: string;
  fields: string[];
}

export interface FormBuilderConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  fields: FormFieldConfig<T>[];
  onSubmit: (values: T) => Promise<void> | void;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  title?: string;
  initialValues?: Partial<T>;
  colCount?: number;
  onFieldChange?: (name: string, value: unknown, values: T) => void;
  /** 提交成功后回调（onSubmit 不抛异常即视为成功） */
  onSubmitSuccess?: () => void;
  /** 重置/取消按钮回调，默认只清空表单 */
  onReset?: () => void;
  /** 表单模式：create=新建（默认）, edit=编辑（字段级 disabled 生效）, view=只读（全部禁用，隐藏提交按钮） */
  mode?: FormBuilderMode;
  /** 表单分组配置 */
  formSections?: FormSectionConfig[];
}

export default function FormBuilder<T extends Record<string, unknown> = Record<string, unknown>>({
  fields,
  onSubmit,
  submitLabel = '提交',
  resetLabel = '重置',
  showReset = true,
  title,
  initialValues = {},
  colCount = 2,
  onFieldChange,
  onSubmitSuccess,
  onReset,
  mode = 'create',
  formSections,
}: FormBuilderConfig<T>) {
  const [values, setValues] = React.useState<T>(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      initial[field.name] =
        (initialValues as Record<string, unknown>)[field.name] ?? field.defaultValue ?? '';
    });
    return initial as T;
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [asyncOptions, setAsyncOptions] = React.useState<
    Record<string, { value: string | number; label: string }[]>
  >({});

  const validateField = useCallback(
    (field: FormFieldConfig<T>, value: unknown, formValues: T): string => {
      const isRequired =
        typeof field.required === 'function'
          ? field.required(formValues)
          : (field.required ?? false);

      if (isRequired && !value) {
        return `${field.label}为必填项`;
      }

      if (field.validation) {
        const stringValue = String(value ?? '');

        for (const rule of field.validation) {
          switch (rule.type) {
            case 'required':
              if (!value) {
                return rule.message || `${field.label}为必填项`;
              }
              break;
            case 'minLength':
              if (stringValue.length < rule.value) {
                return rule.message || `${field.label}长度不能少于${rule.value}个字符`;
              }
              break;
            case 'maxLength':
              if (stringValue.length > rule.value) {
                return rule.message || `${field.label}长度不能超过${rule.value}个字符`;
              }
              break;
            case 'min':
              if (Number(value) < rule.value) {
                return rule.message || `${field.label}不能小于${rule.value}`;
              }
              break;
            case 'max':
              if (Number(value) > rule.value) {
                return rule.message || `${field.label}不能大于${rule.value}`;
              }
              break;
            case 'pattern':
              if (!rule.value.test(stringValue)) {
                return rule.message || `${field.label}格式不正确`;
              }
              break;
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(stringValue)) {
                return rule.message || `${field.label}邮箱格式不正确`;
              }
              break;
            case 'url':
              try {
                new URL(stringValue);
              } catch {
                return rule.message || `${field.label}URL格式不正确`;
              }
              break;
            case 'phone':
              const phoneRegex = /^1[3-9]\d{9}$/;
              if (!phoneRegex.test(stringValue)) {
                return rule.message || `${field.label}手机号格式不正确`;
              }
              break;
            case 'custom':
              const customError = rule.validate(value, formValues);
              if (customError) {
                return customError;
              }
              break;
          }
        }
      }
      return '';
    },
    []
  );

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => {
        const newValues = { ...prev, [name]: value } as T;

        fields.forEach((field) => {
          if (field.dependsOn?.includes(name)) {
            const fieldErrors = validateField(
              field,
              newValues[field.name as keyof T] as unknown,
              newValues
            );
            setErrors((e) => ({ ...e, [field.name]: fieldErrors }));
          }
        });

        return newValues;
      });

      setErrors((prev) => ({ ...prev, [name]: '' }));

      setTimeout(() => {
        const currentValues = { ...values, [name]: value } as T;
        const field = fields.find((f) => f.name === name);
        field?.onChange?.(name, value, currentValues);
        onFieldChange?.(name, value, currentValues);
      }, 0);
    },
    [fields, validateField, values, onFieldChange]
  );

  const handleAsyncOptionsSearch = useCallback(
    async (fieldName: string, search: string) => {
      const field = fields.find((f) => f.name === fieldName);
      if (field?.optionsAsync) {
        const results = await field.optionsAsync(search);
        setAsyncOptions((prev) => ({ ...prev, [fieldName]: results }));
      }
    },
    [fields]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: Record<string, string> = {};

      fields.forEach((field) => {
        const isVisible =
          typeof field.visible === 'function' ? field.visible(values) : (field.visible ?? true);
        if (!isVisible) return;

        const error = validateField(field, values[field.name as keyof T] as unknown, values);
        if (error) newErrors[field.name] = error;
      });

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      try {
        await onSubmit(values);
        onSubmitSuccess?.();
      } catch {
        // onSubmit 负责自己的错误处理
      }
    },
    [fields, values, validateField, onSubmit, onSubmitSuccess]
  );

  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    fields.forEach((field) => {
      initial[field.name] =
        (initialValues as Record<string, unknown>)[field.name] ?? field.defaultValue ?? '';
    });
    setValues(initial as T);
    setErrors({});
    setAsyncOptions({});
    onReset?.();
  }, [fields, initialValues, onReset]);

  const renderField = useCallback(
    (field: FormFieldConfig<T>) => {
      const isRequired =
        typeof field.required === 'function' ? field.required(values) : (field.required ?? false);
      const isDisabled =
        typeof field.disabled === 'function' ? field.disabled(values) : (field.disabled ?? false);
      const isVisible =
        typeof field.visible === 'function' ? field.visible(values) : (field.visible ?? true);
      const value = values[field.name as keyof T] as unknown;
      const error = errors[field.name];

      if (!isVisible) return null;

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
        case 'select': {
          const menuItems = (field.options || []).map((opt) => (
            <MenuItem
              key={opt.value}
              value={opt.value}
            >
              {opt.label}
            </MenuItem>
          ));

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
                displayEmpty
              >
                {!isRequired && <MenuItem value=''>请选择</MenuItem>}
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
        }
        case 'autocomplete':
          return (
            <Autocomplete
              key={field.name}
              options={asyncOptions[field.name] || field.options || []}
              getOptionLabel={(opt) => opt.label}
              value={(field.options || asyncOptions[field.name] || []).find(
                (opt) => opt.value === value
              )}
              onChange={(_, newValue) => handleChange(field.name, newValue?.value ?? '')}
              onInputChange={(_, inputValue) => handleAsyncOptionsSearch(field.name, inputValue)}
              disabled={isDisabled}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={field.label}
                  placeholder={field.placeholder}
                  required={isRequired}
                  error={!!error}
                  helperText={error}
                  size='small'
                />
              )}
            />
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
        case 'checkbox-group':
          return (
            <FormControl
              key={field.name}
              fullWidth
              error={!!error}
            >
              <FormLabel>{field.label}</FormLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {(field.options || []).map((opt) => (
                  <FormControlLabel
                    key={opt.value}
                    control={
                      <Checkbox
                        checked={(value as string[])?.includes(String(opt.value)) ?? false}
                        disabled={isDisabled}
                        onChange={(e) => {
                          const current = (value as string[]) || [];
                          const newValue = e.target.checked
                            ? [...current, String(opt.value)]
                            : current.filter((v) => v !== String(opt.value));
                          handleChange(field.name, newValue);
                        }}
                      />
                    }
                    label={opt.label}
                  />
                ))}
              </Box>
              {error && <FormLabel error>{error}</FormLabel>}
            </FormControl>
          );
        case 'radio':
          return (
            <FormControl
              key={field.name}
              fullWidth
              error={!!error}
            >
              <FormLabel>{field.label}</FormLabel>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {(field.options || []).map((opt) => (
                  <FormControlLabel
                    key={opt.value}
                    control={
                      <Checkbox
                        checked={value === opt.value}
                        disabled={isDisabled}
                        onChange={() => handleChange(field.name, opt.value)}
                      />
                    }
                    label={opt.label}
                  />
                ))}
              </Box>
              {error && <FormLabel error>{error}</FormLabel>}
            </FormControl>
          );
        case 'switch':
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
        case 'datetime':
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
              errors,
              formValues: values,
            });
          }
          return null;
      }
    },
    [values, errors, asyncOptions, handleChange, handleAsyncOptionsSearch]
  );

  const renderForm = () => {
    // 如果有表单分组配置，使用分组渲染
    if (formSections && formSections.length > 0) {
      const fieldMap = new Map(fields.map((f) => [f.name, f]));

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {formSections.map((section) => {
            const sectionFields = section.fields
              .map((name) => fieldMap.get(name))
              .filter((f): f is FormFieldConfig<T> => !!f);

            if (sectionFields.length === 0) return null;

            return (
              <Box key={section.title}>
                <Typography
                  variant='subtitle2'
                  sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}
                >
                  {section.title}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                  }}
                >
                  {sectionFields.map((field) => (
                    <Box
                      key={field.name}
                      sx={{ gridColumn: `span ${field.colSpan || 1}` }}
                    >
                      {renderField(field)}
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
          // 渲染未分组的字段
          {(() => {
            const groupedFieldNames = new Set(formSections.flatMap((s) => s.fields));
            const ungroupedFields = fields.filter((f) => !groupedFieldNames.has(f.name));
            if (ungroupedFields.length === 0) return null;

            return (
              <Box>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                  }}
                >
                  {ungroupedFields.map((field) => (
                    <Box
                      key={field.name}
                      sx={{ gridColumn: `span ${field.colSpan || 1}` }}
                    >
                      {renderField(field)}
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })()}
        </Box>
      );
    }

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
                {mode === 'view' ? '关闭' : resetLabel}
              </Button>
            )}
            {mode !== 'view' && (
              <Button
                type='submit'
                variant='contained'
              >
                {submitLabel}
              </Button>
            )}
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
