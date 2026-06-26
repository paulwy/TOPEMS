/**
 * 统一 FormField 组件
 * 封装 MUI TextField，提供统一的样式和交互体验
 */
import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export interface FormFieldProps extends Omit<TextFieldProps, 'size'> {
  /** 字段名称 */
  name: string;
  /** 是否使用紧凑尺寸 */
  compact?: boolean;
  /** 输入框尺寸 */
  size?: 'small' | 'medium';
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  compact = true,
  size = 'small',
  sx,
  ...props
}) => {
  return (
    <TextField
      name={name}
      label={label}
      size={compact ? 'small' : size}
      sx={{
        '& .MuiFormHelperText-root': {
          marginTop: 0.5,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default FormField;
