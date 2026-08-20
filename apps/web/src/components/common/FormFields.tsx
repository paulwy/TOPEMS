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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { zhCN } from '@mui/x-date-pickers/locales';
import { useResponsive } from '../../hooks/useResponsive';

function useTabletSize() {
  const { isTablet } = useResponsive();
  return isTablet;
}

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
  size?: 'small' | 'medium';
}

function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  type = 'text',
  multiline,
  rows,
  required,
  disabled,
  size = 'small',
}: FormTextFieldProps<T>) {
  const isTablet = useTabletSize();
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
          sx={{
            '& .MuiInputLabel-root': {
              fontSize: isTablet ? '0.8125rem' : undefined,
            },
            '& .MuiInputBase-input': {
              fontSize: isTablet ? '0.875rem' : undefined,
            },
          }}
        />
      )}
    />
  );
}

interface FormSelectFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ label: string; value: any }>;
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

function FormSelectField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  required,
  disabled,
  size = 'small',
}: FormSelectFieldProps<T>) {
  const isTablet = useTabletSize();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl
          fullWidth
          size={size}
          required={required}
          disabled={disabled}
          error={!!error}
          sx={{
            '& .MuiInputLabel-root': {
              fontSize: isTablet ? '0.8125rem' : undefined,
            },
            '& .MuiSelect-select': {
              fontSize: isTablet ? '0.875rem' : undefined,
            },
          }}
        >
          <InputLabel>{label}</InputLabel>
          <Select
            {...field}
            label={label}
          >
            {options.map((opt: { value: string | number; label: string }) => (
              <MenuItem
                key={String(opt.value)}
                value={opt.value}
              >
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

interface FormSwitchFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  disabled?: boolean;
}

function FormSwitchField<T extends FieldValues>({
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
          control={
            <Switch
              {...field}
              checked={field.value}
              disabled={disabled}
            />
          }
          label={label}
        />
      )}
    />
  );
}

interface FormDateFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  disabled?: boolean;
  format?: string;
  size?: 'small' | 'medium';
}

function FormDateField<T extends FieldValues>({
  name,
  control,
  label,
  required,
  disabled,
  format = 'YYYY-MM-DD',
  size = 'small',
}: FormDateFieldProps<T>) {
  const isTablet = useTabletSize();
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      localeText={zhCN.components.MuiLocalizationProvider.defaultProps.localeText}
    >
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
                sx: {
                  '& .MuiInputLabel-root': {
                    fontSize: isTablet ? '0.8125rem' : undefined,
                  },
                  '& .MuiInputBase-input': {
                    fontSize: isTablet ? '0.875rem' : undefined,
                  },
                },
              },
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}

interface FormRadioGroupProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: Array<{ label: string; value: any }>;
  row?: boolean;
  disabled?: boolean;
}

function FormRadioGroup<T extends FieldValues>({
  name,
  control,
  label,
  options,
  row = true,
  disabled,
}: FormRadioGroupProps<T>) {
  const isTablet = useTabletSize();
  return (
    <FormControl
      component='fieldset'
      disabled={disabled}
    >
      <FormLabel component='legend'>{label}</FormLabel>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            {...field}
            row={isTablet ? false : row}
          >
            {options.map((opt) => (
              <FormControlLabel
                key={opt.value}
                value={opt.value}
                control={<Radio />}
                label={opt.label}
                sx={{
                  '& .MuiTypography-root': {
                    fontSize: isTablet ? '0.875rem' : undefined,
                  },
                }}
              />
            ))}
          </RadioGroup>
        )}
      />
    </FormControl>
  );
}
