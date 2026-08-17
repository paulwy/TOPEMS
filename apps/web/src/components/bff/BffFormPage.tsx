/**
 * V44.0 Track D: BFF 表单页模板组件
 *
 * 功能:
 * - 根据 fieldConfig 自动渲染表单字段
 * - 自动生成 create/update mutation
 * - 集成表单验证
 * - 支持提交状态 + 乐观更新
 * - 响应式布局
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Switch,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import i18n from '@/i18n';
import { ArrowLeft, Save, X, RotateCcw, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useForm,
  Controller,
  type FieldValues,
  type UseFormReturn,
  type DefaultValues,
} from 'react-hook-form';
import useBffCrud from '@/hooks/bff/useBffCrud';
import type { UseBffCrudOptions } from '@/hooks/bff/useBffCrud';

// ============ 类型定义 ============

export interface BffFormField {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'textarea'
    | 'select'
    | 'date'
    | 'datetime-local'
    | 'checkbox'
    | 'switch'
    | 'autocomplete';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: unknown, allValues: Record<string, unknown>) => string | null;
  };
  defaultValue?: unknown;
  gridSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  helperText?: string;
  /** 自定义渲染 */
  render?: (
    value: unknown,
    onChange: (value: unknown) => void,
    error: string | undefined
  ) => React.ReactNode;
}

export interface BffFormSection {
  title?: string;
  description?: string;
  fields: BffFormField[];
}

export interface BffFormPageProps<T extends FieldValues = FieldValues> {
  /** 实体类型 */
  entityType: string;
  /** 服务名 */
  service: string;
  /** 表单模式 */
  mode: 'create' | 'edit';
  /** 编辑模式下的实体 ID */
  entityId?: string;
  /** React Query key */
  queryKey: unknown[];
  /** 页面标题 */
  title?: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 字段配置（一维，简单表单） */
  fields?: BffFormField[];
  /** 分组字段配置（复杂表单） */
  sections?: BffFormSection[];
  /** 初始数据 */
  initialData?: Partial<T>;
  /** 返回路径 */
  backPath?: string;
  /** 返回回调 */
  onBack?: () => void;
  /** 提交成功回调 */
  onSuccess?: (data: T) => void;
  /** 提交失败回调 */
  onError?: (error: Error) => void;
  /** 提交按钮文本 */
  submitText?: string;
  /** 自定义底部操作栏 */
  footerActions?: React.ReactNode;
  /** 实体名称（用于通知） */
  entityName?: string;
  /** 缓存新鲜时间 */
  staleTime?: number;
  /** 是否显示顶部信息提示 */
  showInfoAlert?: boolean;
  /** 信息提示内容 */
  infoAlertMessage?: string;
}

// ============ 字段渲染 ============

function FormFieldRenderer({
  field,
  control,
  errors,
}: {
  field: BffFormField;
  control: unknown;
  errors: Record<string, { message?: string }>;
}) {
  const error = errors[field.name];

  return (
    <Controller
      name={field.name}
      control={control as UseFormReturn['control']}
      defaultValue={field.defaultValue ?? ''}
      rules={{
        required: field.validation?.required
          ? `${field.label}${i18n.t('components.bff_form_page.k0')}`
          : false,
        minLength: field.validation?.minLength
          ? {
              value: field.validation.minLength,
              message: `${field.label}${i18n.t('components.bff_form_page.k1')}${field.validation.minLength}${i18n.t('components.bff_form_page.k2')}`,
            }
          : undefined,
        maxLength: field.validation?.maxLength
          ? {
              value: field.validation.maxLength,
              message: `${field.label}${i18n.t('components.bff_form_page.k3')}${field.validation.maxLength}${i18n.t('components.bff_form_page.k4')}`,
            }
          : undefined,
        min: field.validation?.min
          ? {
              value: field.validation.min,
              message: `${field.label}${i18n.t('components.bff_form_page.k5')}${field.validation.min}`,
            }
          : undefined,
        max: field.validation?.max
          ? {
              value: field.validation.max,
              message: `${field.label}${i18n.t('components.bff_form_page.k6')}${field.validation.max}`,
            }
          : undefined,
        pattern: field.validation?.pattern
          ? {
              value: field.validation.pattern,
              message: `${field.label}${i18n.t('components.bff_form_page.k7')}`,
            }
          : undefined,
        validate: field.validation?.custom
          ? (value: unknown, allValues: Record<string, unknown>) => {
              const result = field.validation?.custom?.(value, allValues);
              return result === null ? true : result;
            }
          : undefined,
      }}
      render={({ field: controllerField }) => {
        const { value, onChange, ...rest } = controllerField;

        if (field.render) {
          const rendered = field.render(value, onChange, error?.message);
          return React.isValidElement(rendered) ? rendered : <>{rendered}</>;
        }

        switch (field.type) {
          case 'textarea':
            return (
              <TextField
                {...rest}
                label={field.label}
                placeholder={field.placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                multiline
                rows={4}
                fullWidth
                disabled={field.disabled}
                error={!!error}
                helperText={error?.message || field.helperText}
                required={field.required}
              />
            );

          case 'select':
            return (
              <FormControl
                fullWidth
                error={!!error}
                required={field.required}
              >
                <InputLabel>{field.label}</InputLabel>
                <Select
                  {...rest}
                  value={value ?? ''}
                  onChange={(e) => onChange(e.target.value)}
                  label={field.label}
                  disabled={field.disabled}
                >
                  {field.options?.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
                {(error?.message || field.helperText) && (
                  <FormHelperText>{error?.message || field.helperText}</FormHelperText>
                )}
              </FormControl>
            );

          case 'checkbox':
            return (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={field.disabled}
                  />
                }
                label={
                  <>
                    {field.label}
                    {field.required && <span style={{ color: 'error.main' }}> *</span>}
                  </>
                }
              />
            );

          case 'switch':
            return (
              <FormControlLabel
                control={
                  <Switch
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={field.disabled}
                  />
                }
                label={
                  <>
                    {field.label}
                    {field.required && <span style={{ color: 'error.main' }}> *</span>}
                  </>
                }
              />
            );

          case 'number':
            return (
              <TextField
                {...rest}
                type='number'
                label={field.label}
                placeholder={field.placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                fullWidth
                disabled={field.disabled}
                error={!!error}
                helperText={error?.message || field.helperText}
                required={field.required}
                slotProps={{
                  input: {
                    min: field.validation?.min,
                    max: field.validation?.max,
                  },
                }}
              />
            );

          case 'date':
          case 'datetime-local':
            return (
              <TextField
                {...rest}
                type={field.type}
                label={field.label}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                fullWidth
                disabled={field.disabled}
                error={!!error}
                helperText={error?.message || field.helperText}
                required={field.required}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            );

          case 'email':
          case 'password':
          case 'text':
          default:
            return (
              <TextField
                {...rest}
                type={field.type === 'password' ? 'password' : 'text'}
                label={field.label}
                placeholder={field.placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                fullWidth
                disabled={field.disabled}
                error={!!error}
                helperText={error?.message || field.helperText}
                required={field.required}
              />
            );
        }
      }}
    />
  );
}

// ============ 主组件 ============

function BffFormPageInner<T extends FieldValues = FieldValues>(props: BffFormPageProps<T>) {
  const {
    entityType,
    service,
    mode,
    entityId,
    queryKey,
    title,
    subtitle,
    fields = [],
    sections = [],
    initialData,
    backPath,
    onBack,
    onSuccess,
    onError,
    submitText,
    footerActions,
    entityName,
    staleTime,
    showInfoAlert = false,
    infoAlertMessage,
  } = props;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const allFields = useMemo(() => {
    if (sections.length > 0) {
      return sections.flatMap((s) => s.fields);
    }
    return fields;
  }, [fields, sections]);

  const defaultValues = useMemo(() => {
    const values: Record<string, unknown> = {};
    allFields.forEach((f) => {
      values[f.name] = f.defaultValue ?? '';
    });
    if (initialData) {
      Object.assign(values, initialData);
    }
    return values as DefaultValues<T>;
  }, [allFields, initialData]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
    setValue,
  } = useForm<T>({
    defaultValues,
    mode: 'onBlur',
  });

  const crudOptions: UseBffCrudOptions<T> = {
    service,
    entityType,
    queryKey,
    autoFetch: false,
    entityName,
    staleTime,
  };

  const crud = useBffCrud<T>(crudOptions);

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && entityId) {
      crud.get(entityId).then((data) => {
        if (data) {
          Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            setValue(key as never, value as never, { shouldValidate: false });
          });
        }
      });
    }
  }, [mode, entityId, crud, setValue]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  }, [onBack, backPath, navigate]);

  const onSubmit = useCallback(
    async (data: T) => {
      setSubmitError(null);
      try {
        let result: T | null = null;

        if (mode === 'create') {
          result = await crud.create(data as Partial<T>);
        } else if (mode === 'edit' && entityId) {
          result = await crud.update(entityId, data as Partial<T>);
        }

        if (result) {
          onSuccess?.(result);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setSubmitError(error.message);
        onError?.(error);
      }
    },
    [mode, entityId, crud, onSuccess, onError]
  );

  const handleReset = useCallback(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  const isSubmitting =
    (mode === 'create' && crud.mutations.createMutation.isPending) ||
    (mode === 'edit' && crud.mutations.updateMutation.isPending);

  const displayTitle =
    title ??
    (mode === 'create'
      ? `${i18n.t('components.bff_form_page.k9')}${entityName ?? i18n.t('components.bff_form_page.k0')}`
      : `${i18n.t('components.bff_form_page.k8')}${entityName ?? i18n.t('components.bff_form_page.k1')}`);

  const displaySubmitText =
    submitText ??
    (mode === 'create'
      ? i18n.t('components.bff_form_page.k3')
      : i18n.t('components.bff_form_page.k2'));

  const renderFields = (fieldList: BffFormField[]) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(12, 1fr)',
        },
        gap: 3,
      }}
    >
      {fieldList.map((field) => {
        const span = field.gridSpan ?? 6;
        return (
          <Box
            sx={{
              gridColumn: {
                xs: 'span 1',
                sm: span >= 6 ? 'span 2' : 'span 1',
                md: `span ${span}`,
              },
            }}
            key={field.name}
          >
            <FormFieldRenderer
              field={field}
              control={control}
              errors={errors as Record<string, { message?: string }>}
            />
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
      {/* 头部 */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={handleBack}
            size='small'
            aria-label={i18n.t('components.bff_form_page.k4')}
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold' }}
            >
              {displayTitle}
            </Typography>
            {subtitle && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Chip
            label={
              mode === 'create'
                ? i18n.t('components.bff_form_page.k6')
                : i18n.t('components.bff_form_page.k5')
            }
            size='small'
            color={mode === 'create' ? 'primary' : 'default'}
            variant='outlined'
          />
        </Box>
      </Paper>

      {/* 信息提示 */}
      {showInfoAlert && infoAlertMessage && (
        <Alert
          severity='info'
          icon={<Info size={18} />}
          sx={{ mb: 3 }}
        >
          {infoAlertMessage}
        </Alert>
      )}

      {/* 提交错误 */}
      {submitError && (
        <Alert
          severity='error'
          sx={{ mb: 3 }}
        >
          {submitError}
        </Alert>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit(onSubmit as (data: Record<string, unknown>) => Promise<void>)}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          {isSubmitting && <LinearProgress sx={{ mb: 3 }} />}

          {sections.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sections.map((section, index) => (
                <Box key={index}>
                  {section.title && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 'bold' }}
                      >
                        {section.title}
                      </Typography>
                      {section.description && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {section.description}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {renderFields(section.fields)}
                  {index < sections.length - 1 && <Divider sx={{ mt: 4 }} />}
                </Box>
              ))}
            </Box>
          ) : (
            renderFields(fields)
          )}
        </Paper>

        {/* 底部操作栏 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            position: isMobile ? 'fixed' : 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar - 1,
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ flex: 1 }}>
            {isDirty && (
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('components.bff_form_page.k0')}
              </Typography>
            )}
          </Box>
          {footerActions}
          <Button
            variant='outlined'
            startIcon={<RotateCcw size={16} />}
            onClick={handleReset}
            disabled={isSubmitting}
          >
            {i18n.t('components.bff_form_page.k1')}
          </Button>
          <Button
            variant='outlined'
            startIcon={<X size={16} />}
            onClick={handleBack}
            disabled={isSubmitting}
          >
            {i18n.t('components.bff_form_page.k2')}
          </Button>
          <Button
            type='submit'
            variant='contained'
            startIcon={<Save size={16} />}
            disabled={isSubmitting || (!isDirty && mode === 'edit')}
            loading={isSubmitting}
          >
            {displaySubmitText}
          </Button>
        </Paper>
      </form>
    </Box>
  );
}

export const BffFormPage = React.memo(BffFormPageInner) as typeof BffFormPageInner;

export default BffFormPage;
