/**
 * 统一 FormSelect 组件
 * 封装 MUI Select，提供统一的样式和交互体验
 */
import React from 'react';
import type { FormControlProps } from '@mui/material';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
} from '@mui/material';

export interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  /** 字段名称 */
  name: string;
  /** 标签 */
  label: string;
  /** 值 */
  value?: string | number | string[];
  /** 选项列表 */
  options: FormSelectOption[];
  /** 值变化回调 */
  onChange?: (value: string | number | string[]) => void;
  /** 是否多选 */
  multiple?: boolean;
  /** 是否必填 */
  required?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 错误信息 */
  error?: string;
  /** 占位提示 */
  placeholder?: string;
  /** 是否使用紧凑尺寸 */
  compact?: boolean;
  /** 是否允许清空 */
  allowClear?: boolean;
  /** 自定义样式 */
  sx?: FormControlProps['sx'];
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  value,
  options,
  onChange,
  multiple = false,
  required = false,
  disabled = false,
  error,
  placeholder,
  compact = true,
  allowClear = false,
  sx,
}) => {
  const handleChange = (event: any) => {
    const value = event.target.value;
    onChange?.(value);
  };

  return (
    <FormControl
      fullWidth
      size={compact ? 'small' : 'medium'}
      required={required}
      disabled={disabled}
      error={!!error}
      sx={{
        '& .MuiFormHelperText-root': {
          marginTop: 0.5,
        },
        ...sx,
      }}
    >
      <InputLabel id={`${name}-label`}>{label}</InputLabel>
      <Select
        name={name}
        labelId={`${name}-label`}
        value={value ?? ''}
        label={label}
        onChange={handleChange}
        multiple={multiple}
        displayEmpty={!!placeholder}
        renderValue={(selected) => {
          if (!selected || (Array.isArray(selected) && selected.length === 0)) {
            return <Box sx={{ color: 'text.secondary' }}>{placeholder}</Box>;
          }
          if (multiple && Array.isArray(selected)) {
            return selected
              .map((v) => options.find((opt) => opt.value === v)?.label)
              .filter(Boolean)
              .join(', ');
          }
          return options.find((opt) => opt.value === selected)?.label;
        }}
      >
        {allowClear && !multiple && (
          <MenuItem
            value=''
            sx={{ color: 'text.secondary', fontStyle: 'italic' }}
          >
            {placeholder || '请选择'}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

export default FormSelect;
