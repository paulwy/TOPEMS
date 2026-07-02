#!/usr/bin/env bash
# =============================================================================
# Phase 4.3 — Form Validation Unification
# 统一 TOPEMS 项目的表单验证模式
# 
# 创建内容:
#   1. apps/web/src/utils/formSchemas.ts  — Zod Schema 工厂
#   2. apps/web/src/components/common/FormFields.tsx — 通用表单字段组件
#   3. apps/web/src/hooks/useDialogForm.ts — Dialog 表单管理 Hook
# =============================================================================

set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
SCRIPT_NAME="phase4-3-form-validation"

echo "=========================================="
echo "Phase 4.3 Form Validation Unification"
echo "=========================================="

# --------------- 工具函数 ---------------

ensure_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    echo "  [MKDIR] $dir"
    mkdir -p "$dir"
  fi
}

backup_if_exists() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "  [BACKUP] ${file} -> ${file}.bak.phase4-3"
    cp "$file" "${file}.bak.phase4-3"
  fi
}

# ============== 1. Zod Schema 工厂 ==============

SCHEMA_FILE="${PROJECT_ROOT}/apps/web/src/utils/formSchemas.ts"
ensure_dir "$(dirname "$SCHEMA_FILE")"

if [ -f "$SCHEMA_FILE" ]; then
  echo "  [BACKUP] ${SCHEMA_FILE} -> ${SCHEMA_FILE}.bak.phase4-3"
  cp "$SCHEMA_FILE" "${SCHEMA_FILE}.bak.phase4-3"
fi

echo "  [CREATE] ${SCHEMA_FILE}"
cat > "$SCHEMA_FILE" << 'SCHEMA_EOF'
/**
 * Phase 4.3 — 通用 Zod 验证 Schema 工厂
 * 
 * 提供常用字段的预定义 schema，可直接组合使用
 */
import { z } from 'zod';

// ============ 基础字段 Schema ============

/** 中文字段名称 (2-50 字符) */
export const fieldName = () => z.string()
  .min(2, '名称至少 2 个字符')
  .max(50, '名称不能超过 50 个字符');

/** 编号/代码 (2-32 字符, 字母数字下划线) */
export const fieldCode = () => z.string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '必须以字母开头，只允许字母数字下划线')
  .min(2, '编码至少 2 个字符')
  .max(32, '编码不能超过 32 个字符');

/** 描述/备注 (可选, 最长 500 字符) */
export const fieldDescription = () => z.string()
  .max(500, '描述不能超过 500 个字符')
  .optional()
  .or(z.literal(''));

/** 邮箱 */
export const fieldEmail = () => z.string()
  .email('请输入有效的邮箱地址')
  .or(z.literal(''));

/** 手机号 (中国大陆) */
export const fieldPhone = () => z.string()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码')
  .or(z.literal(''));

/** 金额 (非负数, 精度到分) */
export const fieldAmount = () => z.number()
  .min(0, '金额不能为负数')
  .refine(
    (val) => Number.isFinite(val),
    '请输入有效的金额'
  );

/** 百分比 (0-100) */
export const fieldPercentage = () => z.number()
  .min(0, '百分比不能为负数')
  .max(100, '百分比不能超过 100');

/** 日期范围 (开始 <= 结束) */
export const fieldDateRange = () => z.object({
  start: z.string().min(1, '请选择开始日期'),
  end: z.string().min(1, '请选择结束日期'),
}).refine(
  (data) => new Date(data.start) <= new Date(data.end),
  { message: '结束日期不能早于开始日期', path: ['end'] }
);

/** 分页参数 */
export const fieldPagination = () => z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});

/** 排序参数 */
export const fieldSort = () => z.object({
  field: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
}).optional();

// ============ 业务实体 Schema 模板 ============

/** 通用实体基础字段 */
export const baseEntitySchema = z.object({
  id: z.string().optional(),
  name: fieldName(),
  code: fieldCode().optional(),
  description: fieldDescription(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
});

/** 供应商/客户基础 Schema */
export const partySchema = baseEntitySchema.extend({
  contactPerson: fieldName().optional(),
  phone: fieldPhone().optional(),
  email: fieldEmail().optional(),
  address: z.string().max(200).optional(),
});

/** 物料/产品基础 Schema */
export const materialSchema = baseEntitySchema.extend({
  category: z.string().optional(),
  unit: z.string().min(1, '请选择单位').optional(),
  specification: z.string().max(100).optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
});

/** 订单基础 Schema */
export const orderSchema = z.object({
  orderNo: fieldCode(),
  orderDate: z.string().min(1, '请选择订单日期'),
  expectedDate: z.string().optional(),
  totalAmount: fieldAmount().optional(),
  status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).default('draft'),
  remark: fieldDescription(),
});

/** 项目基础 Schema */
export const projectSchema = baseEntitySchema.extend({
  startDate: z.string().min(1, '请选择开始日期'),
  endDate: z.string().optional(),
  manager: fieldName().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  progress: z.number().min(0).max(100).default(0),
  budget: fieldAmount().optional(),
});

// ============ 类型导出 ============

export type BaseEntity = z.infer<typeof baseEntitySchema>;
export type Party = z.infer<typeof partySchema>;
export type Material = z.infer<typeof materialSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Project = z.infer<typeof projectSchema>;
SCHEMA_EOF

# ============== 2. 通用表单字段组件 ==============

FORMFIELDS_FILE="${PROJECT_ROOT}/apps/web/src/components/common/FormFields.tsx"
ensure_dir "$(dirname "$FORMFIELDS_FILE")"

if [ -f "$FORMFIELDS_FILE" ]; then
  echo "  [BACKUP] ${FORMFIELDS_FILE} -> ${FORMFIELDS_FILE}.bak.phase4-3"
  cp "$FORMFIELDS_FILE" "${FORMFIELDS_FILE}.bak.phase4-3"
fi

echo "  [CREATE] ${FORMFIELDS_FILE}"
cat > "$FORMFIELDS_FILE" << 'FORMFIELDS_EOF'
/**
 * Phase 4.3 — 通用表单字段组件
 * 
 * 基于 react-hook-form Controller 的可复用字段组件
 * 自动集成 zod 验证错误显示
 */
import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import {
  TextField,
  FormControlLabel,
  Switch,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  RadioGroup,
  Radio,
  Box,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// ============ FormTextField ============

interface FormTextFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  size?: 'small' | 'medium';
}

export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  type = 'text',
  multiline,
  rows,
  required,
  disabled,
  startAdornment,
  endAdornment,
  size = 'small',
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          placeholder={placeholder}
          type={type}
          multiline={multiline}
          rows={rows}
          required={required}
          disabled={disabled}
          size={size}
          fullWidth
          error={!!error}
          helperText={error?.message}
          InputProps={{
            startAdornment: startAdornment ? (
              <InputAdornment position="start">{startAdornment}</InputAdornment>
            ) : undefined,
            endAdornment: endAdornment ? (
              <InputAdornment position="end">{endAdornment}</InputAdornment>
            ) : undefined,
          }}
        />
      )}
    />
  );
}

// ============ FormSelectField ============

interface FormSelectFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ label: string; value: any }>;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
}

export function FormSelectField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required,
  disabled,
  placeholder,
  size = 'small',
}: FormSelectFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth size={size} required={required} disabled={disabled} error={!!error}>
          <InputLabel>{label}</InputLabel>
          <Select {...field} label={label} placeholder={placeholder}>
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}

// ============ FormSwitchField ============

interface FormSwitchFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  disabled?: boolean;
}

export function FormSwitchField<T extends FieldValues>({
  name,
  control,
  label,
  disabled,
}: FormSwitchFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={<Switch {...field} checked={field.value} disabled={disabled} />}
          label={label}
        />
      )}
    />
  );
}

// ============ FormDateField ============

interface FormDateFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  disabled?: boolean;
  format?: string;
  size?: 'small' | 'medium';
}

export function FormDateField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  disabled,
  format = 'YYYY-MM-DD',
  size = 'small',
}: FormDateFieldProps<T>) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <DatePicker
            {...field}
            label={label}
            format={format}
            slotProps={{
              textField: {
                fullWidth: true,
                size,
                required,
                disabled,
                error: !!error,
                helperText: error?.message,
              },
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}

// ============ FormRadioGroup ============

interface FormRadioGroupProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ label: string; value: any }>;
  row?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export function FormRadioGroup<T extends FieldValues>({
  name,
  control,
  label,
  options,
  row = true,
  disabled,
}: FormRadioGroupProps<T>) {
  return (
    <FormControl component="fieldset" disabled={disabled}>
      <FormLabel component="legend">{label}</FormLabel>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup {...field} row={row}>
            {options.map((opt) => (
              <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
            ))}
          </RadioGroup>
        )}
      />
    </FormControl>
  );
}
FORMFIELDS_EOF

# ============== 3. useDialogForm Hook ==============

HOOK_FILE="${PROJECT_ROOT}/apps/web/src/hooks/useDialogForm.ts"
ensure_dir "$(dirname "$HOOK_FILE")"

if [ -f "$HOOK_FILE" ]; then
  echo "  [BACKUP] ${HOOK_FILE} -> ${HOOK_FILE}.bak.phase4-3"
  cp "$HOOK_FILE" "${HOOK_FILE}.bak.phase4-3"
fi

echo "  [CREATE] ${HOOK_FILE}"
cat > "$HOOK_FILE" << 'HOOK_EOF'
/**
 * Phase 4.3 — 对话框表单管理 Hook
 * 
 * 将 Dialog 的 open/close 与 react-hook-form 的 reset/submit 组合
 * 常见模式: 表格 → 点击新增/编辑 → 打开 Dialog → 填写表单 → 提交
 */
import { useState, useCallback } from 'react';
import { useForm, type UseFormProps, type FieldValues, type DefaultValues } from 'react-hook-form';

interface UseDialogFormOptions<T extends FieldValues> {
  /** react-hook-form 配置 */
  formOptions?: UseFormProps<T>;
}

interface UseDialogFormResult<T extends FieldValues> {
  /** Dialog 是否打开 */
  open: boolean;
  /** 当前编辑模式 */
  mode: 'create' | 'edit' | 'view';
  /** 当前编辑的数据 */
  editingData: Partial<T> | null;
  /** 打开新建 Dialog */
  openCreate: () => void;
  /** 打开编辑 Dialog */
  openEdit: (data: Partial<T>) => void;
  /** 打开查看 Dialog */
  openView: (data: Partial<T>) => void;
  /** 关闭 Dialog */
  close: () => void;
  /** react-hook-form 实例 */
  form: ReturnType<typeof useForm<T>>;
  /** 是否为编辑模式 */
  isEdit: boolean;
  /** 是否为查看模式 */
  isView: boolean;
}

export function useDialogForm<T extends FieldValues>({
  formOptions,
}: UseDialogFormOptions<T> = {}): UseDialogFormResult<T> {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingData, setEditingData] = useState<Partial<T> | null>(null);

  const form = useForm<T>(formOptions as UseFormProps<T>);

  const openCreate = useCallback(() => {
    setMode('create');
    setEditingData(null);
    form.reset({} as DefaultValues<T>);
    setOpen(true);
  }, [form]);

  const openEdit = useCallback((data: Partial<T>) => {
    setMode('edit');
    setEditingData(data);
    form.reset(data as DefaultValues<T>);
    setOpen(true);
  }, [form]);

  const openView = useCallback((data: Partial<T>) => {
    setMode('view');
    setEditingData(data);
    form.reset(data as DefaultValues<T>);
    setOpen(true);
  }, [form]);

  const close = useCallback(() => {
    setOpen(false);
    form.reset({} as DefaultValues<T>);
  }, [form]);

  return {
    open,
    mode,
    editingData,
    openCreate,
    openEdit,
    openView,
    close,
    form,
    isEdit: mode === 'edit',
    isView: mode === 'view',
  };
}

export default useDialogForm;
HOOK_EOF

# ============== 验证 ==============

echo ""
echo "  [VERIFY] 检查文件是否已创建..."

ERRORS=0

for f in "$SCHEMA_FILE" "$FORMFIELDS_FILE" "$HOOK_FILE"; do
  if [ -f "$f" ]; then
    LINES=$(wc -l < "$f" | tr -d ' ')
    echo "  [OK] $f (${LINES} lines)"
  else
    echo "  [FAIL] $f — 文件未创建"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "=========================================="
  echo "Phase 4.3 Form Validation Unification: DONE"
  echo "=========================================="
else
  echo "Phase 4.3: FAILED ($ERRORS errors)"
  exit 1
fi
