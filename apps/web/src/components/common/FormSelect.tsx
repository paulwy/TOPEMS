import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

export interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  name?: string;
  label?: string;
  options: FormSelectOption[];
  value?: string | number | string[] | number[];
  placeholder?: string;
  onChange?: (value: any) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  multiple?: boolean;
  id?: string;
  className?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  label,
  options,
  value,
  placeholder,
  onChange,
  disabled = false,
  error,
  required = false,
  multiple = false,
  id,
  className,
  fullWidth = true,
  size = 'medium',
}) => {
  const selectId = id || `form-select-${name || 'select'}`;
  const labelId = `${selectId}-label`;

  const hasValue = multiple
    ? Array.isArray(value) && value.length > 0
    : value !== undefined && value !== null && value !== '';

  const handleChange = (event: SelectChangeEvent<any>) => {
    const newValue = event.target.value;
    onChange?.(newValue);
  };

  const renderValue = () => {
    if (multiple && Array.isArray(value)) {
      return value
        .map((v) => options.find((opt) => opt.value === v)?.label ?? v)
        .join(', ');
    }
    if (!multiple && hasValue) {
      return options.find((opt) => opt.value === value)?.label ?? String(value);
    }
    return placeholder;
  };

  return (
    <FormControl
      className={className}
      fullWidth={fullWidth}
      error={!!error}
      required={required}
      disabled={disabled}
      size={size}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <Select
        id={selectId}
        labelId={labelId}
        name={name}
        value={multiple ? (value ?? []) : (value ?? '')}
        onChange={handleChange}
        multiple={multiple}
        label={label}
        input={<OutlinedInput label={label} />}
        displayEmpty={!!placeholder}
        renderValue={placeholder || multiple ? renderValue : undefined}
        aria-label={label}
      >
        {placeholder && !multiple && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error}</FormHelperText>}
    </FormControl>
  );
};

export default FormSelect;
