/**
 * V44.0 Track D: BFF 表单页模板组件
 *
 * 由字段配置（BffFormField / BffFormSection）自动渲染表单：
 * - 自动字段渲染（文本/数字/选择/日期/布尔等）
 * - 自动校验（required / min / max / pattern / custom）
 * - 创建 / 编辑双模式（配合 useBffFormPage）
 * - 乐观更新支持
 *
 * 与 BffDataTable / BffDetailPage 组成 BFF 全页面模板体系。
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Switch,
  CircularProgress,
  Divider,
  Paper,
  Alert,
  type SelectChangeEvent,
} from '@mui/material';
import { Save, X, Loader2 } from 'lucide-react';
import i18n from '@/i18n';
import { useBffFormPage, type FormFieldConfig } from '@/hooks/bff/useBffPage';

// ==================== 类型定义 ====================

/** 表单字段配置（与 hooks/bff FormFieldConfig 兼容 + 布局扩展） */
export interface BffFormField extends FormFieldConfig {
  /** 栅格跨度（1-12），默认 12 */
  gridSpan?: number;
  /** 帮助文案 */
  helperText?: string;
  /** 自动完成类型 */
  autoComplete?: string;
}

/** 表单分区 */
export interface BffFormSection {
  /** 分区标题 */
  title?: string;
  /** 分区描述 */
  description?: string;
  /** 分区内字段 */
  fields: BffFormField[];
}

/** BffFormPage Props */
export interface BffFormPageProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 实体类型（BFF 路由段） */
  entityType: string;
  /** 服务名 */
  service: string;
  /** 模式：创建 / 编辑 */
  mode: 'create' | 'edit';
  /** 编辑时的实体 id */
  entityId?: string;
  /** react-query key */
  queryKey: unknown[];
  /** 表单分区 */
  sections: BffFormSection[];
  /** 初始数据（编辑时回填） */
  initialData?: Partial<T>;
  /** 实体显示名（标题用） */
  entityName?: string;
  /** 乐观更新 */
  optimisticUpdate?: boolean;
  /** 提交成功回调 */
  onSuccess?: (data: T) => void;
  /** 提交失败回调 */
  onError?: (error: Error) => void;
  /** 提交按钮文案 */
  submitLabel?: string;
  /** 取消按钮文案 */
  cancelLabel?: string;
  /** 取消回调 */
  onCancel?: () => void;
  /** 全屏模式（居中大表单），默认 true */
  fullScreen?: boolean;
  /** 外部加载状态 */
  loading?: boolean;
}

// ==================== 字段渲染 ====================

function renderField(
  field: BffFormField,
  value: unknown,
  error: string | undefined,
  onChange: (name: string, value: unknown) => void
): React.ReactElement {
  const { name, label, type, placeholder, disabled, options, helperText, required, autoComplete } =
    field;

  switch (type) {
    case 'select':
      return (
        <FormControl
          fullWidth
          size='small'
          error={Boolean(error)}
          disabled={disabled}
        >
          <InputLabel>{label}</InputLabel>
          <Select
            label={label}
            value={(value as string | number) ?? ''}
            onChange={(e: SelectChangeEvent<unknown>) => onChange(name, e.target.value)}
          >
            {(options ?? []).map((opt) => (
              <MenuItem
                key={String(opt.value)}
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
          control={
            <Checkbox
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(name, e.target.checked)}
            />
          }
          label={label}
        />
      );
    case 'switch':
      return (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(name, e.target.checked)}
            />
          }
          label={label}
        />
      );
    case 'textarea':
      return (
        <TextField
          fullWidth
          size='small'
          multiline
          minRows={3}
          label={label}
          value={(value as string) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error ?? helperText}
          onChange={(e) => onChange(name, e.target.value)}
        />
      );
    default:
      return (
        <TextField
          fullWidth
          size='small'
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : type}
          label={label}
          value={(value as string | number) ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          error={Boolean(error)}
          helperText={error ?? helperText}
          slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined}
          onChange={(e) => onChange(name, e.target.value)}
        />
      );
  }
}

// ==================== BffFormPage ====================

/**
 * BFF 表单页模板
 *
 * @example
 * ```tsx
 * <BffFormPage
 *   entityType="work-orders"
 *   service="mes"
 *   mode="create"
 *   queryKey={['bff','work-orders','create']}
 *   sections={[
 *     { title: '基本信息', fields: [{ name:'order_no', label:'工单号', type:'text', required:true }] }
 *   ]}
 * />
 * ```
 */
export function BffFormPage<T extends Record<string, unknown>>({
  entityType,
  service,
  mode,
  entityId,
  queryKey,
  sections,
  initialData,
  entityName,
  optimisticUpdate,
  onSuccess,
  onError,
  submitLabel,
  cancelLabel,
  onCancel,
  fullScreen = true,
  loading,
}: BffFormPageProps<T>): React.ReactElement {
  const flatFields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);

  const { pageState, actions } = useBffFormPage<T>({
    entityType,
    service,
    mode,
    entityId,
    queryKey,
    fieldConfig: flatFields,
    initialData: initialData as Partial<T>,
    entityName,
    optimisticUpdate,
    onSuccess: onSuccess as ((data: T) => void) | undefined,
    onError,
  });

  const { isSubmitting, isDirty, isValid, errors, loading: hookLoading } = pageState;
  const isLoading = loading ?? hookLoading;

  return (
    <Paper sx={{ p: 3, maxWidth: fullScreen ? 960 : undefined, mx: 'auto', mt: 2 }}>
      <Typography
        variant='h6'
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <Save size={18} />
        {entityName ??
          (mode === 'create' ? i18n.t('components.bff_form_page.create') : i18n.t('components.bff_form_page.edit'))}
      </Typography>

      {pageState.error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {pageState.error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box
          component='form'
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            actions.submit();
          }}
        >
          {sections.map((section, si) => (
            <Box
              key={si}
              sx={{ mb: 3 }}
            >
              {(section.title || section.description) && (
                <Box sx={{ mb: 1.5 }}>
                  {section.title && (
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      {section.title}
                    </Typography>
                  )}
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
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                {section.fields.map((field) => (
                  <Box
                    key={field.name}
                    sx={{ gridColumn: `span ${field.gridSpan ?? 12}` }}
                  >
                    {renderField(
                      field,
                      pageState.data?.[field.name],
                      errors[field.name],
                      actions.setFieldValue
                    )}
                  </Box>
                ))}
              </Box>
              {si < sections.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}

          <Stack
            direction='row'
            spacing={2}
            sx={{ mt: 2, justifyContent: 'flex-end' }}
          >
            {onCancel && (
              <Button
                startIcon={<X size={16} />}
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {cancelLabel ?? i18n.t('components.bff_form_page.cancel')}
              </Button>
            )}
            <Button
              type='submit'
              variant='contained'
              startIcon={
                isSubmitting ? (
                  <Loader2
                    size={16}
                    className='spin'
                  />
                ) : (
                  <Save size={16} />
                )
              }
              disabled={isSubmitting || !isValid || (mode === 'edit' && !isDirty)}
            >
              {submitLabel ??
                (mode === 'create' ? i18n.t('components.bff_form_page.submit') : i18n.t('components.bff_form_page.save'))}
            </Button>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}

export default BffFormPage;
