import React from 'react';
import type { TextFieldProps } from '@mui/material';
import { TextField, useMediaQuery, useTheme } from '@mui/material';

export interface FormFieldProps extends Omit<TextFieldProps, 'size'> {
  name: string;
  compact?: boolean;
  size?: 'small' | 'medium';
  variant?: TextFieldProps['variant'];
  type?: TextFieldProps['type'];
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  compact = true,
  size = 'small',
  sx,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <TextField
      name={name}
      label={label}
      size={isMobile ? 'medium' : (compact ? 'small' : size)}
      sx={{
        '& .MuiFormHelperText-root': {
          marginTop: 0.5,
          fontSize: isMobile ? '0.75rem' : undefined,
        },
        '& .MuiInputLabel-root': {
          fontSize: isMobile ? '0.875rem' : undefined,
        },
        '& .MuiInput-input': {
          fontSize: isMobile ? '0.9375rem' : undefined,
        },
        ...sx,
      }}
      {...props}
    />
  );
};

export default FormField;
