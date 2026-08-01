/**
 * SubTableBuilder — 表单内嵌子表组件
 *
 * 支持在父表单中渲染可编辑的子表（如订单明细行、物料列表），
 * 提供新增、编辑、删除行的能力，并支持字段级校验。
 *
 * @example
 * ```tsx
 * <SubTableBuilder
 *   config={schema.nestedTables[0]}
 *   value={formData.items}
 *   onChange={(rows) => setFormData({ ...formData, items: rows })}
 *   fieldSchema={itemFields}
 *   mode="create"
 * />
 * ```
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  Typography,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

import type { NestedTableConfig } from '@/schema/schemaExtensions';
import type { SchemaField } from '@/schema/types';

// ============ Props ============

export interface SubTableBuilderProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** 嵌套表配置 */
  config: NestedTableConfig;
  /** 当前行数据 */
  value: T[];
  /** 行数据变更回调 */
  onChange: (rows: T[]) => void;
  /** 字段定义（用于表单渲染和校验） */
  fieldSchema?: SchemaField[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 表单模式 */
  mode: 'create' | 'edit' | 'view';
}

// ============ 校验工具 ============

function validateFieldValue(
  field: SchemaField,
  value: unknown,
  allValues: Record<string, unknown>
): string {
  if (field.required && !value) {
    return `${field.label}为必填项`;
  }

  if (field.validation) {
    const stringValue = String(value ?? '');
    for (const rule of field.validation) {
      switch (rule.type) {
        case 'required':
          if (!value) return rule.message || `${field.label}为必填项`;
          break;
        case 'minLength':
          if (stringValue.length < Number(rule.value ?? 0))
            return rule.message || `${field.label}长度不能少于${rule.value}个字符`;
          break;
        case 'maxLength':
          if (stringValue.length > Number(rule.value ?? Infinity))
            return rule.message || `${field.label}长度不能超过${rule.value}个字符`;
          break;
        case 'min':
          if (Number(value) < Number(rule.value ?? -Infinity))
            return rule.message || `${field.label}不能小于${rule.value}`;
          break;
        case 'max':
          if (Number(value) > Number(rule.value ?? Infinity))
            return rule.message || `${field.label}不能大于${rule.value}`;
          break;
        case 'pattern':
          break;
        default:
          break;
      }
    }
  }
  return '';
}

// ============ 默认空行工厂 ============

function createEmptyRow(fields?: SchemaField[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (fields) {
    for (const field of fields) {
      row[field.name] = field.defaultValue ?? '';
    }
  }
  return row;
}

// ============ Dialog 表单组件 ============

interface RowFormDialogProps {
  open: boolean;
  title: string;
  fields: SchemaField[];
  initialValues: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  disabled?: boolean;
  mode: 'create' | 'edit' | 'view';
  colCount?: number;
}

const RowFormDialog: React.FC<RowFormDialogProps> = ({
  open,
  title,
  fields,
  initialValues,
  onClose,
  onSubmit,
  disabled,
  mode,
  colCount = 2,
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setValues(initialValues);
      setErrors({});
    }
  }, [open, initialValues]);

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const error = validateFieldValue(field, values[field.name], values);
      if (error) newErrors[field.name] = error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(values);
  }, [fields, values, onSubmit]);

  const readOnly = mode === 'view';

  const renderField = useCallback(
    (field: SchemaField) => {
      const value = values[field.name] ?? '';
      const error = errors[field.name];
      const isDisabled =
        disabled || readOnly || field.readonly || (mode === 'edit' && field.readonlyOnEdit);

      switch (field.type) {
        case 'number':
        case 'text':
          return (
            <TextField
              key={field.name}
              label={field.label}
              type={field.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={isDisabled}
              error={!!error}
              helperText={error}
              required={field.required}
              fullWidth
              size='small'
            />
          );
        case 'textarea':
          return (
            <TextField
              key={field.name}
              label={field.label}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={isDisabled}
              error={!!error}
              helperText={error}
              required={field.required}
              fullWidth
              multiline
              rows={3}
              size='small'
            />
          );
        case 'select':
          return (
            <FormControl
              key={field.name}
              fullWidth
              size='small'
              disabled={isDisabled}
              error={!!error}
            >
              <InputLabel>{field.label}</InputLabel>
              <Select
                value={value ?? ''}
                label={field.label}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              >
                {field.options &&
                  'type' in field.options &&
                  field.options.type === 'static' &&
                  field.options.options.map((opt) => (
                    <MenuItem
                      key={String(opt.value)}
                      value={opt.value as string | number}
                    >
                      {opt.label}
                    </MenuItem>
                  ))}
              </Select>
              {error && <FormHelperText error>{error}</FormHelperText>}
            </FormControl>
          );
        case 'date':
          return (
            <TextField
              key={field.name}
              label={field.label}
              type='date'
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={isDisabled}
              error={!!error}
              helperText={error}
              required={field.required}
              fullWidth
              size='small'
            />
          );
        case 'switch':
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Switch
                  checked={!!value}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  disabled={isDisabled}
                  size='small'
                />
              }
              label={field.label}
            />
          );
        default:
          return (
            <TextField
              key={field.name}
              label={field.label}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={isDisabled}
              error={!!error}
              helperText={error}
              required={field.required}
              fullWidth
              size='small'
            />
          );
      }
    },
    [values, errors, disabled, readOnly, mode, handleChange]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          {title}
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
        >
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
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
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          variant='outlined'
          size='small'
        >
          {mode === 'view' ? '关闭' : '取消'}
        </Button>
        {mode !== 'view' && (
          <Button
            onClick={handleSubmit}
            variant='contained'
            size='small'
          >
            确定
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ============ 主组件 ============

export function SubTableBuilder<T extends Record<string, unknown> = Record<string, unknown>>({
  config,
  value,
  onChange,
  fieldSchema,
  disabled,
  mode,
}: SubTableBuilderProps<T>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const rowKeyField = config.rowKeyField || 'id';
  const allowAdd = config.allowAdd ?? true;
  const allowEdit = config.allowEdit ?? true;
  const allowDelete = config.allowDelete ?? true;
  const isViewMode = mode === 'view';

  const columnDefs = config.columns;
  const fields = config.fields || fieldSchema || [];

  const displayRows = useMemo(() => {
    if (config.minRows && value.length < config.minRows) {
      const padded = [...value];
      for (let i = value.length; i < config.minRows; i++) {
        padded.push(createEmptyRow(fields) as T);
      }
      return padded;
    }
    return value;
  }, [value, config.minRows, fields]);

  const handleAdd = useCallback(() => {
    if (config.maxRows && value.length >= config.maxRows) return;
    setEditingIndex(null);
    setDialogOpen(true);
  }, [config.maxRows, value.length]);

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (index: number) => {
      const next = [...value];
      next.splice(index, 1);
      onChange(next);
    },
    [value, onChange]
  );

  const handleSubmitRow = useCallback(
    (rowValues: Record<string, unknown>) => {
      const next = [...value] as T[];
      if (editingIndex !== null) {
        next[editingIndex] = { ...next[editingIndex], ...rowValues };
      } else {
        next.push(rowValues as T);
      }
      onChange(next);
      setDialogOpen(false);
      setEditingIndex(null);
    },
    [value, onChange, editingIndex]
  );

  const validateAll = useCallback((): string | null => {
    if (!fields.length || isViewMode) return null;
    for (let i = 0; i < value.length; i++) {
      const row = value[i];
      for (const field of fields) {
        const error = validateFieldValue(field, row[field.name], row);
        if (error) return `第 ${i + 1} 行: ${error}`;
      }
    }
    if (config.validate) {
      return config.validate(value as Record<string, unknown>[]);
    }
    return null;
  }, [value, fields, config, isViewMode]);

  const dialogTitle = useMemo(() => {
    const prefix = config.title ? `${config.title} - ` : '';
    if (isViewMode) return `${prefix}查看行`;
    if (editingIndex !== null) return `${prefix}编辑行`;
    return `${prefix}新增行`;
  }, [config.title, editingIndex, isViewMode]);

  const dialogInitialValues = useMemo(() => {
    if (editingIndex !== null && value[editingIndex]) {
      return value[editingIndex] as Record<string, unknown>;
    }
    return createEmptyRow(fields);
  }, [editingIndex, value, fields]);

  const readOnly = mode === 'view';

  return (
    <Paper
      variant='outlined'
      sx={{ borderRadius: 2, overflow: 'hidden' }}
    >
      {/* 标题栏 */}
      {(config.title || allowAdd) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1.5,
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, color: 'text.secondary' }}
          >
            {config.title || '子表'}
            <Chip
              size='small'
              label={`${value.length} 行`}
              sx={{ ml: 1, height: 20, fontSize: '0.75rem' }}
            />
          </Typography>
          {!readOnly && allowAdd && (
            <Button
              size='small'
              variant='text'
              startIcon={<Plus size={16} />}
              onClick={handleAdd}
              disabled={disabled || (config.maxRows ? value.length >= config.maxRows : false)}
            >
              {config.addButtonText || '新增行'}
            </Button>
          )}
        </Box>
      )}

      {/* 校验错误提示 */}
      {(() => {
        const err = validateAll();
        if (!err) return null;
        return (
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: 'error.lighter',
              color: 'error.dark',
              fontSize: '0.75rem',
              borderBottom: 1,
              borderColor: 'error.main',
            }}
          >
            {err}
          </Box>
        );
      })()}

      {/* 表格主体 */}
      {displayRows.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant='body2'>暂无数据</Typography>
          {!readOnly && allowAdd && (
            <Button
              size='small'
              variant='outlined'
              startIcon={<Plus size={16} />}
              onClick={handleAdd}
              sx={{ mt: 1 }}
              disabled={disabled}
            >
              {config.addButtonText || '新增第一行'}
            </Button>
          )}
        </Box>
      ) : (
        <Table
          size='small'
          sx={{ '& td, & th': { borderBottom: 1, borderColor: 'divider' } }}
        >
          <TableHead>
            <TableRow>
              {columnDefs.map((col) => (
                <TableCell
                  key={col.id}
                  sx={{
                    fontWeight: 600,
                    bgcolor: 'grey.50',
                    width: col.width,
                    minWidth: col.minWidth,
                  }}
                  align={col.align || 'left'}
                >
                  {col.label || col.id}
                </TableCell>
              ))}
              {!readOnly && (allowEdit || allowDelete) && (
                <TableCell
                  sx={{ fontWeight: 600, bgcolor: 'grey.50', width: 80 }}
                  align='center'
                >
                  操作
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((row, index) => (
              <TableRow
                key={String(row[rowKeyField] ?? index)}
                hover
              >
                {columnDefs.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align || 'left'}
                    sx={{
                      width: col.width,
                      minWidth: col.minWidth,
                      color: 'text.primary',
                      fontSize: '0.875rem',
                    }}
                  >
                    {col.render ? (
                      col.render(row, index)
                    ) : (
                      <Typography
                        variant='body2'
                        noWrap
                      >
                        {String(row[col.id] ?? '')}
                      </Typography>
                    )}
                  </TableCell>
                ))}
                {!readOnly && (allowEdit || allowDelete) && (
                  <TableCell align='center'>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {allowEdit && (
                        <Tooltip title='编辑'>
                          <IconButton
                            size='small'
                            onClick={() => handleEdit(index)}
                            disabled={disabled}
                          >
                            <Pencil size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {allowDelete && (
                        <Tooltip title='删除'>
                          <IconButton
                            size='small'
                            onClick={() => handleDelete(index)}
                            disabled={disabled}
                            color='error'
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 编辑 Dialog */}
      <RowFormDialog
        open={dialogOpen}
        title={dialogTitle}
        fields={fields}
        initialValues={dialogInitialValues}
        onClose={() => {
          setDialogOpen(false);
          setEditingIndex(null);
        }}
        onSubmit={handleSubmitRow}
        disabled={disabled}
        mode={mode}
        colCount={config.formColCount || 2}
      />
    </Paper>
  );
}

export default SubTableBuilder;
