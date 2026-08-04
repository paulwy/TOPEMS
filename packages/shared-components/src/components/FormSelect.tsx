import React from 'react';
import type { FormControlProps } from '@mui/material';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  useMediaQuery,
  useTheme,
} from '@mui/material';

export interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  name: string;
  label: string;
  value?: string | number | string[];
  options: FormSelectOption[];
  onChange?: (value: string | number | string[]) => void;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  compact?: boolean;
  allowClear?: boolean;
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
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleChange = (event: any) => {
    const value = event.target.value;
    onChange?.(value);
  };

  return (
    <FormControl
      fullWidth
      size={isMobile ? 'medium' : (compact ? 'small' : 'medium')}
      required={required}
      disabled={disabled}
      error={!!error}
      sx={{
        '& .MuiFormHelperText-root': {
          marginTop: 0.5,
          fontSize: isMobile ? '0.75rem' : undefined,
        },
        '& .MuiInputLabel-root': {
          fontSize: isMobile ? '0.875rem' : undefined,
        },
        '& .MuiSelect-select': {
          fontSize: isMobile ? '0.9375rem' : undefined,
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
            return <Box sx={{ color: 'text.secondary', fontSize: isMobile ? '0.9375rem' : undefined }}>{placeholder}</Box>;
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
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            sx={{ fontSize: isMobile ? '0.875rem' : undefined }}
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
