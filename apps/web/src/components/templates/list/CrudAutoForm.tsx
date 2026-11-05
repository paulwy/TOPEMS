import React from 'react';
import {
  Box,
  Chip,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import styles from '../ListPageTemplate.module.css';
import type { CrudFormFieldConfig, ListPageCrudConfig } from './types';
import type { FormMode } from '../useListPageForm';

export interface CrudAutoFormProps<T = Record<string, unknown>> {
  /** CRUD 配置（需包含 formFields） */
  crud?: ListPageCrudConfig<T>;
  formMode: FormMode;
  formData: Record<string, unknown>;
  formErrors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  /** 表单提交（原 handleAutoFormSubmit） */
  onSubmit: () => void;
}

/**
 * formFields 模式的自动表单渲染。
 * 从 ListPageTemplate 的 renderAutoForm 原样抽出，字段类型、分组、只读态保持一致。
 */
export function CrudAutoForm<T = Record<string, unknown>>({
  crud,
  formMode,
  formData,
  formErrors,
  setFormData,
  onSubmit,
}: CrudAutoFormProps<T>): React.ReactNode {
  if (!crud?.formFields) return null;
  const colCount = crud.formColCount ?? 1;
  const visibleFields = crud.formFields.filter((field) => {
    if (formMode === 'create' && field.hideInCreate) return false;
    if (formMode === 'edit' && field.hideInEdit) return false;
    if (formMode === 'view' && field.hideInView) return false;
    if (field.visibleWhen && !field.visibleWhen(formData)) return false;
    return true;
  });
  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (crud?.onFormDataChange) {
        const computed = crud.onFormDataChange(next, key);
        if (computed && typeof computed === 'object') {
          return { ...next, ...computed };
        }
      }
      return next;
    });
  };
  const renderField = (field: CrudFormFieldConfig): React.ReactNode => {
    const value = formData[field.key];
    const disabled =
      field.disabled || formMode === 'view' || (field.disabledWhen && field.disabledWhen(formData));
    const error = formErrors[field.key];
    const formatValue = (val: unknown, fieldType: string): React.ReactNode => {
      if (val === null || val === undefined || val === '')
        return <span className={styles.il1}>-</span>;
      // 日期/时间格式化
      if (fieldType === 'date' && typeof val === 'string') {
        try {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
          }
        } catch {
          // ignore
        }
      }
      // 数组值（checkbox 等）
      if (Array.isArray(val)) {
        return val.length > 0 ? val.join(', ') : <span className={styles.il2}>-</span>;
      }
      // switch 类型
      if (fieldType === 'switch') {
        return val ? (
          <Chip
            label={i18n.t('templates.list_page_template.k9')}
            size='small'
            color='success'
            variant='outlined'
          />
        ) : (
          <Chip
            label={i18n.t('templates.list_page_template.k10')}
            size='small'
            color='default'
            variant='outlined'
          />
        );
      }
      // select 类型带标签映射
      const fieldConfig = crud?.formFields?.find((f) => f.key === field.key);
      if (fieldConfig?.type === 'select' && fieldConfig.options) {
        const option = fieldConfig.options.find((opt) => opt.value === val);
        if (option) {
          const colorMap = fieldConfig.tableStatusColorMap || {};
          const color = (colorMap[val as string] || 'default') as
            'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
          return (
            <Chip
              label={option.label}
              size='small'
              color={color}
              variant='outlined'
            />
          );
        }
      }
      return String(val);
    };
    // view 模式下的信息卡片式渲染
    if (formMode === 'view' && !field.render) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            py: 1,
          }}
        >
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {field.label}
          </Typography>
          <Box sx={{ minHeight: 24 }}>{formatValue(value, field.type)}</Box>
        </Box>
      );
    }
    if (field.render) {
      return field.render({
        value,
        onChange: (v) => handleFieldChange(field.key, v),
        mode: formMode,
      });
    }
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            type={field.type}
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={!!error}
            helperText={error}
            slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            type='number'
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={!!error}
            helperText={error}
            slotProps={{
              input: {
                inputProps: {
                  min: field.min,
                  max: field.max,
                  step: field.step,
                  readOnly: formMode === 'view',
                },
              },
            }}
          />
        );
      case 'numberRange':
        return (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size='small'
              label={`${field.label}${i18n.t('components.list_page_template.k10')}`}
              type='number'
              value={(value as Record<string, unknown>)?.min ?? ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...((value as Record<string, unknown>) || {}),
                  min: e.target.value,
                })
              }
              placeholder={i18n.t('templates.list_page_template.k11')}
              disabled={disabled}
              slotProps={{
                input: {
                  inputProps: {
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    readOnly: formMode === 'view',
                  },
                },
              }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              ~
            </Typography>
            <TextField
              fullWidth
              size='small'
              label={`${field.label}${i18n.t('components.list_page_template.k11')}`}
              type='number'
              value={(value as Record<string, unknown>)?.max ?? ''}
              onChange={(e) =>
                handleFieldChange(field.key, {
                  ...((value as Record<string, unknown>) || {}),
                  max: e.target.value,
                })
              }
              placeholder={i18n.t('templates.list_page_template.k12')}
              disabled={disabled}
              slotProps={{
                input: {
                  inputProps: {
                    min: field.min,
                    max: field.max,
                    step: field.step,
                    readOnly: formMode === 'view',
                  },
                },
              }}
            />
          </Box>
        );
      case 'textarea':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            multiline
            rows={field.rows ?? 3}
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={disabled}
            error={!!error}
            helperText={error}
            slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
          />
        );
      case 'select':
        return (
          <FormControl
            fullWidth
            size='small'
            disabled={disabled}
            error={!!error}
          >
            <InputLabel id={`${field.key}-label`}>{field.label}</InputLabel>
            <Select
              labelId={`${field.key}-label`}
              id={`${field.key}-select`}
              value={value ?? ''}
              label={field.label}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              readOnly={formMode === 'view'}
            >
              {field.options?.map((opt) => (
                <MenuItem
                  key={String(opt.value)}
                  value={opt.value}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      case 'radio':
        return (
          <FormControl
            component='fieldset'
            disabled={disabled}
            error={!!error}
          >
            <Typography
              variant='body2'
              sx={{ mb: 0.5, color: 'text.secondary' }}
            >
              {field.label}
              {field.required && <span className={styles.il3}> *</span>}
            </Typography>
            <RadioGroup
              value={value ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              row={field.optionLayout === 'horizontal'}
            >
              {field.options?.map((opt) => (
                <FormControlLabel
                  key={String(opt.value)}
                  value={opt.value}
                  control={<Radio size='small' />}
                  label={opt.label}
                />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      case 'checkbox':
        return (
          <FormControl
            component='fieldset'
            disabled={disabled}
            error={!!error}
          >
            <Typography
              variant='body2'
              sx={{ mb: 0.5, color: 'text.secondary' }}
            >
              {field.label}
              {field.required && <span className={styles.il4}> *</span>}
            </Typography>
            <FormGroup row={field.optionLayout === 'horizontal'}>
              {field.options?.map((opt) => {
                const checked = Array.isArray(value) && value.includes(opt.value);
                return (
                  <FormControlLabel
                    key={String(opt.value)}
                    control={
                      <Checkbox
                        size='small'
                        checked={checked}
                        onChange={(e) => {
                          const arr = Array.isArray(value) ? [...value] : [];
                          if (e.target.checked) {
                            arr.push(opt.value);
                          } else {
                            const idx = arr.indexOf(opt.value);
                            if (idx > -1) arr.splice(idx, 1);
                          }
                          handleFieldChange(field.key, arr);
                        }}
                      />
                    }
                    label={opt.label}
                  />
                );
              })}
            </FormGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      case 'switch':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(value)}
                onChange={(e) => handleFieldChange(field.key, e.target.checked)}
                disabled={disabled}
              />
            }
            label={field.label}
          />
        );
      case 'date':
        return (
          <TextField
            fullWidth
            size='small'
            label={field.label}
            type='date'
            value={value ?? ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            required={field.required}
            disabled={disabled}
            error={!!error}
            helperText={error}
            slotProps={formMode === 'view' ? { input: { readOnly: true } } : undefined}
          />
        );
      default:
        return null;
    }
  };
  // 按分组整理字段
  const groups = crud.formGroups || [];
  const hasGroups = groups.length > 0 && visibleFields.some((f) => f.group);
  const renderFieldGroup = (fields: typeof visibleFields) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${colCount}, 1fr)`,
        gap: 2,
      }}
    >
      {fields.map((field) => (
        <Box
          key={field.key}
          sx={{ gridColumn: `span ${field.colSpan ?? 1}` }}
        >
          {renderField(field)}
        </Box>
      ))}
    </Box>
  );
  return (
    <Box
      component='form'
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      onSubmit={(e) => {
        e.preventDefault();
        if (formMode !== 'view') onSubmit();
      }}
    >
      {hasGroups ? (
        <>
          {groups.map((group) => {
            const groupFields = visibleFields.filter((f) => f.group === group.key);
            if (groupFields.length === 0) return null;
            return (
              <Box key={group.key}>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, color: 'text.primary' }}
                  >
                    {group.title}
                  </Typography>
                  {group.description && (
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {group.description}
                    </Typography>
                  )}
                </Box>
                {renderFieldGroup(groupFields)}
              </Box>
            );
          })}
          {/* 未分组的字段放在最后 */}
          {(() => {
            const ungroupedFields = visibleFields.filter(
              (f) => !f.group || !groups.some((g) => g.key === f.group)
            );
            if (ungroupedFields.length === 0) return null;
            return (
              <Box>
                {groups.length > 0 && <Divider sx={{ my: 2 }} />}
                {renderFieldGroup(ungroupedFields)}
              </Box>
            );
          })()}
        </>
      ) : (
        renderFieldGroup(visibleFields)
      )}
      <input
        type='submit'
        className={styles.il5}
      />
    </Box>
  );
}
